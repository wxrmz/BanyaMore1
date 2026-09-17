const MAX_KEY_LENGTH = 128;

/**
 * Client IP for rate limiting.
 *
 * X-Real-IP is set by our Nginx from $remote_addr and cannot be forged by the visitor.
 * For X-Forwarded-For only the LAST entry is trusted: it is the one appended by the
 * nearest proxy, while earlier entries come from the client and may be spoofed.
 */
export const getClientIp = (request: Request) => {
  const realIp = request.headers.get('x-real-ip')?.trim();
  const forwardedFor = request.headers
    .get('x-forwarded-for')
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);

  return (realIp || forwardedFor || 'local').slice(0, MAX_KEY_LENGTH);
};
