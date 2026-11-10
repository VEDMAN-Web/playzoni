// Reads a provider feed from a web address or from a saved file (JSON only).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './paths';

const FEED_TIMEOUT_MS = 30_000;
const FEED_RETRIES = 2;
const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

export const isWebAddress = (location: string): boolean => /^https?:\/\//i.test(location);

async function fetchJson(address: string, retryDelayMs: number): Promise<unknown> {
  let lastError: unknown = new Error('no attempt made');
  for (let attempt = 0; attempt <= FEED_RETRIES; attempt++) {
    try {
      const response = await fetch(address, { signal: AbortSignal.timeout(FEED_TIMEOUT_MS) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as unknown;
    } catch (error) {
      lastError = error;
      if (attempt < FEED_RETRIES) await sleep(retryDelayMs);
    }
  }
  // The address can hold a key, so only its host and path are shown.
  const url = new URL(address);
  throw new Error(`could not read the feed from ${url.host}${url.pathname}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

// "https://..." is downloaded (30 s timeout, 2 retries); anything else is a file path from the repo folder.
export async function readJsonSource(location: string, retryDelayMs = 1000): Promise<unknown> {
  if (isWebAddress(location)) return fetchJson(location, retryDelayMs);
  const file = resolve(REPO_ROOT, location);
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`could not read the feed file ${file}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}
