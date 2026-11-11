// Content and SEO screen (docs/ADMIN.md §5.10): pages per language, indexable or not, lengths and word counts, the
// validator's checks, last update. From the build data (/admin/data/content.json). Search Console: not connected (Q23).
import type { Cell } from '../../functions/api/_lib/screen';
import { staticJson } from './api';
import { el, errorBox, kpiCards, skeleton, tableNode } from './render';

export async function startContent(root: HTMLElement): Promise<void> {
  root.replaceChildren(skeleton(2));
  let pages: Record<string, Cell | boolean>[];
  try {
    pages = await staticJson<Record<string, Cell | boolean>[]>('content');
  } catch {
    root.replaceChildren(errorBox('Could not load the content data.', () => void startContent(root)));
    return;
  }
  const type = el('select', { 'aria-label': 'Page type' }, el('option', { value: '' }, 'All pages'), el('option', { value: 'game' }, 'Game pages'), el('option', { value: 'category' }, 'Category pages'));
  const only = el('select', { 'aria-label': 'Show' }, el('option', { value: '' }, 'Everything'), el('option', { value: 'index' }, 'Indexable only'), el('option', { value: 'fix' }, 'Needs work'));
  const box = el('div');
  let shown = 50;
  const more = el('button', { class: 'adm-btn', type: 'button' }, 'Show 50 more');
  more.addEventListener('click', () => ((shown += 50), draw()));
  const rows = (): Record<string, Cell>[] =>
    pages
      .filter((p) => !type.value || p.type === type.value)
      .filter((p) => (only.value === 'index' ? p.indexable === true : only.value === 'fix' ? p.checks !== 'ok' : true))
      .map((p) => ({ ...p, indexable: p.indexable ? 'yes' : 'no' }) as Record<string, Cell>);
  const draw = (): void => {
    box.replaceChildren(
      tableNode({
        id: 'content',
        title: 'Pages',
        columns: [
          { key: 'path', label: 'Page' },
          { key: 'type', label: 'Type' },
          { key: 'lang', label: 'Language' },
          { key: 'status', label: 'Status' },
          { key: 'indexable', label: 'Indexable' },
          { key: 'titleLength', label: 'Title length', fmt: 'int' },
          { key: 'descriptionLength', label: 'Description length', fmt: 'int' },
          { key: 'words', label: 'Words', fmt: 'int' },
          { key: 'faq', label: 'FAQ', fmt: 'int' },
          { key: 'checks', label: 'Checks' },
          { key: 'updated', label: 'Updated' },
        ],
        rows: rows().slice(0, shown),
        empty: 'No pages match.',
        note: 'Checks use the same rules as npm run validate. Drafts show how many checks still fail.',
      }),
    );
    if (rows().length > shown) box.append(more);
  };
  const count = (f: (p: Record<string, Cell | boolean>) => boolean): number => pages.filter(f).length;
  root.replaceChildren(
    kpiCards([
      { id: 'pages', label: 'Game and category pages', value: pages.length, fmt: 'int' },
      { id: 'indexable', label: 'Indexable', value: count((p) => p.indexable === true), fmt: 'int' },
      { id: 'ok', label: 'Passing all checks', value: count((p) => p.checks === 'ok'), fmt: 'int' },
      { id: 'languages', label: 'Languages', value: new Set(pages.map((p) => p.lang)).size, fmt: 'int' },
    ]),
    el(
      'section',
      { class: 'adm-card adm-section' },
      el('h2', { class: 'adm-card-title' }, 'Google Search Console'),
      el('p', { class: 'adm-hint' }, 'Not connected yet (question Q23). When the owner connects it, clicks, impressions and positions per page show here. Until then: no numbers.'),
    ),
    el('div', { class: 'adm-toolbar' }, type, only),
    box,
  );
  type.addEventListener('change', () => ((shown = 50), draw()));
  only.addEventListener('change', () => ((shown = 50), draw()));
  draw();
}
