import assert from 'node:assert/strict';
import test from 'node:test';

import { cachedYclientsValue, yclientsRetryDelayMs } from './yclientsTransport.ts';

test('YCLIENTS retry policy never retries a zero-second rate limit immediately', () => {
  assert.equal(yclientsRetryDelayMs({ retryAfter: '0', attempt: 1 }), 1_000);
  assert.equal(yclientsRetryDelayMs({
    retryAfter: null,
    message: 'Превышен лимит запросов, попробуйте повторить запрос через 0 секунд.',
    attempt: 1,
  }), 1_000);
});

test('YCLIENTS retry policy respects provider delays and exponential backoff', () => {
  assert.equal(yclientsRetryDelayMs({ retryAfter: '3', attempt: 1 }), 3_000);
  assert.equal(yclientsRetryDelayMs({ retryAfter: null, attempt: 4 }), 8_000);
  assert.equal(yclientsRetryDelayMs({ retryAfter: '120', attempt: 5 }), 15_000);
});

test('identical concurrent YCLIENTS reads are coalesced into one request', async () => {
  let calls = 0;
  const key = `test:${Date.now()}:${Math.random()}`;
  const load = async () => {
    calls += 1;
    await Promise.resolve();
    return { ok: true };
  };

  const [first, second] = await Promise.all([
    cachedYclientsValue(key, 1_000, load),
    cachedYclientsValue(key, 1_000, load),
  ]);

  assert.deepEqual(first, { ok: true });
  assert.deepEqual(second, { ok: true });
  assert.equal(calls, 1);
});
