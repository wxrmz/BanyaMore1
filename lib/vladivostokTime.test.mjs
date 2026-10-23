import assert from 'node:assert/strict';
import test from 'node:test';
import { vladivostokDate, vladivostokDateTime, vladivostokMinutes } from './vladivostokTime.ts';

test('момент времени переводится в часы бани, а не в часы посетителя', () => {
  // 14:00 в Екатеринбурге (UTC+5) — это 19:00 во Владивостоке.
  const now = new Date('2026-09-22T09:00:00.000Z');

  assert.equal(vladivostokDate(now), '2026-09-22');
  assert.equal(vladivostokMinutes(now), 19 * 60);
});

test('после полуночи во Владивостоке дата уже следующая, хотя в UTC ещё вчера', () => {
  const now = new Date('2026-09-21T15:30:00.000Z'); // 2026-09-22 01:30 +10

  assert.deepEqual(vladivostokDateTime(now), { date: '2026-09-22', minutes: 90 });
});

test('границы суток считаются без сдвига', () => {
  const lastMinute = new Date('2026-09-21T13:59:00.000Z'); // 23:59 +10
  const midnight = new Date('2026-09-21T14:00:00.000Z'); // 00:00 +10 следующего дня

  assert.deepEqual(vladivostokDateTime(lastMinute), { date: '2026-09-21', minutes: 1439 });
  assert.deepEqual(vladivostokDateTime(midnight), { date: '2026-09-22', minutes: 0 });
});

test('результат не зависит от часового пояса машины', () => {
  const now = new Date('2026-09-22T09:00:00.000Z');
  const expected = { date: '2026-09-22', minutes: 19 * 60 };

  for (const zone of ['Asia/Yekaterinburg', 'Europe/Moscow', 'UTC', 'America/New_York']) {
    const previous = process.env.TZ;
    process.env.TZ = zone;
    assert.deepEqual(vladivostokDateTime(now), expected, `часовой пояс ${zone}`);
    process.env.TZ = previous;
  }
});
