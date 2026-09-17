import assert from 'node:assert/strict';
import test from 'node:test';
import { getClientIp } from './clientIp.ts';
import { createRateLimiter } from './rateLimit.ts';

const req = (headers) => new Request('https://example.test/api', { headers });

test('client IP cannot be spoofed through the first X-Forwarded-For entry', () => {
  assert.equal(getClientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.7' })), '203.0.113.7');
  assert.equal(getClientIp(req({ 'x-real-ip': '198.51.100.2', 'x-forwarded-for': '1.1.1.1' })), '198.51.100.2');
  assert.equal(getClientIp(req({})), 'local');
});

test('rate limiter blocks after the limit and resets after the window', () => {
  const hit = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(hit('a', 0), 0);
  assert.equal(hit('a', 10), 0);
  assert.ok(hit('a', 20) > 0);
  assert.equal(hit('b', 20), 0);
  assert.equal(hit('a', 1001), 0);
});
