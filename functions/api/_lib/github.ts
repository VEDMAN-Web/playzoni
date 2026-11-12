// Commits from the admin to the `dev` branch through a GitHub App (docs/ADMIN.md §2 "rebuild"). The App's private key
// is a Cloudflare secret (GITHUB_APP_PRIVATE_KEY); it is never logged or sent anywhere except to sign the App token.
// Commits go to `dev` only. Never `main`: the owner promotes by hand.
import type { Env } from './types';

export const BRANCH = 'dev';
const API = 'https://api.github.com';

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export const githubReady = (env: Env): boolean => Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_INSTALLATION_ID && env.GITHUB_APP_PRIVATE_KEY);
export const repoOf = (env: Env): string => (env.GITHUB_REPO && /^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPO) ? env.GITHUB_REPO : 'VEDMAN-Web/playzoni');

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function derLength(n: number): number[] {
  if (n < 128) return [n];
  const out: number[] = [];
  for (let x = n; x > 0; x >>= 8) out.unshift(x & 0xff);
  return [0x80 | out.length, ...out];
}

/** GitHub gives a PKCS#1 key ("BEGIN RSA PRIVATE KEY"); WebCrypto needs PKCS#8. Wraps it when needed. */
export function pemToPkcs8(pem: string): Uint8Array<ArrayBuffer> {
  const isPkcs1 = pem.includes('BEGIN RSA PRIVATE KEY');
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (!isPkcs1) return new Uint8Array(raw);
  const algo = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = [0x04, ...derLength(raw.length), ...raw];
  const inner = [0x02, 0x01, 0x00, ...algo, ...octet];
  return new Uint8Array([0x30, ...derLength(inner.length), ...inner]);
}

export async function appJwt(appId: string, pem: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const head = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify({ iat: nowSeconds - 60, exp: nowSeconds + 540, iss: appId })));
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

const headers = (token: string): Record<string, string> => ({
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  'user-agent': 'playzoni-admin',
});

export async function installationToken(env: Env, fetcher: Fetcher = fetch): Promise<string> {
  const jwt = await appJwt(String(env.GITHUB_APP_ID), String(env.GITHUB_APP_PRIVATE_KEY));
  const r = await fetcher(`${API}/app/installations/${encodeURIComponent(String(env.GITHUB_APP_INSTALLATION_ID))}/access_tokens`, { method: 'POST', headers: headers(jwt) });
  if (!r.ok) throw new Error(`GitHub App token failed (${r.status})`);
  return ((await r.json()) as { token: string }).token;
}

const toB64 = (text: string): string => {
  const bytes = enc.encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromB64 = (b64: string): string => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

export async function getFile(token: string, repo: string, path: string, fetcher: Fetcher = fetch): Promise<{ text: string; sha: string } | null> {
  const r = await fetcher(`${API}/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${BRANCH}`, { headers: headers(token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub read failed for ${path} (${r.status})`);
  const body = (await r.json()) as { content: string; sha: string };
  return { text: fromB64(body.content), sha: body.sha };
}

export async function putFile(token: string, repo: string, path: string, text: string, sha: string | null, message: string, fetcher: Fetcher = fetch): Promise<string> {
  const r = await fetcher(`${API}/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT',
    headers: { ...headers(token), 'content-type': 'application/json' },
    body: JSON.stringify({ message, content: toB64(text), branch: BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (!r.ok) throw new Error(`GitHub commit failed for ${path} (${r.status})`);
  return ((await r.json()) as { commit: { sha: string } }).commit.sha;
}
