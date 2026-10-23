// MacBook-версия главной страницы, собираемая из CSS автоматически.
//
// Сайт выверен на мониторе шириной 1903px. На экранах 1280–1902px
// (MacBook Air/Pro и похожие ноутбуки) страница должна выглядеть точно так
// же, только пропорционально меньше. Плагин делает это при сборке:
//
// 1. Берёт каждое правило, которое действует на ширине 1903px (обычные
//    правила, Tailwind-классы, @media с min-width ≤ 1903 и т.д.), и добавляет
//    в конец копию внутри @media (min-width: 1280px) and (max-width: 1902px).
//    В копии пиксели заменены на «пиксели макета»: 34px → calc(34 * var(--u)).
//    rem тоже переводятся (1rem → 16 пикселей макета), поэтому любой блок
//    можно уменьшить или увеличить отдельно, переопределив у него --u
//    (см. globals.css). --u-page — общий масштаб страницы.
//    Тонкие линии (≤ 1px) не трогаются. vw внутри clamp() (шрифты, ширины
//    карточек) тоже переводятся в пиксели макета, чтобы расти вместе со всем.
//    Чистое уменьшение (--u = ширина/1903) на ноутбуке выходило мелковато,
//    поэтому --u крупнее: +14% на 1440px, к 1903px добавка сходит на нет.
// 2. Правила для узкого ноутбука, у которых max-width попадает в 1280–1902
//    (например, 1024–1599), начинают действовать только до 1279px, чтобы
//    не спорить с копией.
// 3. Корневой шрифт = 16 × --u, поэтому размеры в rem тоже
//    уменьшаются пропорционально.
//
// Копии действуют только на главной (<main class="site-page">), админка не
// меняется. Исходные стили править как обычно — копия пересобирается сама.

const DESIGN_WIDTH = 1903;
const RANGE_MIN = 1280;
const RANGE_MAX = DESIGN_WIDTH - 1;
const RANGE = `(min-width: ${RANGE_MIN}px) and (max-width: ${RANGE_MAX}px)`;
const SCOPE = ':where(:has(.site-page))';

// Насколько крупнее чистого уменьшения на экране BOOST_WIDTH. --u растёт
// линейно от ширины и на DESIGN_WIDTH равен ровно 1px.
const BOOST = 1.14;
const BOOST_WIDTH = 1440;
const SLOPE = ((1 - (BOOST_WIDTH / DESIGN_WIDTH) * BOOST) / (DESIGN_WIDTH - BOOST_WIDTH)).toFixed(7);
const UNIT = `calc(1px - (${DESIGN_WIDTH}px - 100vw) * ${SLOPE})`;

// Разбирает условия @media. Возвращает null, если условие слишком сложное
// (списки через запятую, not/only, print) — такие правила не трогаем.
function parseMedia(params) {
  if (/,|\bnot\b|\bonly\b|\bprint\b/.test(params)) return null;
  const parts = params.split(/\s+and\s+/).map((part) => part.trim()).filter(Boolean);
  const media = { min: [], max: [], other: [] };
  for (const part of parts) {
    const width = part.match(/^\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)$/);
    if (width) {
      media[width[1]].push(Number(width[2]));
    } else if (part === 'screen' || part === 'all') {
      continue;
    } else {
      media.other.push(part);
    }
  }
  return media;
}

function mediaChain(rule) {
  const chain = [];
  for (let node = rule.parent; node && node.type !== 'root'; node = node.parent) {
    if (node.type !== 'atrule' || node.name !== 'media') return null;
    const media = parseMedia(node.params);
    if (!media) return null;
    chain.push(media);
  }
  return chain;
}

function appliesAtDesignWidth(chain) {
  return chain.every(
    (media) => media.min.every((v) => v <= DESIGN_WIDTH) && media.max.every((v) => v >= DESIGN_WIDTH),
  );
}

function scalePx(value) {
  if (/url\(|["']/.test(value)) return value;
  return value
    .replace(/(^|[^\w.#-])(-?\d*\.?\d+)px\b/g, (match, before, number) =>
      Math.abs(Number(number)) <= 1 ? match : `${before}calc(${number} * var(--u))`,
    )
    .replace(/(^|[^\w.#-])(-?\d*\.?\d+)rem\b/g, (match, before, number) =>
      `${before}calc(${Number((Number(number) * 16).toFixed(3))} * var(--u))`,
    );
}

// vw внутри clamp() — размер «в долях макета» (на 1903px 1vw = 19.03px).
// Остальные vw (calc(100vw - 32px), min(82vw, …)) — подгонка под экран,
// их оставляем как есть, иначе блоки вылезут за край.
function scaleClampVw(value) {
  let result = '';
  let index = 0;
  while (index < value.length) {
    const start = value.indexOf('clamp(', index);
    if (start === -1) {
      result += value.slice(index);
      break;
    }
    let depth = 0;
    let end = start + 5;
    for (; end < value.length; end += 1) {
      if (value[end] === '(') depth += 1;
      if (value[end] === ')' && --depth === 0) break;
    }
    const inner = value
      .slice(start, end + 1)
      .replace(/(^|[^\w.#-])(-?\d*\.?\d+)vw\b/g, (match, before, number) =>
        `${before}calc(${(Number(number) * DESIGN_WIDTH / 100).toFixed(2)} * var(--u))`,
      );
    result += value.slice(index, start) + inner;
    index = end + 1;
  }
  return result;
}

// Ограничивает селектор главной страницей. :where не меняет специфичность,
// поэтому копии перекрывают друг друга в том же порядке, что и оригиналы.
function scopeSelector(selector) {
  if (selector.includes('::view-transition')) return null;
  const lead = selector.match(/^(html|:root)((?:\[[^\]]*\]|:not\([^)]*\)|\.[\w-]+)*)/);
  if (lead) return lead[0] + SCOPE + selector.slice(lead[0].length);
  return `:where(html:has(.site-page)) ${selector}`;
}

// Правила только из тегов и атрибутов (сброс стилей Tailwind, html, body,
// input[type]…) копировать незачем: размеров в макете они не задают.
function isElementOnly(selectors) {
  return selectors.every((selector) => !/[.#]/.test(selector) && !/^(html|:root)\[/.test(selector));
}

// В копию идут только свойства, от которых зависят размеры и положение:
// цвета, display и прочее и так одинаковы, а копировать их — лишний вес.
// Свойства размеров копируются с любым значением (0, auto, %), иначе
// исходное «margin: 0» ниже по файлу проиграло бы скопированному «14px».
const LENGTH_PROPS = new Set([
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'top', 'right', 'bottom', 'left', 'inset',
  'gap', 'row-gap', 'column-gap', 'flex', 'flex-basis',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-columns', 'grid-auto-rows',
  'font-size', 'line-height', 'letter-spacing',
  'transform', 'translate', 'scale',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
]);

function isSizeDecl(decl) {
  return LENGTH_PROPS.has(decl.prop) || decl.prop.startsWith('--') || /\dpx\b/.test(decl.value);
}

module.exports = () => ({
  postcssPlugin: 'macbook-scale',
  Once(root, { postcss }) {
    const runs = [];

    root.walkRules((rule) => {
      const chain = mediaChain(rule);
      if (!chain || !appliesAtDesignWidth(chain) || isElementOnly(rule.selectors)) return;

      const selectors = rule.selectors.map(scopeSelector).filter(Boolean);
      if (selectors.length === 0) return;

      const copy = rule.clone({ selectors });
      copy.walkDecls((decl) => {
        if (isSizeDecl(decl)) {
          decl.value = scaleClampVw(scalePx(decl.value));
        } else {
          decl.remove();
        }
      });
      copy.walkComments((comment) => comment.remove());
      if (!copy.nodes.length) return;

      const other = chain.flatMap((media) => media.other).join(' and ');
      const last = runs[runs.length - 1];
      if (last && last.other === other) {
        last.rules.push(copy);
      } else {
        runs.push({ other, rules: [copy] });
      }
    });

    // Узкие ноутбучные диапазоны (например, 1024–1599) теперь заканчиваются
    // на 1279px: выше действует копия макета 1903px.
    // Правила, написанные в globals.css прямо под этот диапазон
    // (@media (min-width: 1280px) and (max-width: 1902px)), не трогаем.
    root.walkAtRules('media', (atRule) => {
      const media = parseMedia(atRule.params);
      if (!media || (media.min.includes(RANGE_MIN) && media.max.includes(RANGE_MAX))) return;
      const cut = media.max.some((v) => v >= RANGE_MIN && v < DESIGN_WIDTH);
      if (cut) {
        atRule.params = atRule.params.replace(
          /\(max-width:\s*(\d+(?:\.\d+)?)px\)/g,
          (match, value) => (Number(value) >= RANGE_MIN && Number(value) < DESIGN_WIDTH ? `(max-width: ${RANGE_MIN - 1}px)` : match),
        );
      }
    });

    const base = postcss.atRule({ name: 'media', params: RANGE });
    base.append(
      postcss.rule({
        selector: 'html:has(.site-page)',
        nodes: [
          postcss.decl({ prop: '--u-page', value: UNIT }),
          postcss.decl({ prop: '--u', value: 'var(--u-page)' }),
          postcss.decl({ prop: 'font-size', value: 'calc(16 * var(--u))' }),
        ],
      }),
    );
    root.append(base);

    for (const run of runs) {
      const atRule = postcss.atRule({ name: 'media', params: run.other ? `${RANGE} and ${run.other}` : RANGE });
      atRule.append(run.rules);
      root.append(atRule);
    }
  },
});

module.exports.postcss = true;
