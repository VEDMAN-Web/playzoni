// Small helpers shared by the adapter tests (collects failures, prints one result line).

export const failures: string[] = [];

export const same = (actual: unknown, wanted: unknown, message: string): void => {
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) failures.push(`${message}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
};

export const expect = (ok: boolean, message: string): void => {
  if (!ok) failures.push(message);
};

// Prints "<name>: ok", or every failure and exits 1.
export function finish(name: string): void {
  if (failures.length > 0) {
    for (const failure of failures) console.error(`${name}: FAIL: ${failure}`);
    process.exit(1);
  }
  console.log(`${name}: ok`);
}
