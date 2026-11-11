// Self-test for the QA notes schema, the QA guide example and `npm run qa:new` (T5.1).
// The example in docs/QA-GUIDE.md must stay valid; the template must stay blank.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createQaFile } from './qa/new';
import { qaProblems, QaNotesSchema } from './qa/schema';
import { expect, finish, same } from './test-kit';

const ROOT = join(import.meta.dirname, '..');
const guide = readFileSync(join(ROOT, 'docs', 'QA-GUIDE.md'), 'utf8');
const example = /```json\r?\n([\s\S]*?)\r?\n```/.exec(guide)?.[1];
expect(example !== undefined, 'the guide has a json example');

function valid(): Record<string, unknown> {
  return JSON.parse(example ?? '{}') as Record<string, unknown>;
}

function testSchema(): void {
  same(qaProblems(valid()), [], 'the guide example is valid');
  expect(QaNotesSchema.safeParse(valid()).success, 'the example passes the zod schema');

  const bad = (change: Record<string, unknown>): string[] => qaProblems({ ...valid(), ...change });
  expect(bad({ tips: ['one', 'two'] }).some((p) => p.startsWith('tips:')), 'two tips is too few');
  expect(bad({ threeFacts: ['a', 'b', 'c', 'd', 'e'] }).some((p) => p.startsWith('threeFacts:')), 'five facts is too many');
  expect(bad({ date: '12/11/2026' }).some((p) => p.startsWith('date:')), 'a date in another format is refused');
  expect(bad({ orientation: 'diagonal' }).some((p) => p.startsWith('orientation:')), 'an unknown orientation is refused');
  expect(bad({ loadSeconds: -1 }).some((p) => p.startsWith('loadSeconds:')), 'a negative load time is refused');
  expect(bad({ worksMobile: 'yes' }).some((p) => p.startsWith('worksMobile:')), 'a text yes instead of true is refused');
  expect(bad({ goal: '   ' }).some((p) => p.startsWith('goal:')), 'a blank goal is refused');
  expect(bad({ verdict: 'maybe' }).some((p) => p.startsWith('verdict:')), 'an unknown verdict is refused');
  expect(bad({ issues: 42 }).some((p) => p.startsWith('issues:')), 'issues must be text');
  const withoutIssues = valid();
  delete withoutIssues.issues;
  expect(qaProblems(withoutIssues).some((p) => p.startsWith('issues:')), 'a missing field is reported');

  const template = JSON.parse(readFileSync(join(ROOT, 'data', 'qa', '_template.json'), 'utf8')) as Record<string, unknown>;
  expect(qaProblems(template).length > 0, 'the blank template is not valid, so nobody publishes it by mistake');
  same(template.verdict, 'pending', 'the template verdict is pending');
}

function testNew(tmp: string): void {
  const qaDir = join(tmp, 'qa');
  mkdirSync(qaDir);
  writeFileSync(join(qaDir, '_template.json'), readFileSync(join(ROOT, 'data', 'qa', '_template.json'), 'utf8'));
  const file = createQaFile(qaDir, 'zorp-blaster');
  same(readFileSync(file, 'utf8'), readFileSync(join(ROOT, 'data', 'qa', '_template.json'), 'utf8'), 'qa:new copies the template');
  let threw = false;
  try {
    createQaFile(qaDir, 'zorp-blaster');
  } catch {
    threw = true;
  }
  expect(threw, 'qa:new does not overwrite an existing file');
  for (const bad of ['Zorp', '../x', 'a b', '']) {
    let refused = false;
    try {
      createQaFile(qaDir, bad);
    } catch {
      refused = true;
    }
    expect(refused, `qa:new refuses the slug "${bad}"`);
  }
}

function main(): void {
  const tmp = mkdtempSync(join(tmpdir(), 'playzoni-qa-test-'));
  try {
    testSchema();
    testNew(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  finish('test-qa');
}

main();
