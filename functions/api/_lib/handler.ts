// Wrapper for read-only analytics screens: role check (Analyst and up), date range, demo flag, JSON answer.
import { guard, type AdminUser } from './auth';
import { json } from './http';
import { isDemo, readRange, type Range } from './query';
import type { Screen } from './screen';
import type { D1Database, PagesContext } from './types';

export type ScreenBuilder = (db: D1Database, range: Range, url: URL, user: AdminUser) => Promise<Omit<Screen, 'demo' | 'range'>>;

export function screenHandler(build: ScreenBuilder): (context: PagesContext) => Promise<Response> {
  return async (context) => {
    const user = await guard(context, 'analyst');
    if (user instanceof Response) return user;
    const url = new URL(context.request.url);
    const range = readRange(url);
    const db = context.env.DB;
    const [demo, body] = await Promise.all([isDemo(db), build(db, range, url, user)]);
    const screen: Screen = {
      demo,
      range: { from: range.from, to: range.to, prevFrom: range.prevFrom, prevTo: range.prevTo, compare: range.compare },
      ...body,
    };
    return json(screen);
  };
}
