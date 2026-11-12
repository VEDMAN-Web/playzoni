// T9.1: "install as an app" support. No UI here (T9.2 adds the offer). Chrome and Edge fire `beforeinstallprompt`;
// we keep that event so a later button can show the browser's own install box. Safari on iPhone/iPad never fires it
// (people use Share > Add to Home Screen), so isIos() lets the UI explain that instead. Nothing is sent anywhere.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KEY = 'pz-install';
let deferred: InstallPromptEvent | null = null;

const store = (value: string): void => {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* private mode: the browser still knows the app is installed */
  }
};

export function startInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    store('installed');
  });
}

export const canInstall = (): boolean => deferred !== null;

export const isIos = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function isInstalled(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  try {
    return localStorage.getItem(KEY) === 'installed';
  } catch {
    return false;
  }
}

/** Shows the browser's install box. Resolves true when the visitor accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') store('installed');
  return outcome === 'accepted';
}
