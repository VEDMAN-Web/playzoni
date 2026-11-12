// Tile load-in (docs/DESIGN.md §V2.2): tiles that start below the fold are hidden, then fade and rise in
// (220 ms) as they scroll into view, 15 ms apart, at most 300 ms of delay. One IntersectionObserver.
// Tiles already on screen are never touched, so nothing flashes, and with JavaScript off or
// prefers-reduced-motion nothing is hidden at all.

const STAGGER_MS = 15;
const MAX_DELAY_MS = 300;

export function startTileMotion(): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const below = Array.from(document.querySelectorAll<HTMLElement>('.cell, .row-item')).filter(
    (el) => el.getBoundingClientRect().top > window.innerHeight,
  );
  if (below.length === 0) return;
  for (const el of below) el.classList.add('reveal-pre');

  const observer = new IntersectionObserver(
    (entries) => {
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        el.style.setProperty('--reveal-delay', `${Math.min(order * STAGGER_MS, MAX_DELAY_MS)}ms`);
        order++;
        void el.offsetWidth; // flush the hidden state first, so the change below is animated (no animation-frame dependency)
        el.classList.add('reveal-go');
        el.addEventListener(
          'transitionend',
          () => {
            el.classList.remove('reveal-pre', 'reveal-go');
            el.style.removeProperty('--reveal-delay');
          },
          { once: true },
        );
      }
    },
    { rootMargin: '0px 0px -24px 0px' },
  );
  for (const el of below) observer.observe(el);
}
