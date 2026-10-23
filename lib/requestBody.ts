export const MAX_JSON_BODY_BYTES = 16 * 1024;

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body is too large.');
    this.name = 'RequestBodyTooLargeError';
  }
}

const contentLengthOf = (request: Request) => {
  const value = request.headers.get('content-length');
  if (!value) return null;

  const contentLength = Number(value);
  return Number.isSafeInteger(contentLength) && contentLength >= 0 ? contentLength : null;
};

/** Read a small JSON request without allowing an unbounded body into memory. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = contentLengthOf(request);
  if (contentLength !== null && contentLength > MAX_JSON_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) {
    return request.json();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The request is already being rejected; a failed cancellation is harmless.
        }
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}
