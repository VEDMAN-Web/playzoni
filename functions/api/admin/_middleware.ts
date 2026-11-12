// Runs before every /api/admin/* function: checks the Cloudflare Access sign-in and the team role once and keeps the
// result for the function. Each function still calls `guard` with the role it needs (ADMIN §7).
import { authenticate, type AdminData } from '../_lib/auth';
import type { PagesContext } from '../_lib/types';

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const result = await authenticate(context.request, context.env);
  if (result instanceof Response) return result;
  (context.data as AdminData).user = result;
  return context.next();
};
