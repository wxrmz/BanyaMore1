#!/usr/bin/env bash
# Установка и обновление сайта «Баня Море» на чистом Ubuntu 22.04/24.04 (например, Timeweb Cloud).
#
# Использование (от root, из распакованной папки проекта):
#   bash server-setup.sh xn--80abn1aeho1j.xn--p1ai you@example.com
#
# Перед запуском положите рядом с этим скриптом файл .env.local с ключами YCLIENTS и паролями админки.
# Повторный запуск с новой версией архива обновляет сайт; data/ и .env.local на сервере сохраняются.
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
APP_USER="banyamore"
APP_DIR="/opt/banyamore"
PORT="3000"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

log() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mОшибка: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "запустите скрипт от root (sudo bash server-setup.sh ...)"
[ -n "$DOMAIN" ] || die "укажите домен: bash server-setup.sh xn--80abn1aeho1j.xn--p1ai you@example.com"
[ -f "$SRC_DIR/package.json" ] || die "запускайте скрипт из распакованной папки проекта"
if [ ! -f "$SRC_DIR/.env.local" ] && [ ! -f "$APP_DIR/.env.local" ]; then
  die "нет файла .env.local. Загрузите его в $SRC_DIR (образец — .env.example)"
fi

log "Устанавливаю системные пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg rsync nginx certbot python3-certbot-nginx ufw

NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$NODE_MAJOR" -ge 22 ] && NEED_NODE=0
fi
if [ "$NEED_NODE" -eq 1 ]; then
  log "Устанавливаю Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node --version

log "Готовлю пользователя и папку $APP_DIR"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR"
rsync -a --delete \
  --exclude '.env.local' --exclude 'data/' --exclude 'node_modules/' \
  --exclude 'server-setup.sh.log' \
  "$SRC_DIR/" "$APP_DIR/"
mkdir -p "$APP_DIR/data"
# Первый запуск: переносим стартовые данные, существующие не трогаем.
[ -f "$APP_DIR/data/calendar-note.json" ] || cp -n "$SRC_DIR/data/calendar-note.json" "$APP_DIR/data/" 2>/dev/null || true
if [ -f "$SRC_DIR/.env.local" ]; then
  cp "$SRC_DIR/.env.local" "$APP_DIR/.env.local"
fi

ENV_FILE="$APP_DIR/.env.local"
# Windows-переводы строк ломают значения переменных.
sed -i 's/\r$//' "$ENV_FILE"
if grep -q '^ADMIN_PUBLIC_ORIGIN=' "$ENV_FILE"; then
  sed -i "s|^ADMIN_PUBLIC_ORIGIN=.*|ADMIN_PUBLIC_ORIGIN=https://$DOMAIN|" "$ENV_FILE"
else
  printf '\nADMIN_PUBLIC_ORIGIN=https://%s\n' "$DOMAIN" >> "$ENV_FILE"
fi
set_site_https() {
  # Пока сертификата нет, сайт отдаётся как обычный HTTP-сайт: без принудительного
  # перехода на https и без HSTS, иначе страница откроется без стилей.
  if grep -q '^SITE_HTTPS=' "$ENV_FILE"; then
    sed -i "s|^SITE_HTTPS=.*|SITE_HTTPS=$1|" "$ENV_FILE"
  else
    printf 'SITE_HTTPS=%s\n' "$1" >> "$ENV_FILE"
  fi
}

has_certificate() {
  [ -d "/etc/letsencrypt/live/$DOMAIN" ]
}

if has_certificate; then set_site_https on; else set_site_https off; fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 600 "$ENV_FILE"

build_site() {
  sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && npm ci --no-audit --no-fund && npm run build"
}

log "Устанавливаю зависимости и собираю сайт (несколько минут)"
build_site

log "Настраиваю автозапуск (systemd)"
cat > /etc/systemd/system/banyamore.service <<UNIT
[Unit]
Description=Banya More website (Next.js)
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=TZ=Asia/Vladivostok
ExecStart=$(command -v node) $APP_DIR/node_modules/next/dist/bin/next start -H 127.0.0.1 -p $PORT
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable banyamore
systemctl restart banyamore

log "Настраиваю Nginx"
cat > /etc/nginx/conf.d/banyamore-limits.conf <<'NGX'
limit_req_zone $binary_remote_addr zone=banyamore_login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=banyamore_calendar:10m rate=30r/m;
NGX
if [ ! -f /etc/nginx/sites-available/banyamore ] || ! grep -q 'managed by Certbot' /etc/nginx/sites-available/banyamore; then
  cat > /etc/nginx/sites-available/banyamore <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 1m;
    server_tokens off;

    # Не добавляйте proxy_set_header внутрь location: иначе эти строки не наследуются.
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$remote_addr;
    proxy_set_header X-Forwarded-Proto \$scheme;

    location = /api/admin/login {
        limit_req zone=banyamore_login burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:$PORT;
    }

    location = /api/yclients/availability {
        limit_req zone=banyamore_calendar burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:$PORT;
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
    }
}
NGX
fi
ln -sf /etc/nginx/sites-available/banyamore /etc/nginx/sites-enabled/banyamore
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

log "Настраиваю firewall (открыты только SSH, 80, 443)"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

log "Проверяю, что сайт отвечает"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/calendar-note" >/dev/null 2>&1; then OK=1; break; fi
  sleep 2
done
[ "${OK:-0}" = 1 ] || die "приложение не запустилось. Смотрите лог: journalctl -u banyamore -n 100"

SERVER_IP="$(curl -fsS -4 https://ifconfig.me 2>/dev/null || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"
if grep -q 'managed by Certbot' /etc/nginx/sites-available/banyamore; then
  log "HTTPS уже настроен"
elif [ -n "$SERVER_IP" ] && [ "$SERVER_IP" = "$DNS_IP" ]; then
  log "Выпускаю HTTPS-сертификат"
  if [ -n "$EMAIL" ]; then
    certbot --nginx -d "$DOMAIN" --redirect --agree-tos -m "$EMAIL" --non-interactive
  else
    certbot --nginx -d "$DOMAIN" --redirect --agree-tos --register-unsafely-without-email --non-interactive
  fi
  if has_certificate && grep -q '^SITE_HTTPS=off' "$ENV_FILE"; then
    log "Включаю строгие настройки HTTPS и пересобираю сайт"
    set_site_https on
    chown "$APP_USER:$APP_USER" "$ENV_FILE"
    build_site
    systemctl restart banyamore
  fi
else
  printf '\n\033[1;31mDNS домена %s пока указывает на "%s", а IP сервера "%s".\033[0m\n' "$DOMAIN" "${DNS_IP:-нет записи}" "${SERVER_IP:-?}"
  printf 'Создайте A-запись на IP сервера, подождите обновления DNS и запустите скрипт ещё раз — он выпустит сертификат.\n'
  printf 'Сайт уже работает по http://%s — без замочка в браузере, но со стилями и фотографиями.\n' "${DNS_IP:-$SERVER_IP}"
  printf 'Вход в админку заработает после выпуска сертификата.\n'
  exit 0
fi

log "Готово: https://$DOMAIN  (админка: https://$DOMAIN/admin/calendar-note)"
echo "Логи: journalctl -u banyamore -f    Перезапуск: systemctl restart banyamore"
