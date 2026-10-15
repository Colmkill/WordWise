import './style.css';
import { LEVELS } from './levels';
import { validateLevels } from './core/validate';
import type { Level } from './types';
import { startLevel, attemptGrouping, advanceLevel, requestHint } from './core/game-state';
import type { GameState } from './core/game-state';
import { Board, type AttemptResult } from './ui/board';
import { CATEGORY_REVEAL_MS, LEVEL_COMPLETE_PAUSE_MS } from './config';

// Validate all level data before play (fails fast in dev).
validateLevels(LEVELS);

const app = document.querySelector<HTMLElement>('#app')!;

// --- Build the static page structure -------------------------------------

app.innerHTML = `
  <header class="topbar">
    <span id="hud-level">Level 1</span>
    <span id="hud-topics">Topics: 0</span>
    <span id="hud-mistakes">Mistakes: 0/3</span>
    <span id="hud-lives">Lives: ♥♥♥</span>
    <button id="btn-hint" class="btn">Hint</button>
    <button id="btn-menu" class="btn" disabled title="Coming in Phase 6">Menu</button>
  </header>
  <main id="board" aria-label="Word bubbles play area"></main>
`;

const boardEl = document.querySelector<HTMLElement>('#board')!;
const hudLevel = document.querySelector<HTMLElement>('#hud-level')!;
const hudTopics = document.querySelector<HTMLElement>('#hud-topics')!;
const hudMistakes = document.querySelector<HTMLElement>('#hud-mistakes')!;
const hudLives = document.querySelector<HTMLElement>('#hud-lives')!;
const hintBtn = document.querySelector<HTMLButtonElement>('#btn-hint')!;

// --- Game state ------------------------------------------------------------

let levelIndex = 0;
let state: GameState = startLevel(LEVELS[levelIndex]);
let advancing = false;
let hintSelecting = false;
/** Bubble ids whose topic completion is being revealed (awaited) */
let revealing = new Set<number>();

const currentLevel = (): Level => LEVELS[levelIndex];

function updateHud(s: GameState) {
  const level = currentLevel();
  hudLevel.textContent = `Level ${s.levelId}`;
  const remaining = level.topics.length - s.completedTopics.length;
  hudTopics.textContent = `Topics: ${remaining}`;
  hudMistakes.textContent = `Mistakes: ${s.mistakes}/${s.mistakeThreshold}`;
  hudLives.textContent = `Lives: ${'♥'.repeat(s.lives)}${'♡'.repeat(Math.max(0, 3 - s.lives))}`;
  // Hint button: any eligible topic left and play active.
  const hintAvailable =
    s.status === 'playing' &&
    level.topics.some((t) => !s.completedTopics.includes(t.id) && !s.hintsUsed.includes(t.id));
  hintBtn.disabled = !hintAvailable;
  hintBtn.textContent = hintSelecting ? 'Cancel' : 'Hint';
}

function render() {
  board.render(state);
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
    // Topic completed? Capture the completed topic before re-render removes it.
    const prevRemaining = prevState.completedTopics.length;
    const newRemaining = state.completedTopics.length;
    if (newRemaining > prevRemaining) {
      const completedTopicId = state.completedTopics[newRemaining - 1];
      const topic = currentLevel().topics.find((t) => t.id === completedTopicId)!;
      // The merged bubble that just completed: find it via the words.
      const mergedBubble = prevState.bubbles.find(
        (b) => b.topicId === completedTopicId && b.words.length > 1
      );
      const completedId =
        state.bubbles.find((b) => b.topicId === completedTopicId)?.id ??
        mergedBubble?.id;
      if (completedId != null && !revealing.has(completedId)) {
        revealing.add(completedId);
        // Re-render remaining bubbles now; the completed one stays for reveal.
        setTimeout(() => {
          render();
          board.revealCategory(completedId, topic.category, CATEGORY_REVEAL_MS).finally(() => {
            revealing.delete(completedId);
            checkLevelComplete();
          });
        }, 600); // after the green feedback flash
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
    state = next;
    levelIndex = LEVELS.findIndex((l) => l.id === state.levelId);
    celebrate();
    render();
  }, LEVEL_COMPLETE_PAUSE_MS);
}

/** Brief level-completion celebration (full treatment in Phase 7). */
function celebrate() {
  const el = document.createElement('div');
  el.className = 'celebration';
  el.textContent = `Level ${state.levelId - 1 < 0 ? '' : ''}Complete! 🎉`.trim();
  if (state.levelId > 1) el.textContent = `Level ${state.levelId - 1} Complete! 🎉`;
  else el.textContent = 'Level Complete! 🎉';
  app.appendChild(el);
  setTimeout(() => el.remove(), LEVEL_COMPLETE_PAUSE_MS);
}

// --- Hints -----------------------------------------------------------------

hintBtn.addEventListener('click', () => {
  hintSelecting = !hintSelecting;
  if (hintSelecting) {
    board.setHintMode(true);
  } else {
    board.setHintMode(false);
  }
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

// Tapping the board background cancels hint mode.
boardEl.addEventListener('pointerdown', (e) => {
  if (hintSelecting && (e.target as HTMLElement) === boardEl) {
    hintSelecting = false;
    board.setHintMode(false);
    updateHud(state);
  }
});

// --- End states ------------------------------------------------------------

function showGameOver() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="panel">
      <h2>Game Over</h2>
      <button class="btn" id="btn-new-run">New Run</button>
    </div>
  `;
  app.appendChild(overlay);
  overlay.querySelector('#btn-new-run')!.addEventListener('click', () => {
    overlay.remove();
    levelIndex = 0;
    state = startLevel(LEVELS[0]);
    render();
  });
}

function showRunComplete() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="panel">
      <h2>All levels complete!</h2>
      <button class="btn" id="btn-again">Play Again</button>
    </div>
  `;
  app.appendChild(overlay);
  overlay.querySelector('#btn-again')!.addEventListener('click', () => {
    overlay.remove();
    levelIndex = 0;
    state = startLevel(LEVELS[0]);
    render();
  });
}

render();
