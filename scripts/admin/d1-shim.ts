// A small Cloudflare D1 stand-in on Node's built-in SQLite (node:sqlite), for tests and the local demo seed.
// Same calls as D1: prepare().bind().first()/all()/run(), batch(), exec(). No dependency.
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { D1Database, D1PreparedStatement, D1Result } from '../../functions/api/_lib/types';

// node:sqlite prints an "experimental" warning once; keep test output clean.
const emit = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const text = typeof warning === 'string' ? warning : warning.message;
  if (text.includes('SQLite')) return;
  (emit as (w: string | Error, ...r: unknown[]) => void)(warning, ...rest);
}) as typeof process.emitWarning;

interface SqliteStatement {
  all(...values: unknown[]): Record<string, unknown>[];
  get(...values: unknown[]): Record<string, unknown> | undefined;
  run(...values: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}
export interface SqliteDb {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  close(): void;
}

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => SqliteDb };

const ROOT = join(import.meta.dirname, '..', '..');

const toSql = (v: unknown): unknown => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

class Statement implements D1PreparedStatement {
  constructor(
    private readonly db: SqliteDb,
    readonly sql: string,
    readonly values: unknown[] = [],
  ) {}
  bind(...values: unknown[]): D1PreparedStatement {
    return new Statement(this.db, this.sql, values.map(toSql));
  }
  async first<T = Record<string, unknown>>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.values) as T | undefined) ?? null;
  }
  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return { results: this.db.prepare(this.sql).all(...this.values) as T[], success: true };
  }
  async run(): Promise<D1Result> {
    return this.runSync();
  }
  runSync(): D1Result {
    const r = this.db.prepare(this.sql).run(...this.values);
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export class D1Shim implements D1Database {
  constructor(readonly raw: SqliteDb) {}
  prepare(sql: string): D1PreparedStatement {
    return new Statement(this.raw, sql);
  }
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    this.raw.exec('BEGIN');
    try {
      const out = statements.map((s) => (s as Statement).runSync());
      this.raw.exec('COMMIT');
      return out;
    } catch (error) {
      this.raw.exec('ROLLBACK');
      throw error;
    }
  }
  async exec(sql: string): Promise<unknown> {
    this.raw.exec(sql);
    return {};
  }
}

export function migrationSql(): string {
  const dir = join(ROOT, 'migrations');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');
}

/** Opens a database file (or ':memory:') and applies every migration. */
export function openDb(path = ':memory:', migrate = true): D1Shim {
  const raw = new DatabaseSync(path);
  if (migrate) raw.exec(migrationSql());
  return new D1Shim(raw);
}
