type QueueTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type CacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
};

type TransportState = {
  active: number;
  blockedUntil: number;
  queue: QueueTask<unknown>[];
  cache: Map<string, CacheEntry>;
};

const MAX_CONCURRENCY = 2;
const MAX_RETRY_DELAY_MS = 15_000;
const YCLIENTS_REQUEST_TIMEOUT_MS = 20_000;
const globalTransport = globalThis as typeof globalThis & {
  __banyaMoreYclientsTransport?: TransportState;
};

const state = globalTransport.__banyaMoreYclientsTransport ?? {
  active: 0,
  blockedUntil: 0,
  queue: [],
  cache: new Map<string, CacheEntry>(),
};
globalTransport.__banyaMoreYclientsTransport = state;

const wait = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

const pump = () => {
  while (state.active < MAX_CONCURRENCY && state.queue.length > 0) {
    const task = state.queue.shift();
    if (!task) return;
    state.active += 1;
    void (async () => {
      try {
        const cooldown = Math.max(0, state.blockedUntil - Date.now());
        if (cooldown > 0) await wait(cooldown);
        task.resolve(await task.run());
      } catch (error) {
        task.reject(error);
      } finally {
        state.active -= 1;
        pump();
      }
    })();
  }
};

const schedule = <T>(run: () => Promise<T>) => new Promise<T>((resolve, reject) => {
  state.queue.push({ run, resolve, reject } as QueueTask<unknown>);
  pump();
});

const fetchWithTimeout = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), YCLIENTS_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const retryAfterHeaderMs = (value: string | null, nowMs: number) => {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - nowMs) : 0;
};

const retryAfterMessageMs = (message: string) => {
  const seconds = Number(
    message.match(/(?:через|after)\s+(\d+(?:[.,]\d+)?)\s*(?:сек|second)/i)?.[1]?.replace(',', '.') ?? '',
  );
  return Number.isFinite(seconds) ? Math.max(0, seconds * 1_000) : 0;
};

export function yclientsRetryDelayMs({
  retryAfter,
  message = '',
  attempt,
  nowMs = Date.now(),
}: {
  retryAfter: string | null;
  message?: string;
  attempt: number;
  nowMs?: number;
}) {
  const providerDelay = Math.max(
    retryAfterHeaderMs(retryAfter, nowMs),
    retryAfterMessageMs(message),
  );
  const fallbackDelay = 1_000 * 2 ** Math.max(0, attempt - 1);
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(1_000, providerDelay, fallbackDelay));
}

const responseMessage = async (response: Response) => {
  const payload = await response.clone().json().catch(() => null) as {
    message?: unknown;
    meta?: { message?: unknown } | unknown[];
  } | null;
  if (typeof payload?.message === 'string') return payload.message;
  if (payload?.meta && !Array.isArray(payload.meta) && typeof payload.meta.message === 'string') {
    return payload.meta.message;
  }
  return '';
};

export async function fetchYclientsWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 5,
) {
  let lastResponse: Response | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await schedule(() => fetchWithTimeout(url, init));
      lastResponse = response;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable) return response;

      const delay = yclientsRetryDelayMs({
        retryAfter: response.headers.get('retry-after'),
        message: await responseMessage(response),
        attempt,
      });
      if (response.status === 429) {
        state.blockedUntil = Math.max(state.blockedUntil, Date.now() + delay);
      }
      if (attempt < maxAttempts) await wait(delay);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await wait(yclientsRetryDelayMs({ retryAfter: null, attempt }));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('YCLIENTS временно не отвечает.');
}

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of state.cache) {
    if (entry.expiresAt <= now) state.cache.delete(key);
  }
  while (state.cache.size > 600) {
    const oldestKey = state.cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    state.cache.delete(oldestKey);
  }
};

export function cachedYclientsValue<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
) {
  pruneCache();
  const cached = state.cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise as Promise<T>;

  const promise = load().catch((error) => {
    const current = state.cache.get(key);
    if (current?.promise === promise) state.cache.delete(key);
    throw error;
  });
  state.cache.set(key, { expiresAt: Date.now() + ttlMs, promise });
  return promise;
}

const vladivostokToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Vladivostok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

export function yclientsCacheTtlMs(path: string) {
  if (/^\/(?:services|service_categories|goods|storages)\//.test(path)) return 10 * 60_000;
  if (path.startsWith('/visit/loyalty/transactions/')) return 60 * 60_000;
  if (path.startsWith('/book_times/')) return 30_000;

  const endDate = new URL(path, 'https://yclients.local').searchParams.get('end_date')?.replace(
    /^(\d{4})(\d{2})(\d{2})$/,
    '$1-$2-$3',
  );
  if (endDate && endDate < vladivostokToday()) return 5 * 60_000;
  return 30_000;
}
