import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminDailyReportAccess } from './adminDateRange.ts';
import { getAdminAccess, getAdminRoleLabel } from './adminRoles.ts';
import { bathDefinitions, buildCopyText } from './yclientsReports.ts';

test('administrator can open today in Vladivostok', () => {
  const now = new Date('2026-09-13T14:00:01.000Z'); // 2026-09-14 00:00:01 UTC+10

  assert.deepEqual(getAdminDailyReportAccess('2026-09-14', now), {
    allowed: true,
    reason: 'today',
    closesAt: null,
    today: '2026-09-14',
    yesterday: '2026-09-13',
  });
});

test('administrator can open yesterday throughout the Vladivostok day', () => {
  const now = new Date('2026-09-14T01:59:59.000Z'); // 2026-09-14 11:59:59 UTC+10

  assert.deepEqual(getAdminDailyReportAccess('2026-09-13', now), {
    allowed: true,
    reason: 'yesterday',
    closesAt: '2026-09-14T14:00:00.000Z',
    today: '2026-09-14',
    yesterday: '2026-09-13',
  });
});

test('administrator keeps yesterday after noon but cannot open the day before yesterday', () => {
  const atNoon = new Date('2026-09-14T02:00:00.000Z'); // 2026-09-14 12:00:00 UTC+10
  const beforeNoon = new Date('2026-09-14T01:59:59.000Z');

  assert.deepEqual(getAdminDailyReportAccess('2026-09-13', atNoon), {
    allowed: true,
    reason: 'yesterday',
    closesAt: '2026-09-14T14:00:00.000Z',
    today: '2026-09-14',
    yesterday: '2026-09-13',
  });
  assert.deepEqual(getAdminDailyReportAccess('2026-09-12', beforeNoon), {
    allowed: false,
    reason: 'closed',
    closesAt: null,
    today: '2026-09-14',
    yesterday: '2026-09-13',
  });
});

test('administrator loses the former yesterday at the next Vladivostok midnight', () => {
  const nextMidnight = new Date('2026-09-14T14:00:00.000Z'); // 2026-09-15 00:00 UTC+10
  assert.deepEqual(getAdminDailyReportAccess('2026-09-13', nextMidnight), {
    allowed: false,
    reason: 'closed',
    closesAt: null,
    today: '2026-09-15',
    yesterday: '2026-09-14',
  });
});

test('director has the same full report rights as owner and a distinct label', () => {
  assert.deepEqual(getAdminAccess('director'), {
    fullReports: true,
    periodReports: true,
    copyTextsOnly: false,
  });
  assert.deepEqual(getAdminAccess('director'), getAdminAccess('owner'));
  assert.equal(getAdminRoleLabel('director'), 'Директор');
});

test('copy text groups intervals under exactly three configured baths and ignores other staff', () => {
  assert.deepEqual(
    bathDefinitions.map(({ title }) => title),
    ['Малая баня', 'Большая баня 1', 'Большая баня 2'],
  );

  const [small, bigOne, bigTwo] = bathDefinitions;
  const text = buildCopyText([
    { id: 1, staff_id: small.staffId, datetime: '2026-09-14T14:00:00+10:00', seance_length: 9_000, technical_break_duration: 1_800 },
    { id: 2, staff_id: bigTwo.staffId, datetime: '2026-09-14T14:00:00+10:00', seance_length: 7_200, technical_break_duration: 0 },
    { id: 3, staff_id: 999_999_999, datetime: '2026-09-14T09:00:00+10:00', seance_length: 3_600, technical_break_duration: 0 },
    { id: 4, staff_id: bigOne.staffId, datetime: '2026-09-14T12:30:00+10:00', seance_length: 9_000, technical_break_duration: 1_800 },
    { id: 5, staff_id: small.staffId, datetime: '2026-09-14T10:00:00+10:00', seance_length: 9_000, technical_break_duration: 1_800 },
  ]);

  assert.equal(text.occupiedTimes, '10:00 - 12:00\n12:30 - 14:30\n14:00 - 16:00\n14:00 - 16:00');
  assert.equal(
    text.occupiedBaths,
    'Малая баня\nс 10:00 до 12:00\nс 14:00 до 16:00\n\n'
      + 'Большая баня 1\nс 12:30 до 14:30\n\n'
      + 'Большая баня 2\nс 14:00 до 16:00',
  );
  assert.equal(text.occupiedBaths.includes('Средн'), false);
  assert.equal(text.occupiedTimes.includes('09:00'), false);

  for (const bath of bathDefinitions) {
    assert.equal(text.occupiedBaths.split(bath.title).length - 1, 1);
  }
});
