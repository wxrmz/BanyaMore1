import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_REPORT_MASK_SAFETY_MS,
  getAdminReportDeadlineDelays,
  isAdminReportRangeWithinLimit,
  isValidIsoDate,
  MAX_ADMIN_REPORT_RANGE_DAYS,
  reportRangeDays,
} from './adminDateRange.ts';
import { isSameOriginRequest } from './adminRequestOrigin.ts';
import { getAdminAccess, getAdminRoleLabel } from './adminRoles.ts';
import { stripToCopyTexts } from './adminDashboardAccess.ts';
import { buildBaths, buildCopyText, buildSalesReports, calculateDailyReport, sourceUpdatedAt } from './yclientsReports.ts';
import { buildFreeWindowsFromAvailability } from './availabilityCopyText.ts';

test('admin and owner roles have explicit least-privilege access', () => {
  assert.deepEqual(getAdminAccess('admin'), {
    fullReports: false,
    periodReports: false,
    copyTextsOnly: false,
  });
  assert.deepEqual(getAdminAccess('owner'), {
    fullReports: true,
    periodReports: true,
    copyTextsOnly: false,
  });
  assert.equal(getAdminRoleLabel('admin'), 'Администратор');
  assert.equal(getAdminRoleLabel('owner'), 'Владелец');
});

test('copy-texts account sees only the occupancy texts', () => {
  assert.deepEqual(getAdminAccess('copy'), {
    fullReports: false,
    periodReports: false,
    copyTextsOnly: true,
  });
  assert.equal(getAdminRoleLabel('copy'), 'Тексты занятости');

  const safe = stripToCopyTexts({
    ok: true,
    date: '2026-09-19',
    range: { from: '2026-09-19', to: '2026-09-19' },
    report: { income: 100_000 },
    recordsAvailable: true,
    baths: [{ id: 'small', title: 'Малая баня', revenue: 50_000, records: [{ id: 41 }] }],
    kitchen: { sold: [{ id: 1 }], consumables: [] },
    additionalServices: [{ id: 2 }],
    goods: [{ id: 3 }],
    beer: [{ id: 4 }],
    drinks: [{ id: 5 }],
    stocks: [{ id: 'stock-1', stock: 7 }],
    dataHealth: { state: 'complete', sources: [], issues: [] },
    copyText: { freeWindows: 'Свободно', occupiedTimes: '12:00', occupiedBaths: 'Малая баня' },
    generatedAt: '2026-09-19T02:00:00.000Z',
  });

  assert.deepEqual(Object.keys(safe).sort(), ['copyText', 'date', 'generatedAt', 'ok', 'range']);
  assert.deepEqual(safe.copyText, { freeWindows: 'Свободно', occupiedTimes: '12:00', occupiedBaths: 'Малая баня' });
});

test('partial records and stock sources never claim a fresh successful timestamp', () => {
  const generatedAt = '2026-09-15T02:00:00.000Z';
  assert.equal(sourceUpdatedAt('partial', generatedAt), '');
  assert.equal(sourceUpdatedAt('complete', generatedAt), generatedAt);
});

test('daily report follows the TZ formulas and adds KPP discounts to the KPP expense article', () => {
  const report = calculateDailyReport({
    date: '2026-08-24',
    kppCompensation: 400,
    kppCheckAmounts: [200, 200],
    transactions: [
      { id: 1, amount: 10_000, account: { title: 'Наличные' }, expense: { title: 'Оказание услуг', type: 7 } },
      { id: 2, amount: 2_000, account: { title: 'Предоплата наличными' }, expense: { title: 'Оказание услуг', type: 7 } },
      { id: 3, amount: 3_000, account: { title: 'Безналичная оплата' }, expense: { title: 'Оказание услуг', type: 7 } },
      { id: 4, amount: 4_000, account: { title: 'Безналичная оплата терминал' }, expense: { title: 'Оказание услуг', type: 7 } },
      { id: 5, amount: -500, account: { title: 'Наличные' }, expense: { title: 'Закупка продуктов', type: 2 } },
      { id: 6, amount: 200, account: { title: 'Наличные' }, expense: { title: 'Чеки КПП', type: 2 } },
      { id: 7, amount: 999, deleted: true, account: { title: 'Наличные' }, expense: { title: 'Удалено', type: 7 } },
    ],
  });

  assert.equal(report.income, 19_400);
  assert.equal(report.expense, 1_100);
  assert.equal(report.prepayments, 2_000);
  assert.equal(report.cashless, 7_000);
  assert.equal(report.terminal, 4_000);
  assert.equal(report.surrendered, 9_300);
  assert.deepEqual(report.expenses, [
    { id: 'expense:kpp', title: 'Чеки КПП', amount: 600, comments: [], transactionIds: [6] },
    { id: 'expense:unknown', title: 'Закупка продуктов', amount: 500, comments: [], transactionIds: [5] },
  ]);
  assert.deepEqual(report.checks, [{ denomination: 200, quantity: 2, total: 400 }]);
  assert.equal(report.unclassifiedChecks, 200);
});

test('card prepayment is a prepayment and is not counted as cashless payment', () => {
  const report = calculateDailyReport({
    date: '2026-08-24',
    kppCompensation: 0,
    transactions: [
      { id: 1, amount: 1_000, account: { title: 'Предоплата перевод на карту' }, expense: { title: 'Оказание услуг', type: 7 } },
    ],
  });

  assert.equal(report.income, 1_000);
  assert.equal(report.prepayments, 1_000);
  assert.equal(report.cashless, 0);
  assert.equal(report.surrendered, 0);
});

test('daily expenses aggregate by stable article id rather than mutable title', () => {
  const report = calculateDailyReport({
    date: '2026-09-14',
    kppCompensation: 0,
    transactions: [
      { id: 1, amount: -100, expense: { id: 77, title: 'Материалы', type: 2 } },
      { id: 2, amount: -200, expense: { id: 77, title: 'Материалы (новое имя)', type: 2 } },
      { id: 3, amount: -300, expense: { id: 88, title: 'Материалы', type: 2 } },
    ],
  });

  assert.deepEqual(report.expenses, [
    { id: 'expense:77', title: 'Материалы', amount: 300, comments: [], transactionIds: [1, 2] },
    { id: 'expense:88', title: 'Материалы', amount: 300, comments: [], transactionIds: [3] },
  ]);
});

test('KPP compensation linked to an existing expense is counted only once', () => {
  const report = calculateDailyReport({
    date: '2026-09-14',
    kppCompensation: 200,
    kppCheckAmounts: [200],
    kppByRecord: new Map([[77, 200]]),
    transactions: [
      {
        id: 10,
        record_id: 77,
        amount: -200,
        account: { title: 'Наличные', is_cash: true },
        expense: { title: 'Чеки КПП', type: 2 },
      },
    ],
  });

  assert.equal(report.expense, 200);
  assert.equal(report.expenses[0].amount, 200);
  assert.equal(report.income, 200);
  assert.equal(report.surrendered, 0);
});

test('copy blocks are chronological and preserve separate overlapping records', () => {
  const records = [
    { id: 1, staff_id: 3872281, datetime: '2026-08-24T10:00:00+10:00', seance_length: 9_000, technical_break_duration: 1_800 },
    { id: 2, staff_id: 3873893, datetime: '2026-08-24T12:30:00+10:00', seance_length: 9_000, technical_break_duration: 1_800 },
    { id: 3, staff_id: 3872281, datetime: '2026-08-24T14:00:00+10:00', seance_length: 9_000, technical_break_duration: 1_800 },
    { id: 4, staff_id: 3873916, datetime: '2026-08-24T14:00:00+10:00', seance_length: 7_200, technical_break_duration: 0 },
  ];
  const text = buildCopyText(records);

  assert.equal(text.occupiedTimes, '10:00 - 12:00\n12:30 - 14:30\n14:00 - 16:00\n14:00 - 16:00');
  assert.equal(text.occupiedBaths, 'Малая баня\nс 10:00 до 12:00\nс 14:00 до 16:00\n\nБольшая баня 1\nс 12:30 до 14:30\n\nБольшая баня 2\nс 14:00 до 16:00');
  assert.match(text.freeWindows, /Малая баня\nс 00:00 до 09:30\nс 12:30 до 13:30\nс 16:30/);
  assert.match(text.freeWindows, /Большая баня 1\nс 00:00 до 12:00\nс 15:00/);
  assert.match(text.freeWindows, /Большая баня 2\nс 00:00 до 13:30\nс 16:00/);
});

test('no-show records free up the bath in the copy texts', () => {
  const text = buildCopyText([
    // Малая баня: гость не пришёл, значит время свободно.
    { id: 1, staff_id: 3872281, datetime: '2026-09-19T13:00:00+10:00', seance_length: 7_200, technical_break_duration: 1_800, attendance: -1 },
    { id: 2, staff_id: 3872281, datetime: '2026-09-19T18:00:00+10:00', seance_length: 7_200, technical_break_duration: 1_800 },
  ]);

  assert.equal(text.occupiedTimes, '18:00 - 19:30');
  assert.match(text.freeWindows, /Малая баня\nс 00:00 до 17:30\nс 20:00/);
  assert.match(text.occupiedBaths, /Малая баня\nс 18:00 до 19:30/);
});

test('empty occupied schedules produce explicit copyable text', () => {
  const text = buildCopyText([]);
  assert.equal(text.occupiedTimes, 'Записей нет');
  assert.equal(text.occupiedBaths, 'Малая баня\nЗаписей нет\n\nБольшая баня 1\nЗаписей нет\n\nБольшая баня 2\nЗаписей нет');
});

test('historical free-window copy starts after yesterday’s last overnight bath', () => {
  const text = buildCopyText([], [
    { staff_id: 3872281, datetime: '2026-09-16T21:00:00+10:00', seance_length: 7_200, technical_break_duration: 0 },
    { staff_id: 3872281, datetime: '2026-09-16T23:00:00+10:00', seance_length: 9_000, technical_break_duration: 1_800 },
    { staff_id: 3873893, datetime: '2026-09-16T19:00:00+10:00', seance_length: 7_200, technical_break_duration: 0 },
  ]);
  assert.equal(text.freeWindows,
    'Малая баня\nс 01:30\n\nБольшая баня 1\nс 00:00\n\nБольшая баня 2\nс 00:00');
});

test('sales reports include planned consumables for active dishes and classify all non-bath services', () => {
  const goods = [
    { good_id: 11, title: 'Картофель', category: 'Расходники', unit_short_title: 'г', service_unit_short_title: 'г', unit_equals: 1, actual_amounts: [{ storage_id: 1, amount: 5_000 }] },
    { good_id: 12, title: 'Перец', category: 'Расходники', unit_short_title: 'г', service_unit_short_title: 'г', unit_equals: 1, actual_amounts: [{ storage_id: 1, amount: 100 }] },
    { good_id: 21, title: 'Лимонад', category: 'Напитки', unit_short_title: 'шт.', actual_amounts: [{ storage_id: 1, amount: 10 }] },
    { good_id: 22, title: 'Пиво', category: 'Пиво', unit_short_title: 'шт.', actual_amounts: [{ storage_id: 1, amount: 8 }] },
    { good_id: 23, title: 'Уголь', category: 'Сопутствующие товары', unit_short_title: 'шт.', actual_amounts: [{ storage_id: 1, amount: 6 }] },
  ];
  const catalog = {
    services: [],
    serviceCategoryTitles: new Map(),
    serviceCategoryByService: new Map([[1, 'Кухня'], [2, 'Дополнительные услуги'], [3, 'Бани']]),
    goods,
    goodsById: new Map(goods.map((good) => [good.good_id, good])),
    storages: [],
    issues: [],
  };
  const reports = buildSalesReports([{
    id: 1,
    services: [
      { id: 1, title: 'Картофель', amount: 2, cost: 700, cost_per_unit: 350 },
      { id: 2, title: 'Мангал', amount: 1, cost: 500, cost_per_unit: 500 },
      { id: 3, title: 'Аренда бани', amount: 1, cost: 8_000, cost_per_unit: 8_000 },
    ],
    consumables: [
      { id: 1, service_id: 1, good_id: 11, amount: -1_500, storage_id: 1, deleted: true },
      { id: 3, service_id: 1, good_id: 12, amount: 0, storage_id: 1, deleted: true },
      { id: 2, service_id: 999, good_id: 11, amount: -9_999, storage_id: 1, deleted: true },
    ],
    goods_transactions: [
      { id: 1, good_id: 21, amount: 2, price: 150, cost: 300, storage_id: 1 },
      { id: 2, good_id: 22, amount: 1, price: 250, cost: 250, storage_id: 1 },
      { id: 3, good_id: 23, amount: 1, price: 400, cost: 400, storage_id: 1 },
    ],
  }], catalog);

  assert.deepEqual(reports.kitchen.sold.map((row) => row.title), ['Картофель']);
  assert.deepEqual(reports.additionalServices.map((row) => row.title), ['Мангал']);
  assert.deepEqual(reports.kitchen.consumables.map((row) => ({ title: row.title, used: row.used, stock: row.stock })), [
    { title: 'Картофель', used: 1_500, stock: 5_000 },
  ]);
  assert.deepEqual(reports.drinks.map((row) => row.title), ['Лимонад']);
  assert.deepEqual(reports.beer.map((row) => row.title), ['Пиво']);
  assert.deepEqual(reports.goods.map((row) => row.title), ['Уголь']);
  assert.equal(reports.kitchen.standaloneOrders.length, 1);
  assert.deepEqual(reports.kitchen.standaloneOrders[0].items.map((item) => item.title), ['Картофель']);
  assert.deepEqual(reports.dataIssues, []);
});

test('bath revenue and kitchen revenue use actual linked money operations, not order list prices', () => {
  const baths = buildBaths([{
    id: 77,
    staff_id: 3872281,
    datetime: '2026-09-10T16:00:00+10:00',
    seance_length: 7_200,
    services: [
      { id: 20671398, title: 'Малая баня 2 часа', amount: 1, cost: 5_000 },
      { id: 20413518, title: 'Плов', amount: 1, cost: 700 },
    ],
    finance_transactions: [
      { id: 1, record_id: 77, amount: 4_500, expense: { id: 5 }, sold_item_type: 'service', sold_item_id: 20671398, account: { title: 'Наличные', is_cash: true } },
      { id: 2, record_id: 77, amount: 650, expense: { id: 5 }, sold_item_type: 'service', sold_item_id: 20413518, account: { title: 'Безналичная оплата', is_cash: false } },
    ],
  }], '2026-09-10', {
    services: [],
    serviceCategoryTitles: new Map(),
    serviceCategoryByService: new Map([[20671398, 'Бани'], [20413518, 'Кухня']]),
    goods: [],
    goodsById: new Map(),
    storages: [],
    issues: [],
  }, new Map());

  assert.equal(baths[0].revenue, 4_500);
  assert.equal(baths[0].kitchenRevenue, 650);
  assert.equal(baths[0].records[0].total, 5_700);
  assert.equal(baths[0].records[0].paidAmount, 5_150);
});

test('KPP is shown separately and is not added to the already reduced discount twice', () => {
  const baths = buildBaths([{
    id: 1,
    staff_id: 3872281,
    datetime: '2026-09-10T16:00:00+10:00',
    seance_length: 9_000,
    technical_break_duration: 1_800,
    services: [{ id: 3, title: 'Аренда 2ч', amount: 1, cost: 4_600, cost_per_unit: 5_000 }],
  }], '2026-09-10', {
    services: [],
    serviceCategoryTitles: new Map(),
    serviceCategoryByService: new Map([[3, 'Бани']]),
    goods: [],
    goodsById: new Map(),
    storages: [],
    issues: [],
  }, new Map([[1, 400]]));

  assert.equal(baths[0].kppChecks, 400);
  assert.equal(baths[0].discounts, 400);
  assert.equal(baths[0].records[0].discountTotal, 400);
});

test('sales formulas use actual YCLIENTS revenue and preserve a fully discounted item', () => {
  const goods = [{ good_id: 21, title: 'Лимонад', category: 'Напитки', unit_short_title: 'шт.', actual_amounts: [{ storage_id: 1, amount: 10 }] }];
  const reports = buildSalesReports([{
    id: 1,
    services: [],
    consumables: [],
    goods_transactions: [
      { id: 1, good_id: 21, amount: -2, price: 150, cost_to_pay: 150, storage_id: 1 },
      { id: 2, good_id: 21, amount: -1, price: 150, cost_to_pay: 0, storage_id: 1 },
    ],
  }], {
    services: [],
    serviceCategoryTitles: new Map(),
    serviceCategoryByService: new Map(),
    goods,
    goodsById: new Map([[21, goods[0]]]),
    storages: [],
    issues: [],
  });

  assert.equal(reports.drinks[0].quantity, 3);
  assert.equal(reports.drinks[0].revenue, 150);
  assert.equal(reports.drinks[0].unitPrice, 50);
  assert.equal(reports.drinks[0].unitPrice * reports.drinks[0].quantity, reports.drinks[0].revenue);
});

test('goods use YCLIENTS parent and direct category titles for beer and drink classification', () => {
  const goods = [
    { good_id: 31, title: 'Лимонад', category_parent_title: 'Напитки', category_title: 'Газировка' },
    { good_id: 32, title: 'Лагер', category_title: 'Пиво' },
  ];
  const reports = buildSalesReports([{
    id: 1,
    goods_transactions: [
      { id: 1, good_id: 31, amount: 1, cost: 150 },
      { id: 2, good_id: 32, amount: 1, cost: 250 },
    ],
  }], {
    services: [],
    serviceCategoryTitles: new Map(),
    serviceCategoryByService: new Map(),
    goods,
    goodsById: new Map(goods.map((good) => [good.good_id, good])),
    storages: [],
    issues: [],
  });

  assert.deepEqual(reports.drinks.map((row) => row.title), ['Лимонад']);
  assert.deepEqual(reports.beer.map((row) => row.title), ['Лагер']);
  assert.deepEqual(reports.goods, []);
});

test('missing kitchen recipe data is reported separately from a true zero', () => {
  const reports = buildSalesReports([{ id: 1, services: [{ id: 7, title: 'Уха', amount: 1, cost: 450 }] }], {
    services: [],
    serviceCategoryTitles: new Map(),
    serviceCategoryByService: new Map([[7, 'Кухня']]),
    goods: [],
    goodsById: new Map(),
    storages: [],
    issues: [],
  });
  assert.equal(reports.dataIssues.length, 1);
  assert.equal(reports.dataIssues[0].reason, 'unmapped');
});

test('free-window copy follows actual availability instead of gaps between records', () => {
  const text = buildFreeWindowsFromAvailability([
    {
      title: 'Малая баня',
      days: [{
        date: '2026-08-25',
        slots: [
          { time: '23:00', available: false, status: 'busy', canStartBooking: false },
          { time: '23:30', available: false, status: 'cleaning', canStartBooking: false },
        ],
      }],
    },
    {
      title: 'Большая баня 1',
      days: [{
        date: '2026-08-25',
        slots: [
          { time: '23:00', available: false, status: 'busy', canStartBooking: false },
          { time: '23:30', available: true, status: 'free', canStartBooking: true },
        ],
      }],
    },
  ], '2026-08-25');

  assert.equal(text, 'Малая баня\nСвободных окон нет\n\nБольшая баня 1\nСвободных окон нет');
});

test('free-window text includes free time before the first currently bookable slot', () => {
  const text = buildFreeWindowsFromAvailability([{
    title: 'Малая баня',
    days: [{
      date: '2026-08-25',
      slots: [
        { time: '10:00', available: true, status: 'free', canStartBooking: false },
        { time: '10:30', available: true, status: 'free', canStartBooking: true },
        { time: '11:00', available: true, status: 'free', canStartBooking: false },
        { time: '11:30', available: false, status: 'busy', canStartBooking: false },
      ],
    }],
  }], '2026-08-25');

  assert.equal(text, 'Малая баня\nс 10:00 до 11:00');
});

test('admin report dates reject impossible calendar dates and cap ranges at 366 days', () => {
  assert.equal(isValidIsoDate('2026-02-31'), false);
  assert.equal(isValidIsoDate('2024-02-29'), true);
  assert.equal(isValidIsoDate('2025-02-29'), false);
  assert.equal(isValidIsoDate('2026-09-14'), true);
  assert.equal(MAX_ADMIN_REPORT_RANGE_DAYS, 366);
  assert.equal(reportRangeDays('2025-01-01', '2026-01-01'), 366);
  assert.equal(reportRangeDays('2025-01-01', '2026-01-02'), 367);
  assert.equal(isAdminReportRangeWithinLimit('2025-01-01', '2026-01-01'), true);
  assert.equal(isAdminReportRangeWithinLimit('2025-01-01', '2026-01-02'), false);
  assert.equal(isAdminReportRangeWithinLimit('2026-01-02', '2026-01-01'), false);
});

test('admin report browser mask uses only server interval and a conservative request-time allowance', () => {
  const schedule = getAdminReportDeadlineDelays(
    '2026-09-14T02:00:00.000Z',
    '2026-09-14T01:59:50.000Z',
    2_000,
  );

  assert.deepEqual(schedule, {
    maskAfterMs: 10_000 - 2_000 - ADMIN_REPORT_MASK_SAFETY_MS,
    refreshAfterMs: 10_250,
  });
  assert.deepEqual(
    getAdminReportDeadlineDelays(
      '2026-09-14T02:00:00.000Z',
      '2026-09-14T01:59:59.500Z',
      750,
    ),
    { maskAfterMs: 0, refreshAfterMs: 750 },
  );
  assert.equal(getAdminReportDeadlineDelays('invalid', 'invalid', 0), null);
});

test('same-origin protection accepts the browser host and only an explicitly trusted proxy origin', () => {
  assert.equal(isSameOriginRequest(new Request('http://localhost:3001/api/admin/login', {
    headers: { host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001' },
  })), true);
  const proxiedRequest = new Request('http://internal:3000/api/admin/login', {
    headers: {
      host: 'internal:3000',
      origin: 'https://admin.example.test',
      'x-forwarded-host': 'admin.example.test',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(isSameOriginRequest(proxiedRequest), false);
  assert.equal(isSameOriginRequest(proxiedRequest, 'https://admin.example.test'), true);
  assert.equal(isSameOriginRequest(new Request('http://localhost:3001/api/admin/login', {
    headers: { host: 'localhost:3001', origin: 'https://attacker.example' },
  })), false);
});
