// Game detail (docs/ADMIN.md §5.4): title block from the build data. The edit form is added in T10.8.
import { staticJson } from './api';
import type { AdminGame } from './games';
import { el, errorBox } from './render';

export async function startGameHead(slug: string): Promise<void> {
  const head = document.querySelector<HTMLElement>('[data-game-head]');
  if (!head) return;
  try {
    const games = await staticJson<AdminGame[]>('games');
    const game = games.find((g) => g.slug === slug);
    if (!game) {
      head.replaceChildren(errorBox(`No game with the address "${slug}".`));
      return;
    }
    const title = document.querySelector('.adm-title');
    if (title) title.textContent = game.title;
    document.title = `${game.title} | Playzoni Admin`;
    head.replaceChildren(
      el(
        'div',
        { class: 'adm-cell-row' },
        el('img', { class: 'adm-thumb', src: `/thumbs/${slug}/s.webp`, width: '36', height: '36', alt: '' }),
        el('div', {}, el('p', { class: 'adm-card-title' }, game.title), el('p', { class: 'adm-status' }, `${game.status}, ${game.source}, QA: ${game.qa}, added ${game.addedDate}`)),
      ),
      el('div', { class: 'adm-form-actions' }, el('a', { class: 'adm-btn adm-btn-small', href: `/game/${slug}` }, 'Open on the site'), el('a', { class: 'adm-btn adm-btn-small', href: '/admin/games' }, 'All games')),
    );
  } catch {
    head.replaceChildren(errorBox('Could not load the game list.', () => location.reload()));
  }
}
