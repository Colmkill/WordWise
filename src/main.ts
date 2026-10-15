import './style.css';
import { LEVELS } from './levels';
import { validateLevels } from './core/validate';
import type { Level } from './types';
import { startLevel, attemptGrouping, advanceLevel, requestHint } from './core/game-state';
import type { GameState } from './core/game-state';
import { Board, type AttemptResult } from './ui/board';
import { loadSettings, saveSettings, showModal, type Settings } from './ui/menus';
import { CATEGORY_REVEAL_MS, LEVEL_COMPLETE_PAUSE_MS } from './config';

// Validate all level data before play (fails fast in dev).
validateLevels(LEVELS);

const app = document.querySelector<HTMLElement>('#app')!;

app.innerHTML = `
  <header class="topbar">
    <span id="hud-level">Level 1</span>
    <span id="hud-topics">Topics: 0</span>
    <span id="hud-mistakes">Mistakes: 0/3</span>
    <span id="hud-lives">Lives: ♥♥♥</span>
    <button id="btn-hint" class="btn">Hint</button>
    <button id="btn-menu" class="btn">Menu</button>
  </header>
  <main id="board" aria-label="Word bubbles play area"></main>
`;

const boardEl = document.querySelector<HTMLElement>('#board')!;
const hudLevel = document.querySelector<HTMLElement>('#hud-level')!;
const hudTopics = document.querySelector<HTMLElement>('#hud-topics')!;
const hudMistakes = document.querySelector<HTMLElement>('#hud-mistakes')!;
const hudLives = document.querySelector<HTMLElement>('#hud-lives')!;
const hintBtn = document.querySelector<HTMLButtonElement>('#btn-hint')!;
const menuBtn = document.querySelector<HTMLButtonElement>('#btn-menu')!;

// --- Game state ------------------------------------------------------------

let levelIndex = 0;
let state: GameState = startLevel(LEVELS[levelIndex]);
let advancing = false;
let hintSelecting = false;
let revealing = new Set<number>();
let settings: Settings = loadSettings();

const currentLevel = (): Level => LEVELS[levelIndex];

function updateHud(s: GameState) {
  const level = currentLevel();
  hudLevel.textContent = `Level ${s.levelId}`;
  const remaining = level.topics.length - s.completedTopics.length;
  hudTopics.textContent = `Topics: ${remaining}`;
  hudMistakes.textContent = `Mistakes: ${s.mistakes}/${s.mistakeThreshold}`;
  hudLives.textContent = `Lives: ${'♥'.repeat(s.lives)}${'♡'.repeat(Math.max(0, 3 - s.lives))}`;
  const hintAvailable =
    s.status === 'playing' &&
    level.topics.some((t) => !s.completedTopics.includes(t.id) && !s.hintsUsed.includes(t.id));
  hintBtn.disabled = !hintAvailable;
  hintBtn.textContent = hintSelecting ? 'Cancel' : 'Hint';
}

function render() {
  board.render(state, revealing);
  updateHud(state);
}

// --- Board wiring ----------------------------------------------------------

const board = new Board(boardEl);
board.onRender = updateHud;

board.onAttempt = async (a: number, b: number): Promise<AttemptResult> => {
  const outcome = attemptGrouping(state, currentLevel(), a, b);
  const prevState = state;
  state = outcome.state;

  if (outcome.kind === 'correct') {
    const prevRemaining = prevState.completedTopics.length;
    const newRemaining = state.completedTopics.length;
    if (newRemaining > prevRemaining) {
      // A topic completed: the merged bubble left the state, but its DOM
      // element still exists. Find it in the PREVIOUS state (not the new one).
      const completedTopicId = state.completedTopics[newRemaining - 1];
      const topic = currentLevel().topics.find((t) => t.id === completedTopicId)!;
      const merged = prevState.bubbles.find((bb) => bb.topicId === completedTopicId)!;
      if (!revealing.has(merged.id)) {
        revealing.add(merged.id);
        // Update the HUD only; a full render would remove the revealing bubble.
        updateHud(state);
        board.revealCategory(merged.id, topic.category, CATEGORY_REVEAL_MS).finally(() => {
          revealing.delete(merged.id);
          render();
          checkLevelComplete();
        });
      }
    } else {
      setTimeout(render, 0);
    }
    if (state.status === 'gameOver') {
      setTimeout(showGameOver, 700);
    }
    return 'correct';
  }

  if (outcome.kind === 'incorrect') {
    if (state.status === 'gameOver') {
      setTimeout(showGameOver, 700);
    } else {
      setTimeout(render, 0);
    }
    return 'incorrect';
  }

  return 'invalid';
};

function checkLevelComplete() {
  if (state.status !== 'levelComplete' || advancing) return;
  advancing = true;
  setTimeout(() => {
    advancing = false;
    const next = advanceLevel(state, LEVELS);
    if (next.status === 'runComplete') {
      showRunComplete();
      return;
    }
    board.invalidatePending();
    state = next;
    levelIndex = LEVELS.findIndex((l) => l.id === state.levelId);
    celebrate();
    render();
  }, LEVEL_COMPLETE_PAUSE_MS);
}

function celebrate() {
  const el = document.createElement('div');
  el.className = 'celebration';
  const completedNumber = state.levelId > 1 ? state.levelId - 1 : 1;
  el.textContent = `Level ${completedNumber} Complete! 🎉`;
  app.appendChild(el);
  setTimeout(() => el.remove(), LEVEL_COMPLETE_PAUSE_MS);
}

// --- Hints -----------------------------------------------------------------

hintBtn.addEventListener('click', () => {
  if (paused) return;
  hintSelecting = !hintSelecting;
  board.setHintMode(hintSelecting);
  updateHud(state);
});

board.onHintSelect = (bubbleId: number) => {
  if (!hintSelecting) return;
  hintSelecting = false;
  board.setHintMode(false);
  const outcome = requestHint(state, currentLevel(), bubbleId);
  state = outcome.state;
  if (outcome.hint) {
    board.showHint(bubbleId, outcome.hint);
  }
  updateHud(state);
};

boardEl.addEventListener('pointerdown', (e) => {
  if (hintSelecting && (e.target as HTMLElement) === boardEl) {
    hintSelecting = false;
    board.setHintMode(false);
    updateHud(state);
  }
});

// --- Pause, gameplay menu, focus loss ---------------------------------------

let paused = false;

function setPaused(next: boolean) {
  if (paused === next) return;
  paused = next;
  board.setPaused(next);
  if (next) {
    board.hideHint();
    if (hintSelecting) {
      hintSelecting = false;
      board.setHintMode(false);
      updateHud(state);
    }
  }
}

/** The gameplay menu contents. Assumes the game is already paused. */
function showGameMenu() {
  const overlay = showModal('');
  menuView(overlay);
}

/** Render the main menu buttons into an overlay and bind handlers. */
function menuView(overlay: HTMLElement) {
  overlay.innerHTML = `
    <div class="panel">
      <h2>Menu</h2>
      <div class="menu-buttons">
        <button class="btn" id="m-settings">Settings</button>
        <button class="btn" id="m-restart">Restart Level</button>
        <button class="btn" id="m-main">Main Menu</button>
        <button class="btn" id="m-close">Close</button>
      </div>
    </div>
  `;

  overlay.querySelector('#m-close')!.addEventListener('click', () => {
    overlay.remove();
    setPaused(false);
  });

  overlay.querySelector('#m-settings')!.addEventListener('click', () => {
    settingsView(overlay);
  });

  overlay.querySelector('#m-restart')!.addEventListener('click', () => {
    confirmView(
      overlay,
      'Restart Level?',
      'Current-level progress will be lost. The level restarts with a fresh arrangement.',
      'Restart',
      () => {
        overlay.remove();
        board.invalidatePending();
        state = startLevel(currentLevel(), state.lives);
        render();
        setPaused(false);
      }
    );
  });

  overlay.querySelector('#m-main')!.addEventListener('click', () => {
    confirmView(
      overlay,
      'Return to Menu?',
      'Unfinished level progress will be lost. The level will restart with a fresh arrangement if played again.',
      'Return to Menu',
      () => {
        overlay.remove();
        // The main menu arrives in Phase 6b; for now start a fresh run.
        board.invalidatePending();
        levelIndex = 0;
        state = startLevel(LEVELS[0]);
        render();
        setPaused(false);
      }
    );
  });
}

/** Render the settings panel into an existing overlay. */
function settingsView(overlay: HTMLElement) {
  overlay.innerHTML = `
    <div class="panel">
      <h2>Settings</h2>
      <label class="setting"><input type="checkbox" id="s-sound" ${settings.sound ? 'checked' : ''}/> Sound</label>
      <label class="setting"><input type="checkbox" id="s-motion" ${settings.reducedMotion ? 'checked' : ''}/> Reduced motion</label>
      <div class="menu-buttons"><button class="btn" id="s-back">Back</button></div>
    </div>
  `;
  overlay.querySelector('#s-sound')!.addEventListener('change', (e) => {
    settings = { ...settings, sound: (e.target as HTMLInputElement).checked };
    saveSettings(settings);
  });
  overlay.querySelector('#s-motion')!.addEventListener('change', (e) => {
    settings = { ...settings, reducedMotion: (e.target as HTMLInputElement).checked };
    saveSettings(settings);
  });
  overlay.querySelector('#s-back')!.addEventListener('click', () => menuView(overlay));
}

/** Render a confirmation panel into an existing overlay. */
function confirmView(
  overlay: HTMLElement,
  title: string,
  body: string,
  confirmLabel: string,
  onConfirm: () => void
) {
  overlay.innerHTML = `
    <div class="panel">
      <h2>${title}</h2>
      <p>${body}</p>
      <div class="menu-buttons">
        <button class="btn" id="c-yes">${confirmLabel}</button>
        <button class="btn" id="c-no">Cancel</button>
      </div>
    </div>
  `;
  overlay.querySelector('#c-no')!.addEventListener('click', () => menuView(overlay));
  overlay.querySelector('#c-yes')!.addEventListener('click', onConfirm);
}

/** Open the gameplay menu from the top bar. */
function openGameMenu() {
  if (paused) return; // already paused by a menu or focus loss
  setPaused(true);
  showGameMenu();
}

menuBtn.addEventListener('click', openGameMenu);

/** Focus loss: pause and require an explicit Resume. */
function pauseForFocusLoss() {
  if (paused) return;
  setPaused(true);
  const overlay = showModal(`
    <h2>Paused</h2>
    <div class="menu-buttons"><button class="btn" id="p-resume">Resume</button></div>
  `);
  overlay.querySelector('#p-resume')!.addEventListener('click', () => {
    overlay.remove();
    setPaused(false);
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseForFocusLoss();
});
window.addEventListener('blur', () => pauseForFocusLoss());

// --- End states ------------------------------------------------------------

function showGameOver() {
  const overlay = showModal(`
    <h2>Game Over</h2>
    <div class="menu-buttons"><button class="btn" id="btn-new-run">New Run</button></div>
  `);
  overlay.querySelector('#btn-new-run')!.addEventListener('click', () => {
    overlay.remove();
    board.invalidatePending();
    levelIndex = 0;
    state = startLevel(LEVELS[0]);
    render();
  });
}

function showRunComplete() {
  const overlay = showModal(`
    <h2>All levels complete!</h2>
    <div class="menu-buttons"><button class="btn" id="btn-again">Play Again</button></div>
  `);
  overlay.querySelector('#btn-again')!.addEventListener('click', () => {
    overlay.remove();
    board.invalidatePending();
    levelIndex = 0;
    state = startLevel(LEVELS[0]);
    render();
  });
}

render();
