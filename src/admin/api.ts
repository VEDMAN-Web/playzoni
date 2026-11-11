// Calls to the admin API (same origin, behind Cloudflare Access). Writes are POST with JSON (docs/ADMIN.md §7).

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly problems: string[] = [],
  ) {
    super(message);
  }
}

async function handle<T>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : response.status === 404
          ? 'This part of the admin is not available on the server yet (404).'
          : `The server answered ${response.status}.`;
    const problems =
      body && typeof body === 'object' && Array.isArray((body as { problems?: unknown }).problems)
        ? ((body as { problems: unknown[] }).problems.map(String))
        : [];
    throw new ApiError(response.status, message, problems);
  }
  return body as T;
}

export async function apiGet<T>(path: string, params: URLSearchParams | null = null): Promise<T> {
  const query = params && params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`/api/admin/${path}${query}`, { headers: { accept: 'application/json' }, credentials: 'same-origin' });
  return handle<T>(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  return handle<T>(response);
}

export interface Me {
  email: string;
  role: 'owner' | 'editor' | 'analyst';
  demo: boolean;
  github: boolean;
  onesignal: boolean;
  uploads: boolean;
}

let mePromise: Promise<Me> | null = null;
export function getMe(): Promise<Me> {
  mePromise ??= apiGet<Me>('me');
  return mePromise;
}

const RANK = { analyst: 1, editor: 2, owner: 3 } as const;
export const can = (me: Me, role: keyof typeof RANK): boolean => RANK[me.role] >= RANK[role];

/** Static build data (games, categories, content checks), served under /admin/data/ behind Access. */
export async function staticJson<T>(name: string): Promise<T> {
  const response = await fetch(`/admin/data/${name}.json`, { credentials: 'same-origin' });
  if (!response.ok) throw new ApiError(response.status, `Could not load ${name}.json`);
  return (await response.json()) as T;
}
