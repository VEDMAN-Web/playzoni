// Content validator (T3.3). Runs before the build (`npm run validate`) and fails it on any problem.
// Checks of the built pages (titles, one H1, banned words, links) are in scripts/validate-dist.ts.
import { join } from 'node:path';
import { validateContent } from './validate/content';

const root = join(import.meta.dirname, '..');
const errors = validateContent({
  root,
  gamesDir: join(root, 'src', 'content', 'games'),
  categoryTextDir: join(root, 'src', 'content', 'categories'),
  categoriesJson: join(root, 'data', 'categories.json'),
  qaDir: join(root, 'data', 'qa'),
  stagingDir: join(root, 'data', 'staging'),
});

if (errors.length > 0) {
  for (const line of errors) console.error(line);
  console.error(`validate: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log('validate: ok');
