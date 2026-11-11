// Minimal Cloudflare runtime types used by the Pages Functions (no extra dependency: only what we call).

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta?: { changes?: number; last_row_id?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(sql: string): Promise<unknown>;
}

export interface R2Bucket {
  put(key: string, value: ArrayBuffer | ReadableStream | string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
}

export interface Env {
  DB: D1Database;
  UPLOADS?: R2Bucket;
  ASSETS?: { fetch(input: Request | string): Promise<Response> };
  /** "development" only in .dev.vars (local). Never set in the Cloudflare dashboard. */
  ENVIRONMENT?: string;
  /** Local-dev sign-in bypass; works only when ENVIRONMENT=development. */
  ADMIN_DEV_EMAIL?: string;
  /** Cloudflare Access team domain, for example "playzoni.cloudflareaccess.com". */
  ACCESS_TEAM_DOMAIN?: string;
  /** Cloudflare Access application audience tag (AUD). */
  ACCESS_AUD?: string;
  /** Comma-separated emails that are always Owner (so the first owner can get in before the team table has rows). */
  ADMIN_OWNER_EMAILS?: string;
  /** GitHub App (content commits). The private key is a secret. */
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  /** "owner/repo", default VEDMAN-Web/playzoni. */
  GITHUB_REPO?: string;
  /** OneSignal REST API key (secret) and app id, for push (T9.9 / T10.13). */
  ONESIGNAL_APP_ID?: string;
  ONESIGNAL_REST_API_KEY?: string;
}

/** Request properties Cloudflare adds (request.cf). The IP address is never part of this. */
export interface CfProps {
  country?: string;
  region?: string;
  regionCode?: string;
  asn?: number;
  botManagement?: { score?: number; verifiedBot?: boolean };
}

export interface PagesContext<Data = Record<string, unknown>> {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  data: Data;
  next(): Promise<Response>;
  waitUntil(promise: Promise<unknown>): void;
}

export type PagesFunction = (context: PagesContext) => Promise<Response> | Response;

export const cfOf = (request: Request): CfProps => (request as Request & { cf?: CfProps }).cf ?? {};
