const firstHeaderValue = (value: string | null) => value?.split(',')[0]?.trim() || '';

const canonicalOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

export const isSameOriginRequest = (request: Request, configuredPublicOrigin = '') => {
  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([requestUrl.origin]);
  const host = firstHeaderValue(request.headers.get('host'));
  const protocol = requestUrl.protocol.replace(/:$/, '');

  if (host && /^(https?|wss?)$/.test(protocol)) {
    const headerOrigin = canonicalOrigin(`${protocol}://${host}`);
    if (headerOrigin) allowedOrigins.add(headerOrigin);
  }

  const publicOrigin = canonicalOrigin(configuredPublicOrigin);
  if (publicOrigin) allowedOrigins.add(publicOrigin);

  const source = request.headers.get('origin') || request.headers.get('referer');
  if (!source) return true;

  const sourceOrigin = canonicalOrigin(source);
  return Boolean(sourceOrigin && allowedOrigins.has(sourceOrigin));
};
