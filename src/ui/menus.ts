/** Simple settings persisted to localStorage, with graceful failure. */

export interface Settings {
  sound: boolean;
  reducedMotion: boolean;
}

const KEY = 'wordwise.settings';

export function loadSettings(): Settings {
  const defaults: Settings = { sound: true, reducedMotion: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : defaults.sound,
      reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : defaults.reducedMotion
    };
  } catch {
    return defaults;
  }
}

/** Returns false when storage is unavailable (play must continue regardless). */
export function saveSettings(settings: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** A small modal helper: returns the overlay element; caller wires buttons. */
export function showModal(html: string): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="panel">${html}</div>`;
  document.body.appendChild(overlay);
  return overlay;
}
