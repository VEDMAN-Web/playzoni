// Scheduled Worker "playzoni-rollup" (docs/ADMIN.md §4, docs/ADMIN-SETUP.md). Two schedules in wrangler.toml:
// every hour at minute 7 rebuilds today's rollups; every night at 00:20 UTC rebuilds yesterday + today, the retention
// cohorts, and deletes raw events older than 90 days. It uses the same D1 database ("DB") as the site.
import { runRollup } from '../../functions/api/_lib/rollup';
import type { D1Database } from '../../functions/api/_lib/types';

interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

export default {
  async scheduled(event: ScheduledEvent, env: { DB: D1Database }, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    const mode = event.cron === '20 0 * * *' ? 'nightly' : 'hourly';
    ctx.waitUntil(runRollup(env.DB, mode, event.scheduledTime));
  },
};
