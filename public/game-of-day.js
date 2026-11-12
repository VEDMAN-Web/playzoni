// T9.5 (loaded right after the home mosaic; a file, not an inline script, because the CSP blocks inline scripts):
// the page was built on one day; show today's Game of the day (UTC) in the same tile. If today's game is
// elsewhere in the mosaic, the two tiles trade games, so nothing is shown twice and nothing moves.
(function () {
  try {
    const data = document.getElementById('pz-god');
    const tile = document.querySelector('main .grid-mosaic a.tile[data-pill]');
    if (!data || !tile) return;
    const d = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 86400000);
    const pick = JSON.parse(data.textContent).find(function (p) { return p.d === d; });
    if (!pick || pick.slug === tile.dataset.slug) return;
    const other = document.querySelector('main .grid-mosaic a.tile[data-slug="' + pick.slug + '"]');
    const put = function (a, slug, title) {
      const old = a.dataset.slug;
      a.href = '/game/' + slug;
      a.dataset.slug = slug;
      const img = a.querySelector('img');
      ['src', 'srcset'].forEach(function (k) {
        const v = img.getAttribute(k);
        if (v) img.setAttribute(k, v.split('/thumbs/' + old + '/').join('/thumbs/' + slug + '/'));
      });
      const name = a.querySelector('.overlay-text');
      if (name) name.textContent = title;
      const badge = a.querySelector('.badge');
      if (badge) badge.remove();
    };
    const oldSlug = tile.dataset.slug;
    const oldTitle = (tile.querySelector('.overlay-text') || {}).textContent || '';
    put(tile, pick.slug, pick.title);
    if (other) put(other, oldSlug, oldTitle);
  } catch {
    /* keep the build-day pick */
  }
})();
