// Cloudflare Access JWT check (ADMIN §2, §7). Access puts a signed token in the `Cf-Access-Jwt-Assertion` header of
// every request it lets through. We verify the RS256 signature with the team's public keys, the audience (AUD tag),
// the issuer and the expiry, then read the email. Uses WebCrypto only (works in Workers and in Node for tests).

export interface Jwk {
  kid?: string;
  kty: string;
  n?: string;
  e?: string;
  alg?: string;
}

export type JwksFetcher = (certsUrl: string) => Promise<{ keys: Jwk[] }>;

export interface VerifyOptions {
  teamDomain: string;
  aud: string;
  nowSeconds?: number;
  fetchJwks?: JwksFetcher;
}

export type VerifyResult = { ok: true; email: string } | { ok: false; reason: string };

const enc = new TextEncoder();

export function b64urlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodePart(part: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function issuerFor(teamDomain: string): string {
  const host = teamDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${host}`;
}

const defaultFetch: JwksFetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`certs ${response.status}`);
  return (await response.json()) as { keys: Jwk[] };
};

// Keys are cached per isolate for one hour.
let cache: { url: string; at: number; keys: Jwk[] } | null = null;

export function clearJwksCache(): void {
  cache = null;
}

async function keysFor(url: string, fetcher: JwksFetcher, nowSeconds: number, refresh: boolean): Promise<Jwk[]> {
  if (!refresh && cache && cache.url === url && nowSeconds - cache.at < 3600) return cache.keys;
  const { keys } = await fetcher(url);
  cache = { url, at: nowSeconds, keys: Array.isArray(keys) ? keys : [] };
  return cache.keys;
}

export async function verifyAccessJwt(token: string, options: VerifyOptions): Promise<VerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed token' };
  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  if (!header || !payload) return { ok: false, reason: 'malformed token' };
  if (header.alg !== 'RS256') return { ok: false, reason: 'unexpected algorithm' };

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const issuer = issuerFor(options.teamDomain);
  const certsUrl = `${issuer}/cdn-cgi/access/certs`;
  const fetcher = options.fetchJwks ?? defaultFetch;

  let keys: Jwk[];
  try {
    keys = await keysFor(certsUrl, fetcher, now, false);
    if (!keys.some((k) => k.kid === header.kid)) keys = await keysFor(certsUrl, fetcher, now, true);
  } catch {
    return { ok: false, reason: 'could not load Access keys' };
  }
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return { ok: false, reason: 'unknown key' };

  let valid: boolean;
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: 'bad signature' };

  const aud = payload.aud;
  const audOk = Array.isArray(aud) ? aud.includes(options.aud) : aud === options.aud;
  if (!audOk) return { ok: false, reason: 'wrong audience' };
  if (payload.iss !== issuer) return { ok: false, reason: 'wrong issuer' };
  if (typeof payload.exp !== 'number' || payload.exp < now - 60) return { ok: false, reason: 'expired' };
  if (typeof payload.nbf === 'number' && payload.nbf > now + 60) return { ok: false, reason: 'not yet valid' };
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) return { ok: false, reason: 'no email in token' };
  return { ok: true, email };
}
