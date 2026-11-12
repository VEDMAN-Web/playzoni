// Self-test for the draft preview (T4.6): which games the site reads, the build guard, and the CSV reader.
// Pure functions only; nothing in the repo changes.

import { filterPublishedGames } from '../src/lib/games-core';
import { draftBuildProblem } from './guard-drafts';
import { columnValues, parseCsv } from './import/csv';
import { expect, finish, same } from './test-kit';

type Entry = { data: { status: 'draft' | 'published'; sample: boolean; slug: string } };
const entries: Entry[] = [
  { data: { status: 'published', sample: false, slug: 'live' } },
  { data: { status: 'draft', sample: false, slug: 'draft' } },
  { data: { status: 'published', sample: true, slug: 'sample-live' } },
  { data: { status: 'draft', sample: true, slug: 'sample-draft' } },
];
const slugs = (list: Entry[]): string[] => list.map((e) => e.data.slug);

function testFilter(): void {
  same(slugs(filterPublishedGames(entries, false)), ['live'], 'normal build: published, no samples');
  same(slugs(filterPublishedGames(entries, true)), ['live', 'sample-live'], 'sample build: published samples too');
  same(slugs(filterPublishedGames(entries, false, true)), ['live', 'draft'], 'draft preview: drafts included, samples still out');
  same(slugs(filterPublishedGames(entries, true, true)), ['live', 'draft', 'sample-live', 'sample-draft'], 'draft preview with samples: everything');
  same(slugs(filterPublishedGames(entries, false, false)), ['live'], 'drafts stay out unless asked for');
}

function testGuard(): void {
  same(draftBuildProblem({}), null, 'no flag: build goes on');
  same(draftBuildProblem({ PUBLIC_INCLUDE_DRAFTS: 'false', CF_PAGES_BRANCH: 'main' }), null, 'flag off on main: fine');
  same(draftBuildProblem({ PUBLIC_INCLUDE_DRAFTS: 'true', CF_PAGES_BRANCH: 'dev' }), null, 'drafts on the dev branch: fine');
  same(draftBuildProblem({ PUBLIC_INCLUDE_DRAFTS: 'true' }), null, 'drafts on locally: fine');
  expect(draftBuildProblem({ PUBLIC_INCLUDE_DRAFTS: 'true', CF_PAGES_BRANCH: 'main' }) !== null, 'drafts on main are refused');
}

function testCsv(): void {
  same(parseCsv('a,b\r\n1,"x, y"\r\n2,"say ""hi"""\n'), [['a', 'b'], ['1', 'x, y'], ['2', 'say "hi"']], 'quotes, commas and CRLF');
  same(parseCsv('a,b\n"line\nbreak",2\n'), [['a', 'b'], ['line\nbreak', '2']], 'a line break inside quotes stays in the field');
  same(columnValues('order,slug,title\n1,zorp,"Zorp, Blaster"\n2,,blank\n3,fish,Fish\n', 'slug'), ['zorp', 'fish'], 'slug column, blanks skipped');
  let threw = false;
  try {
    columnValues('order,title\n1,x\n', 'slug');
  } catch {
    threw = true;
  }
  expect(threw, 'a missing column is reported');
  let open = false;
  try {
    parseCsv('a,"open\n');
  } catch {
    open = true;
  }
  expect(open, 'an unclosed quote is reported');
}

function main(): void {
  testFilter();
  testGuard();
  testCsv();
  finish('test-drafts');
}

main();
