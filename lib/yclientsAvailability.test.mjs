import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFreeWindowsFromAvailability } from './availabilityCopyText.ts';
import { buildExactAvailabilitySlotDays, carryoverEndMinutes } from './availabilitySlotStatus.ts';

const times = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

test('exact records do not turn empty time before a booking into occupied time', () => {
  const explicitStarts = new Map(['10:00', '10:30'].map((time) => [time, {
    time,
    available: true,
    canStartBooking: true,
    status: 'free',
    serviceId: 123,
  }]));
  const result = buildExactAvailabilitySlotDays({
    dates: ['2026-09-16'],
    dayTimes: times,
    freeStartSlotsByDay: [explicitStarts],
    records: [{
      staff_id: 7,
      datetime: '2026-09-16T12:30:00+10:00',
      seance_length: 12_600,
      technical_break_duration: 1_800,
    }],
    staffId: 7,
  });

  assert.deepEqual(result[0].map(({ time, status, available, canStartBooking }) => ({
    time,
    status,
    available,
    canStartBooking,
  })).slice(0, 6), [
    { time: '10:00', status: 'free', available: true, canStartBooking: true },
    { time: '10:30', status: 'free', available: true, canStartBooking: true },
    { time: '11:00', status: 'free', available: true, canStartBooking: false },
    { time: '11:30', status: 'free', available: true, canStartBooking: false },
    { time: '12:00', status: 'free', available: true, canStartBooking: false },
    { time: '12:30', status: 'busy', available: false, canStartBooking: false },
  ]);
  assert.equal(result[0].find((slot) => slot.time === '15:00').status, 'busy');
  assert.equal(result[0].find((slot) => slot.time === '15:30').status, 'cleaning');
  assert.equal(result[0].find((slot) => slot.time === '16:00').status, 'free');

  assert.equal(buildFreeWindowsFromAvailability([{
    title: 'Малая баня',
    days: [{ date: '2026-09-16', slots: result[0] }],
  }], '2026-09-16'), 'Малая баня\nс 10:00 до 12:30\nс 16:00');
});

test('a record crossing midnight produces one exact cleaning slot on the next day', () => {
  const result = buildExactAvailabilitySlotDays({
    dates: ['2026-09-16'],
    dayTimes: ['00:00', '00:30', '01:00'],
    freeStartSlotsByDay: [new Map([['00:30', {
      time: '00:30', available: true, canStartBooking: true, status: 'free', serviceId: 123,
    }]])],
    records: [{
      staff_id: 7,
      datetime: '2026-09-15T22:00:00+10:00',
      seance_length: 9_000,
      technical_break_duration: 1_800,
    }],
    staffId: 7,
  });

  assert.deepEqual(result[0].map(({ time, status, canStartBooking }) => ({ time, status, canStartBooking })), [
    { time: '00:00', status: 'cleaning', canStartBooking: false },
    { time: '00:30', status: 'free', canStartBooking: true },
    { time: '01:00', status: 'free', canStartBooking: false },
  ]);
  assert.equal(carryoverEndMinutes([{
    staff_id: 7,
    datetime: '2026-09-15T22:00:00+10:00',
    seance_length: 9_000,
    technical_break_duration: 1_800,
  }], 7, '2026-09-16'), 30);
});

test('copied free windows begin at midnight or at the exact end of an overnight booking', () => {
  const records = [{
    staff_id: 7,
    datetime: '2026-09-15T22:00:00+10:00',
    seance_length: 9_900,
    technical_break_duration: 1_800,
  }];
  const dates = ['2026-09-16'];
  const dayTimes = ['00:00', '00:30', '01:00', '01:30', '02:00'];
  const slots = buildExactAvailabilitySlotDays({
    dates,
    dayTimes,
    freeStartSlotsByDay: [new Map([['02:00', {
      time: '02:00', available: true, canStartBooking: true, status: 'free',
    }]])],
    records,
    staffId: 7,
  })[0];
  assert.equal(carryoverEndMinutes(records, 7, dates[0]), 45);
  assert.equal(buildFreeWindowsFromAvailability([{
    title: 'Малая баня',
    days: [{ date: dates[0], slots, carryoverEndMinutes: 45 }],
  }], dates[0]), 'Малая баня\nс 00:45');

  const emptySlots = buildExactAvailabilitySlotDays({
    dates,
    dayTimes,
    freeStartSlotsByDay: [new Map()],
    records: [],
    staffId: 7,
  })[0];
  assert.equal(carryoverEndMinutes([], 7, dates[0]), null);
  assert.equal(buildFreeWindowsFromAvailability([{
    title: 'Большая баня 1',
    days: [{ date: dates[0], slots: emptySlots, carryoverEndMinutes: null }],
  }], dates[0]), 'Большая баня 1\nс 00:00');
});

test('copy windows and occupied slots share the same exact record boundaries', () => {
  const dayTimes = Array.from({ length: 26 }, (_, index) => {
    const minutes = 11 * 60 + index * 30;
    return `${Math.floor(minutes / 60)}`.padStart(2, '0') + ':' + `${minutes % 60}`.padStart(2, '0');
  });
  const explicitStarts = new Map(['11:30', '12:00', '12:30'].map((time) => [time, {
    time, available: true, canStartBooking: true, status: 'free', serviceId: 123,
  }]));
  const result = buildExactAvailabilitySlotDays({
    dates: ['2026-09-16'],
    dayTimes,
    freeStartSlotsByDay: [explicitStarts],
    records: [
      { staff_id: 7, datetime: '2026-09-16T15:00:00+10:00', seance_length: 16_200, technical_break_duration: 1_800 },
      { staff_id: 7, datetime: '2026-09-16T20:00:00+10:00', seance_length: 12_600, technical_break_duration: 1_800 },
    ],
    staffId: 7,
  });

  assert.equal(buildFreeWindowsFromAvailability([{
    title: 'Большая баня 1',
    days: [{ date: '2026-09-16', slots: result[0] }],
  }], '2026-09-16'), 'Большая баня 1\nс 11:00 до 15:00\nс 19:30 до 20:00');
  assert.deepEqual(
    result[0].filter((slot) => slot.status === 'cleaning').map((slot) => slot.time),
    ['19:00', '23:00'],
  );
});
