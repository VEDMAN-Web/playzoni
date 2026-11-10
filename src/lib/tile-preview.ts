// Hover preview on desktop (docs/DESIGN.md §V2.8), one delegated listener for every tile.
//   - tile has a preview video: load it only on hover, play muted and looped, remove it on leave
//   - else it has screenshots: cross-fade through them every 900 ms while hovered
//   - else nothing to do here: the CSS in GameTile.astro does the slow zoom
// If the video or a screenshot fails to load, the tile falls back to the next option (finally the zoom).
// Off for touch devices and with prefers-reduced-motion.
import { parseScreenshots, previewPlan, SCREENSHOT_STEP_MS } from './preview';

interface Running {
  tile: HTMLElement;
  stop: () => void;
}

function newImage(src: string): HTMLImageElement {
  const img = document.createElement('img');
  img.className = 'pv';
  img.alt = '';
  img.decoding = 'async';
  img.src = src;
  return img;
}

function startScreenshots(tile: HTMLElement, shots: string[], onFail: () => void): () => void {
  const frames = shots.map((src) => {
    const img = newImage(src);
    img.addEventListener('error', onFail, { once: true });
    tile.appendChild(img);
    return img;
  });
  let index = 0;
  frames[0]?.classList.add('is-on');
  const timer = window.setInterval(() => {
    if (frames.length < 2) return;
    frames[index]?.classList.remove('is-on');
    index = (index + 1) % frames.length;
    frames[index]?.classList.add('is-on');
  }, SCREENSHOT_STEP_MS);
  return () => {
    window.clearInterval(timer);
    for (const f of frames) f.remove();
  };
}

// Starts the preview for one tile. Returns a stop function, or null when the tile only needs the CSS zoom.
function startPreview(tile: HTMLElement): (() => void) | null {
  const plan = previewPlan(tile.dataset.previewVideo, parseScreenshots(tile.dataset.screenshots));
  if (plan.kind === 'zoom') return null;

  let stopMedia: () => void = () => {};
  let stopped = false;
  const zoom = (): void => {
    if (!stopped) tile.classList.add('zoom');
  };
  const useScreenshots = (): void => {
    stopMedia();
    stopMedia = () => {};
    const list = plan.screenshots;
    if (list.length === 0) {
      zoom();
      return;
    }
    stopMedia = startScreenshots(tile, list, () => {
      stopMedia();
      stopMedia = () => {};
      zoom();
    });
  };

  if (plan.kind === 'video') {
    const video = document.createElement('video');
    video.className = 'pv';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.src = plan.src;
    video.addEventListener('error', useScreenshots, { once: true });
    video.addEventListener('playing', () => video.classList.add('is-on'), { once: true });
    tile.appendChild(video);
    void video.play().catch(useScreenshots);
    stopMedia = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    };
  } else {
    useScreenshots();
  }
  return () => {
    stopped = true;
    stopMedia();
    tile.classList.remove('zoom');
  };
}

export function startTilePreview(): void {
  if (typeof window === 'undefined') return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let running: Running | null = null;
  const stopCurrent = (): void => {
    running?.stop();
    running = null;
  };

  document.addEventListener('mouseover', (event) => {
    const tile = (event.target as Element | null)?.closest<HTMLElement>('a.tile[data-slug]');
    if (!tile || running?.tile === tile) return;
    stopCurrent();
    const stop = startPreview(tile);
    if (stop) running = { tile, stop };
  });
  document.addEventListener('mouseout', (event) => {
    if (!running) return;
    const next = (event as MouseEvent).relatedTarget as Node | null;
    if (next && running.tile.contains(next)) return;
    stopCurrent();
  });
}
