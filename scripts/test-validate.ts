// Self-test for the content validator (T3.3): a good sample passes, a deliberately broken copy of
// a sample game fails with the right messages. Runs as part of `npm run validate`.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateContent, type ContentPaths } from './validate/content';

const root = join(import.meta.dirname, '..');
const tmp = mkdtempSync(join(tmpdir(), 'playzoni-validate-'));
const gamesDir = join(tmp, 'games');
const paths: ContentPaths = {
  root: tmp,
  gamesDir,
  categoryTextDir: join(tmp, 'category-text'),
  categoriesJson: join(tmp, 'categories.json'),
  qaDir: join(tmp, 'qa'),
  stagingDir: join(tmp, 'staging'),
};
mkdirSync(gamesDir);
cpSync(join(root, 'data', 'categories.json'), paths.categoriesJson);

const sample = readFileSync(join(root, 'src', 'content', 'games', 'sample-game-01.md'), 'utf8').replace(/\r\n/g, '\n');
const failures: string[] = [];
const expect = (ok: boolean, message: string): void => {
  if (!ok) failures.push(message);
};

try {
  // 1. An untouched sample must pass.
  writeFileSync(join(gamesDir, 'sample-game-01.md'), sample);
  const clean = validateContent(paths);
  expect(clean.length === 0, `an untouched sample should pass, got: ${clean.join(' | ')}`);

  // 2. A broken copy (different file name, short description, one-sentence intro, banned word,
  //    unknown category, missing section) must fail with each matching rule.
  const broken = sample
    .replace(/^description: .*$/m, 'description: "Too short."')
    .replace(/^intro: .*$/m, 'intro: "One sentence only."')
    .replace(/^categories:[\s\S]*?(?=^[a-z]+:)/m, 'categories:\n  - not-a-real-category\n')
    .replace('## Tips for', '## Hints for')
    .concat('\nThis is better than Poki.\n');
  writeFileSync(join(gamesDir, 'sample-game-99.md'), broken);
  const found = validateContent(paths).filter((e) => e.startsWith('games/sample-game-99.md:'));
  for (const rule of ['slug-mismatch', 'description-length', 'intro-sentences', 'unknown-category', 'missing-section', 'banned-word']) {
    expect(found.some((e) => e.includes(`: ${rule}:`)), `broken copy should report ${rule}, got: ${found.join(' | ')}`);
  }

  // 3. A real (non-sample) game with no play-test file and a short body must fail QA and word count.
  writeFileSync(join(gamesDir, 'sample-game-99.md'), sample.replace(/^sample: .*\n/m, '').replace(/^slug: .*$/m, 'slug: "sample-game-99"'));
  const real = validateContent(paths).filter((e) => e.startsWith('games/sample-game-99.md:'));
  for (const rule of ['qa-missing', 'word-count']) {
    expect(real.some((e) => e.includes(`: ${rule}:`)), `non-sample game should report ${rule}, got: ${real.join(' | ')}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const f of failures) console.error(`test-validate: FAIL: ${f}`);
  process.exit(1);
}
console.log('test-validate: ok');
