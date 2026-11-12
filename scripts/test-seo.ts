// SEO rule checks (T1.3). Runs inside `npm run validate`.
// Run alone: npx tsx scripts/test-seo.ts

import {
  assertDescription,
  assertTitle,
  buildCategoryPageTitle,
  buildGameTitle,
  canonicalUrl,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
} from '../src/lib/seo';

let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.log(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

// Build a game title of an exact length so the three fallbacks can be checked.
function titleOfLength(length: number): string {
  return 'T'.repeat(length);
}

function throws(fn: () => void): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

// 1. Three title fallbacks: 20 chars → full form, 45 → short form, 70 → bare title.
const t20 = buildGameTitle(titleOfLength(20));
const t45 = buildGameTitle(titleOfLength(45));
const t70 = buildGameTitle(titleOfLength(70));
check('fallback 1 (20-char title keeps full form)', t20.endsWith(': Play Free Online | Playzoni') && t20.length <= TITLE_MAX, t20);
check('fallback 2 (45-char title uses short form)', t45.endsWith(' | Playzoni') && !t45.includes('Play Free Online') && t45.length <= TITLE_MAX, t45);
check('fallback 3 (70-char title falls back to bare title)', t70 === titleOfLength(70), t70);

// 2. Category and category-page titles.
const cat = buildCategoryPageTitle('Car Games', 2);
check('category page title', cat === 'Car Games, Page 2 | Playzoni', cat);

// 3. Canonical URLs: absolute, no trailing slash.
check('canonical has no trailing slash', canonicalUrl('/car-games') === 'https://playzoni.com/car-games');
check('canonical home is root', canonicalUrl('/') === 'https://playzoni.com/');
check('canonical rejects trailing slash', throws(() => canonicalUrl('/car-games/')));
check('canonical rejects relative path', throws(() => canonicalUrl('car-games')));

// 4. Length guards throw at build time.
check('title over 60 chars throws', throws(() => assertTitle(titleOfLength(TITLE_MAX + 1))));
check('title at 60 chars passes', !throws(() => assertTitle(titleOfLength(TITLE_MAX))));
check(
  `description under ${DESCRIPTION_MIN} throws`,
  throws(() => assertDescription('x'.repeat(DESCRIPTION_MIN - 1))),
);
check(
  `description over ${DESCRIPTION_MAX} throws`,
  throws(() => assertDescription('x'.repeat(DESCRIPTION_MAX + 1))),
);
check(
  `description ${DESCRIPTION_MIN} to ${DESCRIPTION_MAX} passes`,
  !throws(() => assertDescription('x'.repeat(130))),
);

if (failures > 0) {
  console.log(`test-seo: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-seo: ok');
