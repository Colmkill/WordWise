import './style.css';
import { LEVELS } from './levels';
import { validateLevels } from './core/validate';
import type { Level } from './types';
import { startLevel, attemptGrouping, advanceLevel } from './core/game-state';
import type { GameState } from './core/game-state';
import { Board, type AttemptResult } from './ui/board';
import { LEVEL_COMPLETE_PAUSE_MS } from './config';

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
    <button id="btn-hint" class="btn" disabled title="Coming in Phase 5">Hint</button>
    <button id="btn-menu" class="btn" disabled title="Coming in Phase 6">Menu</button>
  </header>
  <main id="board" aria-label="Word bubbles play area"></main>
`;

const boardEl = document.querySelector<HTMLElement>('#board')!;
const hudLevel = document.querySelector<HTMLElement>('#hud-level')!;
const hudTopics = document.querySelector<HTMLElement>('#hud-topics')!;
const hudMistakes = document.querySelector<HTMLElement>('#hud-mistakes')!;
const hudLives = document.querySelector<HTMLElement>('#hud-lives')!;

// --- Game state ------------------------------------------------------------

let levelIndex = 0;
let state: GameState = startLevel(LEVELS[levelIndex]);
let advancing = false;

const currentLevel = (): Level => LEVELS[levelIndex];

function updateHud(s: GameState) {
  const level = currentLevel();
  hudLevel.textContent = `Level ${s.levelId}`;
  const remaining = level.topics.length - s.completedTopics.length;
  hudTopics.textContent = `Topics: ${remaining}`;
  hudMistakes.textContent = `Mistakes: ${s.mistakes}/${s.mistakeThreshold}`;
  hudLives.textContent = `Lives: ${'♥'.repeat(s.lives)}${'♡'.repeat(Math.max(0, 3 - s.lives))}`;
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
  state = outcome.state;
  // Re-render immediately so merges / separations appear after feedback.
  if (outcome.kind === 'correct' || outcome.kind === 'incorrect') {
    if (state.status === 'playing') {
      // Defer DOM update until feedback colour finishes (runAttempt clears it).
      setTimeout(render, 0);
    } else if (state.status === 'gameOver') {
      render();
      showGameOver();
    }
    checkLevelComplete();
    return outcome.kind;
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
    board.render(state);
    updateHud(state);
  }, LEVEL_COMPLETE_PAUSE_MS);
}

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
