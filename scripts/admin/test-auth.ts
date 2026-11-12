// T10.1 / T10.5: Cloudflare Access token check, dev bypass rules, and role checks (ADMIN §1, §7).
import { clearJwksCache, verifyAccessJwt, type Jwk } from '../../functions/api/_lib/access';
import { authenticate, guard, roleAllows, type AdminUser } from '../../functions/api/_lib/auth';
import type { Env, PagesContext } from '../../functions/api/_lib/types';
import { finish, same } from '../test-kit';
import { openDb } from './d1-shim';

const TEAM = 'playzoni-test.cloudflareaccess.com';
const AUD = 'aud-123';
const NOW = 1_800_000_000;

const b64url = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64url');
const enc = new TextEncoder();

const pair = (await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
)) as CryptoKeyPair;
const pub = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as Jwk;
const jwks = { keys: [{ ...pub, kid: 'k1' }] };
const fetchJwks = async (): Promise<{ keys: Jwk[] }> => jwks;

async function token(payload: Record<string, unknown>, kid = 'k1'): Promise<string> {
  const head = b64url(enc.encode(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, enc.encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

const good = { aud: [AUD], iss: `https://${TEAM}`, exp: NOW + 600, nbf: NOW - 10, email: 'Owner@Example.com' };
const opts = { teamDomain: TEAM, aud: AUD, nowSeconds: NOW, fetchJwks };

same(await verifyAccessJwt(await token(good), opts), { ok: true, email: 'owner@example.com' }, 'valid token');
same((await verifyAccessJwt(await token({ ...good, aud: ['other'] }), opts)).ok, false, 'wrong audience rejected');
same((await verifyAccessJwt(await token({ ...good, iss: 'https://evil.cloudflareaccess.com' }), opts)).ok, false, 'wrong issuer rejected');
same((await verifyAccessJwt(await token({ ...good, exp: NOW - 3600 }), opts)).ok, false, 'expired rejected');
same((await verifyAccessJwt(await token({ ...good, email: undefined }), opts)).ok, false, 'no email rejected');
clearJwksCache();
same((await verifyAccessJwt(await token(good, 'k2'), opts)).ok, false, 'unknown key rejected');
const t = await token(good);
const tampered = t.split('.');
tampered[1] = b64url(enc.encode(JSON.stringify({ ...good, email: 'attacker@example.com' })));
same((await verifyAccessJwt(tampered.join('.'), opts)).ok, false, 'tampered payload rejected');
same((await verifyAccessJwt('abc', opts)).ok, false, 'malformed rejected');

// Roles and authenticate().
same(roleAllows('owner', 'editor'), true, 'owner can edit');
same(roleAllows('editor', 'owner'), false, 'editor cannot do owner things');
same(roleAllows('analyst', 'editor'), false, 'analyst is read-only');
same(roleAllows('analyst', 'analyst'), true, 'analyst can read');

const db = openDb();
await db.prepare("INSERT INTO team (email, role) VALUES ('ed@example.com', 'editor'), ('an@example.com', 'analyst')").run();
const req = (headers: Record<string, string> = {}, method = 'GET', body?: string): Request =>
  new Request('https://playzoni.com/api/admin/x', { method, headers, body });

// Dev bypass only with ENVIRONMENT=development.
const prodEnv: Env = { DB: db, ADMIN_DEV_EMAIL: 'ed@example.com', ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD };
const r1 = await authenticate(req(), prodEnv, fetchJwks);
same(r1 instanceof Response ? r1.status : 200, 401, 'dev email ignored outside development');
const devEnv: Env = { ...prodEnv, ENVIRONMENT: 'development' };
same(await authenticate(req(), devEnv), { email: 'ed@example.com', role: 'editor' }, 'dev bypass in development');
const unset = await authenticate(req(), { DB: db });
same(unset instanceof Response ? unset.status : 200, 503, 'no Access config -> 503');

// Owner from ADMIN_OWNER_EMAILS, team member from table, stranger refused.
const ownerEnv: Env = { ...prodEnv, ADMIN_OWNER_EMAILS: 'owner@example.com' };
const live = { ...good, exp: Math.floor(Date.now() / 1000) + 600, nbf: undefined };
same(await authenticate(req({ 'cf-access-jwt-assertion': await token(live) }), ownerEnv, fetchJwks), { email: 'owner@example.com', role: 'owner' }, 'owner email');
const stranger = await authenticate(req({ 'cf-access-jwt-assertion': await token({ ...live, email: 'x@example.com' }) }), ownerEnv, fetchJwks);
same(stranger instanceof Response ? stranger.status : 200, 403, 'stranger refused');

// guard(): role and write rules.
function ctx(user: AdminUser, request: Request): PagesContext {
  return { request, env: { DB: db }, params: {}, data: { user }, next: async () => new Response(), waitUntil: () => undefined };
}
const status = (r: AdminUser | Response): number => (r instanceof Response ? r.status : 200);
const analyst: AdminUser = { email: 'an@example.com', role: 'analyst' };
const editor: AdminUser = { email: 'ed@example.com', role: 'editor' };
same(status(await guard(ctx(analyst, req()), 'analyst')), 200, 'analyst GET ok');
same(status(await guard(ctx(analyst, req({ origin: 'https://playzoni.com', 'content-type': 'application/json' }, 'POST', '{}')), 'editor')), 403, 'analyst write refused');
same(status(await guard(ctx(editor, req({ origin: 'https://playzoni.com', 'content-type': 'application/json' }, 'POST', '{}')), 'editor')), 200, 'editor write ok');
same(status(await guard(ctx(editor, req({ origin: 'https://evil.com', 'content-type': 'application/json' }, 'POST', '{}')), 'editor')), 403, 'cross-origin write refused');
same(status(await guard(ctx(editor, req({ origin: 'https://playzoni.com', 'content-type': 'text/plain' }, 'POST', '{}')), 'editor')), 415, 'non-JSON write refused');
same(status(await guard(ctx(editor, req()), 'owner')), 403, 'editor refused owner screen');
finish('test-auth');
