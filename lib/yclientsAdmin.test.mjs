import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCopyText, calculateDailyReport } from './yclientsReports.ts';
import { buildFreeWindowsFromAvailability } from './availabilityCopyText.ts';

test('daily report follows the v8 formulas and merges KPP into one expense row', () => {
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
    { title: 'Чеки КПП', amount: 600 },
    { title: 'Закупка продуктов', amount: 500 },
  ]);
  assert.deepEqual(report.checks, [{ denomination: 200, quantity: 2, total: 400 }]);
  assert.equal(report.unclassifiedChecks, 200);
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
  assert.equal(text.occupiedBaths, 'МБ с 10:00 до 12:00\nББ1 с 12:30 до 14:30\nМБ с 14:00 до 16:00\nББ2 с 14:00 до 16:00');
  assert.match(text.freeWindows, /Малая баня\nс 12:00 до 14:00\nс 16:00/);
  assert.match(text.freeWindows, /Большая баня 1\nс 14:30/);
  assert.match(text.freeWindows, /Большая баня 2\nс 16:00/);
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
