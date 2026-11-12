// GET /api/admin/me: who is signed in, their role, and what is connected (for the shell and empty states).
import { guard } from '../_lib/auth';
import { json } from '../_lib/http';
import { isDemo } from '../_lib/query';
import type { PagesContext } from '../_lib/types';

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'analyst');
  if (user instanceof Response) return user;
  const env = context.env;
  return json({
    email: user.email,
    role: user.role,
    demo: await isDemo(env.DB),
    github: Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_INSTALLATION_ID && env.GITHUB_APP_PRIVATE_KEY),
    onesignal: Boolean(env.ONESIGNAL_APP_ID && env.ONESIGNAL_REST_API_KEY),
    uploads: Boolean(env.UPLOADS),
  });
};
