// R50 (owner, 12 Nov 2026: "the save button always goes at the top"): one Save button in the sticky top bar for every
// admin screen that saves. The screen's own Save buttons stay in the page (their code does the saving) but are hidden;
// the top button runs them. Only changed sections are saved: a section is "changed" after an input/change inside it,
// or when a screen without form fields (Home feed) dispatches DIRTY_EVENT. A dot shows while there are unsaved changes.
import { el } from './render';

export const DIRTY_EVENT = 'adm:dirty';

const isSave = (b: HTMLButtonElement): boolean => b.classList.contains('adm-btn-primary') && /^\s*save\b/i.test(b.textContent ?? '');

export function startTopSave(): void {
  const main = document.querySelector<HTMLElement>('#adm-main');
  const top = document.querySelector<HTMLElement>('.adm-top');
  if (!main || !top) return;

  const dot = el('span', { class: 'adm-dirty-dot', 'aria-hidden': 'true', hidden: true });
  const label = el('span', {}, 'Save');
  const button = el('button', { class: 'adm-btn adm-btn-primary adm-top-save', type: 'button', hidden: true, disabled: true }, dot, label);
  const note = el('span', { class: 'adm-top-save-note', role: 'status', 'aria-live': 'polite' });
  const anchor = top.querySelector('.adm-user') ?? null;
  top.insertBefore(note, anchor);
  top.insertBefore(button, anchor);

  const dirty = new Set<HTMLButtonElement>();
  let saves: HTMLButtonElement[] = [];

  // The page's own Save button that belongs to an element: the one in the same form, else the only one on the page.
  const saveFor = (node: Element | null): HTMLButtonElement | undefined => {
    const form = node?.closest('form');
    if (form) return saves.find((b) => b.form === form || form.contains(b));
    return saves.length === 1 ? saves[0] : saves.find((b) => !b.form);
  };

  const refresh = (): void => {
    const ready = [...dirty].filter((b) => b.isConnected && !b.disabled);
    button.disabled = ready.length === 0;
    dot.hidden = ready.length === 0;
    if (ready.length) note.textContent = 'Unsaved changes';
  };

  const scan = (): void => {
    saves = [...main.querySelectorAll<HTMLButtonElement>('button')].filter(isSave);
    for (const b of saves) b.classList.add('adm-save-moved');
    for (const b of [...dirty]) if (!b.isConnected) dirty.delete(b);
    button.hidden = saves.length === 0;
    const names = new Set(saves.map((b) => (b.textContent ?? '').trim()));
    label.textContent = names.size === 1 ? [...names][0] : 'Save';
    refresh();
  };

  const markDirty = (target: EventTarget | null): void => {
    // Search boxes, language pickers and other view-only inputs (data-no-dirty) do not count as changes.
    if (target instanceof Element && (target.matches('input[type="search"]') || target.closest('[data-no-dirty]'))) return;
    const b = saveFor(target instanceof Element ? target : null);
    if (!b) return;
    dirty.add(b);
    refresh();
  };
  main.addEventListener('input', (e) => markDirty(e.target));
  main.addEventListener('change', (e) => markDirty(e.target));
  main.addEventListener(DIRTY_EVENT, (e) => markDirty(e.target));

  button.addEventListener('click', () => {
    const ready = [...dirty].filter((b) => b.isConnected && !b.disabled);
    if (!ready.length) return;
    label.textContent = 'Saving…';
    note.textContent = '';
    button.disabled = true;
    const errorsBefore = main.querySelectorAll('.adm-error-text').length;
    for (const b of ready) {
      if (b.form) b.form.requestSubmit(b);
      else b.click();
      dirty.delete(b);
    }
    // The screens show their own result next to the form; report it here too once it appears.
    window.setTimeout(() => {
      const failed = main.querySelectorAll('.adm-error-text').length > errorsBefore;
      scan();
      note.textContent = failed ? 'Not saved: check the errors' : 'Saved';
      note.classList.toggle('is-error', failed);
    }, 1500);
  });

  // Screens render after their data loads and some open forms later (category edit), so keep watching.
  new MutationObserver(() => scan()).observe(main, { childList: true, subtree: true });
  window.addEventListener('beforeunload', (e) => {
    if ([...dirty].some((b) => b.isConnected)) e.preventDefault();
  });
  scan();
}
