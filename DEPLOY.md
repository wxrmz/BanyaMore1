# Развёртывание на сервере

1. Распакуйте `banyamore-server.zip` в отдельную папку на сервере.
2. Проверьте Node.js версии 20.9 или новее (`node --version`).
3. Создайте в этой папке `.env.local` по образцу `.env.example` и заполните ключи YCLIENTS, учётные записи админки и `ADMIN_SESSION_SECRET`. В production используйте случайный секрет не короче 32 символов и пароли админов не короче 12 символов.
4. Выполните из папки проекта:

   ```sh
   npm ci
   npm run build
   npm run start
   ```

5. Запускайте приложение с рабочей директорией проекта. Папка `data/` должна быть доступна процессу для записи: текст под календарём хранится в `data/calendar-note.json`.
6. Поставьте приложение за HTTPS reverse proxy и ограничьте доступ к порту Node.js firewall-ом. HSTS включён в ответах приложения и рассчитан на HTTPS.
7. Не добавляйте `.env.local` в репозиторий и не публикуйте его содержимое. После обновлений проверяйте зависимости командой `npm audit --omit=dev`; сообщения уровня high/critical нужно закрыть обновлением зависимостей до публикации.
8. Если запускаете несколько экземпляров приложения, добавьте общий rate limit для `/api/admin/login` на reverse proxy: встроенный лимитер хранит состояние в памяти одного процесса.

## Привязка домена `xn--80abn1aeho1j.xn--p1ai`

Параметры из рекламной ссылки (`utm_*`, `yclid`) к DNS не относятся. Для привязки используется только имя домена: `xn--80abn1aeho1j.xn--p1ai`.

1. В панели регистратора домена создайте DNS-запись `A` для корня домена (`@`) на публичный IPv4-адрес сервера. Если у сервера настроен IPv6, добавьте `AAAA`; не добавляйте нерабочий IPv6, иначе часть посетителей будет получать ошибку.
2. Дождитесь обновления DNS и проверьте запись командами `nslookup xn--80abn1aeho1j.xn--p1ai` или `dig +short xn--80abn1aeho1j.xn--p1ai`.
3. Запустите приложение на самом сервере только на локальном порту, например `127.0.0.1:3000`:

   ```sh
   npm run start -- -H 127.0.0.1 -p 3000
   ```

4. Установите Nginx и Certbot:

   ```sh
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

   Создайте сайт `/etc/nginx/sites-available/banyamore`:

   ```nginx
   server {
       listen 80;
       server_name xn--80abn1aeho1j.xn--p1ai;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

   Включите конфигурацию (`sudo ln -s /etc/nginx/sites-available/banyamore /etc/nginx/sites-enabled/banyamore`), проверьте её (`sudo nginx -t`) и перезагрузите Nginx (`sudo systemctl reload nginx`). Для постоянного запуска Node-процесса используйте systemd или PM2 с рабочей директорией проекта.
5. Выпустите HTTPS-сертификат и включите перенаправление HTTP → HTTPS:

   ```sh
   sudo certbot --nginx -d xn--80abn1aeho1j.xn--p1ai
   ```

6. В серверном `.env.local` укажите публичный origin без завершающего `/`:

   ```dotenv
   ADMIN_PUBLIC_ORIGIN=https://xn--80abn1aeho1j.xn--p1ai
   ```

   После изменения переменной перезапустите приложение. Это нужно для проверки источника запросов админки за reverse proxy.
7. Откройте firewall только для TCP-портов `80` и `443`. Порт `3000` наружу не открывайте: приложение должно быть доступно через Nginx.
8. Проверьте результат:

   ```sh
   curl -I https://xn--80abn1aeho1j.xn--p1ai/
   curl -s https://xn--80abn1aeho1j.xn--p1ai/api/calendar-note
   ```

   В первом ответе должен быть статус `200` или `301` от HTTPS, а во втором — JSON с `ok: true`.

В архив не входят локальные зависимости, кэш сборки, `.git`, журналы и `.env.local`. Настройки сервера и секреты задаются на сервере отдельно.
