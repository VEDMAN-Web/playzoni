// Audit log (ADMIN §5.17): every admin write records who, when, what, and the value before and after.
import type { D1Database, D1PreparedStatement } from './types';

export function auditStatement(
  db: D1Database,
  email: string,
  action: string,
  target: string,
  before: unknown,
  after: unknown,
  now = Date.now(),
): D1PreparedStatement {
  const text = (v: unknown): string | null => (v === undefined ? null : JSON.stringify(v));
  return db
    .prepare('INSERT INTO audit_log (ts, email, action, target, before, after) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(now, email, action, target, text(before), text(after));
}

export async function audit(db: D1Database, email: string, action: string, target: string, before: unknown, after: unknown): Promise<void> {
  await auditStatement(db, email, action, target, before, after).run();
}
