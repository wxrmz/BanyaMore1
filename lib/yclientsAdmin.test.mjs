import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDailyReport, crossMidnightExtensionTransactions } from './yclientsAdmin.ts';

const income = (amount, account = 'Наличные', extra = {}) => ({
  amount,
  account: { title: account },
  expense: { type: 7, title: 'Оказание услуг' },
  ...extra,
});

const expense = (amount, title = 'Расход') => ({
  amount: -amount,
  account: { title: 'Наличные' },
  expense: { type: 3, title },
});

const summary = (report) => ({
  income: report.income,
  expense: report.expense,
  prepayments: report.prepayments,
  cashless: report.cashless,
  terminal: report.terminal,
  surrendered: report.surrendered,
});

test('21.08 report matches the handwritten control report', () => {
  const report = calculateDailyReport({
    date: '2026-08-21',
    kppCompensation: 3400,
    kitchenServiceIds: [101],
    transactions: [
      income(33420),
      income(21500, 'Предоплата перевод на карту'),
      income(32990, 'Безналичная оплата терминал', {
        visit_id: 0,
        sold_item_type: 'service',
        sold_item_id: 101,
        date: '2026-08-21T09:00:00+04:00',
        last_change_date: '2026-08-21T16:00:00+04:00',
      }),
      income(4400, 'Безналичная оплата'),
      expense(20850),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 95710,
    expense: 24250,
    prepayments: 21500,
    cashless: 37390,
    terminal: 32990,
    surrendered: 12570,
  });
});

test('22.08 report rounds the YCLIENTS expense before adding KPP', () => {
  const report = calculateDailyReport({
    date: '2026-08-22',
    kppCompensation: 3200,
    transactions: [
      income(23840),
      income(28500, 'Предоплата перевод на карту'),
      income(41180, 'Безналичная оплата терминал'),
      income(34180, 'Безналичная оплата'),
      expense(18763.72),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 130900,
    expense: 21960,
    prepayments: 28500,
    cashless: 75360,
    terminal: 41180,
    surrendered: 5080,
  });
});

test('08.08 reconciles a batch of fractional purchase lines to whole rubles', () => {
  const report = calculateDailyReport({
    date: '2026-08-08',
    kppCompensation: 3600,
    transactions: [
      income(39690),
      income(22500, 'Предоплата перевод на карту'),
      income(26420, 'Безналичная оплата терминал'),
      income(8200, 'Безналичная оплата'),
      expense(1113.72, 'Закупка товаров'),
      expense(2458.6, 'Закупка товаров'),
      expense(2587.6, 'Закупка товаров'),
      expense(30198, 'Расходы смены'),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 100410,
    expense: 39958,
    prepayments: 22500,
    cashless: 34620,
    terminal: 26420,
    surrendered: 3332,
  });
});

test('23.08 report includes Products in expense and adjusts late kitchen terminal payments', () => {
  const report = calculateDailyReport({
    date: '2026-08-23',
    kppCompensation: 3000,
    kitchenServiceIds: [101],
    transactions: [
      income(40860),
      income(25000, 'Предоплата перевод на карту'),
      income(15810, 'Безналичная оплата терминал'),
      income(750, 'Безналичная оплата терминал', {
        visit_id: 0,
        sold_item_type: 'service',
        sold_item_id: 101,
        date: '2026-08-23T07:00:00+04:00',
        last_change_date: '2026-08-23T18:56:00+04:00',
      }),
      income(30510, 'Безналичная оплата'),
      expense(18950),
      expense(10000, 'Продукты'),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 115930,
    expense: 31950,
    prepayments: 25000,
    cashless: 47070,
    terminal: 15810,
    surrendered: 11910,
  });
  assert.equal(report.kitchenTerminalAdjustment, 750);
});

test('an extension after 02:00 stays in income and moves from cashless to P/O', () => {
  const report = calculateDailyReport({
    date: '2026-08-23',
    kppCompensation: 0,
    extensionTransactions: new Map([[55, new Set([101])]]),
    transactions: [
      income(5000),
      income(900, 'Безналичная оплата терминал', {
        record_id: 55,
        sold_item_type: 'service',
        sold_item_id: 101,
      }),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 5900,
    expense: 0,
    prepayments: 900,
    cashless: 0,
    terminal: 0,
    surrendered: 5000,
  });
  assert.equal(report.shiftTransfer, 900);
});

test('an extension beginning exactly at 02:00 remains in the closing shift', () => {
  const extensions = crossMidnightExtensionTransactions([
    {
      id: 55,
      datetime: '2026-08-01T23:30:00+10:00',
      seance_length: 10800,
      services: [
        { id: 1, title: 'Аренда 2ч' },
        { id: 101, title: 'Продление 30м' },
      ],
    },
  ], '2026-08-01');

  assert.equal(extensions.size, 0);
});

test('18.08 report includes all expenses and transfers the after-hours extension', () => {
  const report = calculateDailyReport({
    date: '2026-08-18',
    kppCompensation: 2600,
    extensionTransactions: new Map([[55, new Set([101])]]),
    transactions: [
      income(29230),
      income(30500, 'Предоплата перевод на карту'),
      income(31550, 'Безналичная оплата терминал'),
      income(21940, 'Безналичная оплата'),
      income(3000, 'Безналичная оплата', {
        record_id: 55,
        sold_item_type: 'service',
        sold_item_id: 101,
      }),
      expense(18650),
      expense(3000, 'Прочие расходы'),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 118820,
    expense: 24250,
    prepayments: 33500,
    cashless: 53490,
    terminal: 28550,
    surrendered: 7580,
  });
  assert.equal(report.shiftTransfer, 3000);
});

test('19.08 report matches the control report without corrections', () => {
  const report = calculateDailyReport({
    date: '2026-08-19',
    kppCompensation: 3000,
    transactions: [
      income(0),
      income(6000, 'Предоплата перевод на карту'),
      income(54200, 'Безналичная оплата терминал'),
      income(13700, 'Безналичная оплата'),
      income(17450),
      expense(17450),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 94350,
    expense: 20450,
    prepayments: 6000,
    cashless: 67900,
    terminal: 54200,
    surrendered: 0,
  });
});

test('15.08 report keeps extensions that do not meet the after-hours transfer rule', () => {
  const report = calculateDailyReport({
    date: '2026-08-15',
    kppCompensation: 2200,
    transactions: [
      income(57050),
      income(17000, 'Предоплата перевод на карту'),
      income(53850, 'Безналичная оплата терминал'),
      income(19770, 'Безналичная оплата'),
      expense(24350),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 149870,
    expense: 26550,
    prepayments: 17000,
    cashless: 73620,
    terminal: 53850,
    surrendered: 32700,
  });
  assert.equal(report.shiftTransfer, 0);
});

test('12.08 excludes another cash desk expense and kitchen added after shift close', () => {
  const report = calculateDailyReport({
    date: '2026-08-12',
    kppCompensation: 2400,
    kitchenServiceIds: [101],
    transactions: [
      income(33360),
      income(8500, 'Предоплата перевод на карту'),
      income(35220, 'Безналичная оплата терминал'),
      income(26480, 'Безналичная оплата'),
      income(2600, 'Безналичная оплата терминал', {
        visit_id: 0,
        sold_item_type: 'service',
        sold_item_id: 101,
        last_change_date: '2026-08-13T15:05:00+04:00',
      }),
      expense(25050),
      {
        ...expense(35000, 'Строительные работы на Н.П'),
        account: { title: 'ОБЩАЯ КАССА НАЛ.', is_cash: true },
        expense: { type: 4, title: 'Строительные работы на Н.П' },
      },
    ],
  });

  assert.deepEqual(summary(report), {
    income: 105960,
    expense: 27450,
    prepayments: 8500,
    cashless: 61700,
    terminal: 35220,
    surrendered: 8310,
  });
  assert.equal(report.lateKitchenExcluded, 2600);
  assert.equal(report.outsideShiftExpense, 35000);
});

test('03.08 counts both spellings of cash prepayment in P/O', () => {
  const report = calculateDailyReport({
    date: '2026-08-03',
    kppCompensation: 2000,
    transactions: [
      income(37920),
      income(11500, 'Предоплата перевод на карту'),
      income(3000, 'Предоплата наличные'),
      income(21150, 'Безналичная оплата терминал'),
      income(7780, 'Безналичная оплата'),
      expense(18550),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 83350,
    expense: 20550,
    prepayments: 14500,
    cashless: 28930,
    terminal: 21150,
    surrendered: 19350,
  });
});

test('09.08 keeps kitchen operations entered on the report API date', () => {
  const report = calculateDailyReport({
    date: '2026-08-09',
    kppCompensation: 3400,
    kitchenServiceIds: [101],
    terminalExclusionTransactionIds: new Set([9001]),
    transactions: [
      income(28930),
      income(33500, 'Предоплата перевод на карту'),
      income(16770, 'Безналичная оплата терминал'),
      income(560, 'Безналичная оплата терминал', { id: 9001 }),
      income(43410, 'Безналичная оплата'),
      income(300, 'Безналичная оплата', {
        visit_id: 0,
        sold_item_type: 'service',
        sold_item_id: 101,
        last_change_date: '2026-08-09T20:16:38+04:00',
      }),
      expense(19750),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 126870,
    expense: 23150,
    prepayments: 33500,
    cashless: 61040,
    terminal: 16770,
    surrendered: 9180,
  });
  assert.equal(report.lateKitchenExcluded, 0);
});

test('11.08 includes operating expenses paid from the common cash desk', () => {
  const report = calculateDailyReport({
    date: '2026-08-11',
    kppCompensation: 2200,
    transactions: [
      income(28600),
      income(14500, 'Предоплата перевод на карту'),
      income(20870, 'Безналичная оплата терминал'),
      income(14600, 'Безналичная оплата'),
      expense(25600),
      {
        ...expense(3000, 'Прочие расходы'),
        account: { title: 'ОБЩАЯ КАССА НАЛ.', is_cash: true },
        expense: { type: 6, title: 'Прочие расходы' },
      },
    ],
  });

  assert.deepEqual(summary(report), {
    income: 80770,
    expense: 30800,
    prepayments: 14500,
    cashless: 35470,
    terminal: 20870,
    surrendered: 0,
  });
});

test('13.08 attributes visit goods to the terminal used by that visit', () => {
  const report = calculateDailyReport({
    date: '2026-08-13',
    kppCompensation: 3400,
    kitchenOnlyRecordIds: new Set([77]),
    transactions: [
      income(19280),
      income(40500, 'Предоплата перевод на карту'),
      income(350, 'Безналичная оплата терминал', { record_id: 77, visit_id: 88 }),
      income(48050, 'Безналичная оплата терминал'),
      income(1400, 'Безналичная оплата', {
        record_id: 77,
        visit_id: 88,
        sold_item_type: 'goods_transaction',
        last_change_date: '2026-08-13T17:45:00+04:00',
      }),
      income(6200, 'Безналичная оплата'),
      expense(18800),
    ],
  });

  assert.deepEqual(summary(report), {
    income: 119180,
    expense: 22200,
    prepayments: 40500,
    cashless: 56000,
    terminal: 49800,
    surrendered: 480,
  });
});
