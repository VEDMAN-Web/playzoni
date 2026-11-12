// Who is calling an admin API, and may they do this? (ADMIN §1, §2, §7)
// Sign-in is Cloudflare Access (Google). The email comes from the verified Access token; the role comes from the
// `team` table (or ADMIN_OWNER_EMAILS for the first owner). Every /api/admin/* function calls `guard` itself, so a
// role check never depends on the middleware alone.

import { verifyAccessJwt, type JwksFetcher } from './access';
import { fail, sameOrigin } from './http';
import type { Env, PagesContext } from './types';

export type Role = 'owner' | 'editor' | 'analyst';
export const ROLES: readonly Role[] = ['owner', 'editor', 'analyst'];
const RANK: Record<Role, number> = { analyst: 1, editor: 2, owner: 3 };

export interface AdminUser {
  email: string;
  role: Role;
}

export const roleAllows = (role: Role, needed: Role): boolean => RANK[role] >= RANK[needed];

export function ownerEmails(env: Env): string[] {
  return (env.ADMIN_OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** The local sign-in bypass works only when ENVIRONMENT is exactly "development" (set in .dev.vars, never in production). */
export function devEmail(env: Env): string | null {
  if (env.ENVIRONMENT !== 'development') return null;
  const email = (env.ADMIN_DEV_EMAIL ?? '').trim().toLowerCase();
  return email || null;
}

export async function roleFor(env: Env, email: string): Promise<Role | null> {
  if (ownerEmails(env).includes(email)) return 'owner';
  const row = await env.DB.prepare('SELECT role FROM team WHERE email = ?').bind(email).first<{ role: string }>();
  const role = row?.role;
  return role === 'owner' || role === 'editor' || role === 'analyst' ? role : null;
}

/** Returns the signed-in team member, or an error Response (401 not signed in, 403 not on the team). */
export async function authenticate(request: Request, env: Env, fetchJwks?: JwksFetcher): Promise<AdminUser | Response> {
  let email = devEmail(env);
  if (!email) {
    const token = request.headers.get('cf-access-jwt-assertion');
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return fail(503, 'Sign-in is not set up yet (Cloudflare Access).');
    if (!token) return fail(401, 'Not signed in.');
    const result = await verifyAccessJwt(token, { teamDomain: env.ACCESS_TEAM_DOMAIN, aud: env.ACCESS_AUD, fetchJwks });
    if (!result.ok) return fail(401, `Sign-in check failed: ${result.reason}.`);
    email = result.email;
  }
  const role = await roleFor(env, email);
  if (!role) return fail(403, 'This email is not on the Playzoni team.');
  return { email, role };
}

export interface AdminData {
  user?: AdminUser;
}

/**
 * Authenticates (or reuses the middleware's result), checks the role, and for writes checks the origin and JSON body.
 * Returns the user or an error Response.
 */
export async function guard(context: PagesContext, needed: Role): Promise<AdminUser | Response> {
  const data = context.data as AdminData;
  let user = data.user;
  if (!user) {
    const result = await authenticate(context.request, context.env);
    if (result instanceof Response) return result;
    user = result;
    data.user = user;
  }
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    if (!sameOrigin(context.request)) return fail(403, 'Wrong origin.');
    if (!(context.request.headers.get('content-type') ?? '').includes('application/json')) return fail(415, 'Send JSON.');
  }
  if (!roleAllows(user.role, needed)) return fail(403, `This needs the ${needed} role. You are ${user.role}.`);
  return user;
}
