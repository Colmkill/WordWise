import './style.css';
import { LEVELS } from './levels';
import { WORD_BANKS } from './content/word-banks';
import { TOPIC_CONCEPTS } from './content/concepts';
import { validateLevels, validateAllConcepts } from './core/validate';
import type { Level } from './types';
import { startLevel, attemptGrouping, requestHint } from './core/game-state';
import type { GameState } from './core/game-state';
import { nextLevelInstance, type LevelInstanceHistory } from './core/level-builder';
import { Board, type AttemptResult } from './ui/board';
import { loadSettings, saveSettings } from './ui/menus';
import { showModal, type Settings } from './ui/menus';
import { loadCheckpoint, saveCheckpoint, clearCheckpoint, checkpointFrom } from './ui/save';
import { startReplay } from './ui/flow';
import { AudioFx } from './audio';
import {
  CATEGORY_REVEAL_MS,
  LEVEL_COMPLETE_PAUSE_MS,
  STARTING_LIVES,
  LEVEL_SEED,
  LAUNCH_SEQUENCE_TARGET_MS,
  LAUNCH_TRAVEL_MS,
  LAUNCH_OVERLAP,
  LAUNCH_REDUCED_FADE_MS,
  LAUNCH_REDUCED_STAGGER_MS
} from './config';

// Validate all level data before play (fails fast in dev).
validateLevels(LEVELS);
validateAllConcepts(LEVELS, TOPIC_CONCEPTS);

const app = document.querySelector<HTMLElement>('#app')!;

let settings: Settings = loadSettings();
const audio = new AudioFx();
audio.setEnabled(settings.sound);
let checkpoint = loadCheckpoint();
let storageWarned = false;

/** True when the current game is a Level Select replay. */
let replay = false;
let state: GameState = startLevel(LEVELS[0]);
let advancing = false;
let hintSelecting = false;
let revealing = new Set<number>();
let paused = false;

// --- Level instances (topic variation) ---------------------------------------
//
// Every entry point - first play, restart, replay, new run, advance - hands
// the player a fresh, fully validated instance of the same level number (the
// difficulty rules belong to the level number; only the content selection
// varies; see
// core/level-builder.ts nextLevelInstance).
//
// instanceHistory carries word-disjointness and concept spacing across every
// instance of the session; instanceSeq is the session-wide spacing counter;
// instanceNonce varies the deterministic draw per instance. sessionSalt is
// drawn once per page load, so every session - including each player's very
// first encounter with a level - plays a different selection. The shipped
// ladder (LEVELS) is never shown as a first choice: it serves as the
// graceful fallback when the eligible pools are exhausted, and as the
// deterministic reference pinned by the test suite.

/** The level currently on screen (generated instance or shipped fallback). */
let currentLevelInstance: Level = LEVELS[0];
let instanceHistory: LevelInstanceHistory = { usedByConcept: new Map(), lastLevelOf: new Map() };
let instanceSeq = 0;
let instanceNonce = 1;
/** Random per-session draw offset: each session's instances differ. */
const sessionSalt = Math.floor(Math.random() * 0x7fffffff) + 1;
/** Concepts of the most recent instance, for the variation overlap check. */
let lastInstanceConcepts: string[] = [];
/**
 * Increments whenever a new level instance replaces the one on screen.
 * Delayed callbacks capture the value and cancel themselves when it moved
 * on, so a restart can never render or advance a stale instance.
 */
let generation = 0;

const currentLevel = (): Level => currentLevelInstance;

/** Invalidate in-flight animation/selection state from the old instance. */
function bumpGeneration(): void {
  generation++;
  revealing.clear();
}

/** Record a played level instance in the session history. */
function recordInstance(level: Level): void {
  instanceSeq++;
  for (const topic of level.topics) {
    const used = instanceHistory.usedByConcept.get(topic.concept) ?? new Set<string>();
    for (const word of topic.words) used.add(word);
    instanceHistory.usedByConcept.set(topic.concept, used);
    instanceHistory.lastLevelOf.set(topic.concept, instanceSeq);
  }
  lastInstanceConcepts = level.topics.map((t) => t.concept);
}

/**
 * The level instance to hand to an entry point (first play, restart, replay,
 * new run, advance). ALWAYS a fresh, fully validated variant of the level
 * number: on a level's first start this session the variation moves away
 * from the shipped ladder's topic selection, so no two sessions share a
 * fixed first encounter; later entries move away from whatever the player
 * saw last. Falls back to the shipped level only when the eligible pools
 * are exhausted, so play never blocks. Also installs the instance as the
 * current level, invalidates stale callbacks, and returns it.
 */
function newInstanceFor(levelId: number): Level {
  const shipped = LEVELS[levelId - 1];
  const previous = lastInstanceConcepts.length > 0 ? lastInstanceConcepts : shipped.topics.map((t) => t.concept);
  const outcome = nextLevelInstance(
    WORD_BANKS,
    LEVEL_SEED,
    levelId,
    sessionSalt + instanceNonce,
    instanceSeq + 1,
    instanceHistory,
    previous,
    { ambiguity: true },
    shipped
  );
  let level: Level;
  if (outcome.fallback) {
    // Pools exhausted: play the shipped level (always valid) and record it
    // so its words count toward disjointness on the next attempt.
    level = shipped;
    recordInstance(shipped);
  } else {
    level = outcome.level;
    instanceHistory = outcome.history;
    instanceSeq++;
    instanceNonce++;
    lastInstanceConcepts = level.topics.map((t) => t.concept);
  }
  currentLevelInstance = level;
  bumpGeneration();
  return level;
}

function sync(): void {
  audio.setEnabled(settings.sound);
  document.body.classList.toggle('reduced-motion', settings.reducedMotion);
}
// --- Screens ----------------------------------------------------------------

function buildShell() {
  app.innerHTML = `
    <div id="bg-bubbles" aria-hidden="true"></div>
    <div id="screen"></div>
  `;
}

const screen = () => document.querySelector<HTMLElement>('#screen')!;

/** Main menu screen. */
function showMainMenu() {
  replay = false;
  paused = false;
  regenerateBackground();
  const hasSave = checkpoint !== null && (checkpoint.completedLevels.length > 0 || checkpoint.highestUnlocked > 1);
  screen().innerHTML = `
    <div class="menu-screen">
      <h1>WordWise</h1>
      <div class="menu-buttons">
        ${hasSave ? '<button class="btn" id="mm-continue">Continue</button>' : ''}
        <button class="btn" id="mm-play">Play</button>
        <button class="btn" id="mm-howto">How to Play</button>
        ${hasSave ? '<button class="btn" id="mm-new">New Game</button>' : ''}
        <button class="btn" id="mm-levels">Level Select</button>
        <button class="btn" id="mm-settings">Settings</button>
      </div>
    </div>
  `;

  screen().querySelector('#mm-play')!.addEventListener('click', () => {
    startTutorialIfNeeded(() => startGame(0, 3));
  });
  const cont = screen().querySelector('#mm-continue');
  if (cont) {
    cont.addEventListener('click', () => {
      // Resume at highest unlocked with checkpoint lives.
      const idx = Math.max(0, Math.min(checkpoint!.highestUnlocked, LEVELS.length) - 1);
      startGame(idx, checkpoint!.lives);
    });
  }
  const newGame = screen().querySelector('#mm-new');
  if (newGame) {
    newGame.addEventListener('click', () => {
      const overlay = showConfirm(
        'New Game?',
        'Current-run progress will reset. Previously unlocked levels remain available.',
        'New Game',
        () => {
          overlay.remove();
          clearCheckpoint();
          checkpoint = null;
          startGame(0, 3);
        }
      );
    });
  }
  screen().querySelector('#mm-howto')!.addEventListener('click', showHowToPlay);
  screen().querySelector('#mm-levels')!.addEventListener('click', showLevelSelect);
  screen().querySelector('#mm-settings')!.addEventListener('click', () => showSettingsPanel());
}

function showHowToPlay() {
  screen().innerHTML = `
    <div class="menu-screen">
      <h2>How to Play</h2>
      <div class="howto">
        <p><b>Drag</b> one word bubble onto another to try grouping them.</p>
        <p>Wait through the short scramble — <b>same-topic words merge</b> and show mixed letters.</p>
        <p>Merge every word of a topic to <b>reveal its hidden category</b>.</p>
        <p>Wrong pairs flash red and count as <b>mistakes</b>. Too many mistakes cost a <b>life</b> and restart the level.</p>
        <p>Lose all three lives and the run ends. <b>Hints</b>: one per topic per level.</p>
      </div>
      <div class="menu-buttons"><button class="btn" id="ht-back">Back</button></div>
    </div>
  `;
  screen().querySelector('#ht-back')!.addEventListener('click', showMainMenu);
}

function showLevelSelect() {
  const highest = Math.min(checkpoint?.highestUnlocked ?? 1, LEVELS.length);
  screen().innerHTML = `
    <div class="menu-screen">
      <h2>Level Select</h2>
      <div class="level-grid">
        ${LEVELS.map(
          (l) => `<button class="btn level-btn ${l.id <= highest ? '' : 'locked'}" data-id="${l.id}" ${l.id <= highest ? '' : 'disabled'}>
            ${l.id}. ${l.id <= highest ? ((checkpoint?.completedLevels ?? []).includes(l.id) ? '✓ ' : '') : '🔒'}
          </button>`
        ).join('')}
      </div>
      <div class="menu-buttons"><button class="btn" id="ls-back">Back</button></div>
    </div>
  `;
  screen().querySelectorAll<HTMLButtonElement>('.level-btn:not(.locked)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      replay = true;
      const instance = newInstanceFor(id);
      state = startReplay(instance);
      showGameScreen();
    });
  });
  screen().querySelector('#ls-back')!.addEventListener('click', showMainMenu);
}

/** Settings overlay usable from the main menu. */
function showSettingsPanel(onBack?: () => void) {
  const overlay = showModal(`
    <h2>Settings</h2>
    <label class="setting"><input type="checkbox" id="sp-sound" ${settings.sound ? 'checked' : ''}/> Sound</label>
    <label class="setting"><input type="checkbox" id="sp-motion" ${settings.reducedMotion ? 'checked' : ''}/> Reduced motion</label>
    <div class="menu-buttons"><button class="btn" id="sp-back">Back</button></div>
  `);
  overlay.querySelector('#sp-sound')!.addEventListener('change', (e) => {
    settings = { ...settings, sound: (e.target as HTMLInputElement).checked };
    if (!saveSettings(settings)) warnStorage();
    sync();
  });
  overlay.querySelector('#sp-motion')!.addEventListener('change', (e) => {
    settings = { ...settings, reducedMotion: (e.target as HTMLInputElement).checked };
    if (!saveSettings(settings)) warnStorage();
    sync();
  });
  overlay.querySelector('#sp-back')!.addEventListener('click', () => {
    overlay.remove();
    if (onBack) onBack();
  });
}

function warnStorage() {
  if (storageWarned) return;
  storageWarned = true;
  const note = document.createElement('div');
  note.className = 'storage-note';
  note.textContent = '⚠ Browser storage unavailable — progress may not be saved.';
  app.appendChild(note);
  setTimeout(() => note.remove(), 6000);
}

function showConfirm(
  title: string,
  body: string,
  confirmLabel: string,
  onConfirm: () => void,
  onCancel?: () => void
): HTMLElement {
  const overlay = showModal(`
    <h2>${title}</h2>
    <p>${body}</p>
    <div class="menu-buttons">
      <button class="btn" id="cf-yes">${confirmLabel}</button>
      <button class="btn" id="cf-no">Cancel</button>
    </div>
  `);
  overlay.querySelector('#cf-yes')!.addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });
  overlay.querySelector('#cf-no')!.addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });
  return overlay;
}

// --- First-visit tutorial -----------------------------------------------------

function startTutorialIfNeeded(onDone: () => void) {
  if (checkpoint?.tutorialDone) {
    onDone();
    return;
  }
  // Mark tutorial done so it only appears on first visit.
  if (checkpoint) {
    checkpoint = { ...checkpoint, tutorialDone: true };
  } else {
    checkpoint = { completedLevels: [], highestUnlocked: 1, lives: 3, tutorialDone: true };
  }
  if (!saveCheckpoint(checkpoint)) warnStorage();

  // A tiny guided demonstration: two guaranteed words on screen.
  screen().innerHTML = `
    <div class="menu-screen">
      <h2>Welcome to WordWise!</h2>
      <p class="tutorial-hint">Drag <b>one</b> onto <b>two</b> to merge them — correct groups reveal hidden categories.</p>
      <div id="t-board" class="tutorial-board"></div>
      <p class="tutorial-hint">In the real game, wrong matches cost mistakes. Here, just practise the drag.</p>
      <div class="menu-buttons"><button class="btn" id="t-skip">Skip to Level 1</button></div>
    </div>
  `;

  const tBoard = new Board(document.querySelector<HTMLElement>('#t-board')!);
  const demo: GameState = {
    levelId: 0,
    mistakeThreshold: 99,
    mistakes: 0,
    lives: 3,
    hintsUsed: [],
    bubbles: [
      { id: 1, words: ['one'], topicId: 'demo' },
      { id: 2, words: ['two'], topicId: 'demo' }
    ],
    completedTopics: [],
    status: 'playing'
  };
  tBoard.render(demo);
  tBoard.onAttempt = async (): Promise<AttemptResult> => {
    screen().innerHTML = `
      <div class="menu-screen">
        <h2>Perfect! 🎉</h2>
        <p>Words in the same hidden group merge, mix their letters, and finally reveal the category name.</p>
        <div class="menu-buttons"><button class="btn" id="t-next">Start Level 1</button></div>
      </div>
    `;
    screen().querySelector('#t-next')!.addEventListener('click', onDone);
    return 'correct';
  };
  screen().querySelector('#t-skip')!.addEventListener('click', onDone);
}

// --- Game screen ---------------------------------------------------------------

function startGame(idx: number, lives: number) {
  replay = false;
  const instance = newInstanceFor(LEVELS[idx].id);
  state = startLevel(instance, lives);
  showGameScreen();
}

function showGameScreen() {
  screen().innerHTML = `
    <header class="topbar">
      <span id="hud-level">Level 1</span>
      <span id="hud-topics">Topics: 0</span>
      <span id="hud-mistakes">Mistakes: 0/3</span>
      <span id="hud-lives" class="lives" role="img"></span>
      ${replay ? '<span class="replay-tag">Replay</span>' : ''}
      <button id="btn-hint" class="btn">Hint</button>
      <button id="btn-menu" class="btn">Menu</button>
    </header>
    <main id="board" aria-label="Word bubbles play area"></main>
  `;
  buildBoardAndWire();
  render();
  maybeLaunchSequence();
}

const boardEl = () => document.querySelector<HTMLElement>('#board')!;
const hudLevel = () => document.querySelector<HTMLElement>('#hud-level')!;
const hudTopics = () => document.querySelector<HTMLElement>('#hud-topics')!;
const hudMistakes = () => document.querySelector<HTMLElement>('#hud-mistakes')!;
const hudLives = () => document.querySelector<HTMLElement>('#hud-lives')!;
const hintBtn = () => document.querySelector<HTMLButtonElement>('#btn-hint')!;
const menuBtn = () => document.querySelector<HTMLButtonElement>('#btn-menu')!;

let board: Board;

/** Previously rendered lives, so a life loss can animate the emptied heart. */
let lastLives = STARTING_LIVES;

/** Hearts HUD: red hearts for remaining lives, hollow heart slots for
 *  lost lives; the last remaining heart pulses with a gentle heartbeat. */
function renderLives(lives: number) {
  const el = hudLives();
  const lost = Math.max(0, STARTING_LIVES - lives);
  const animateLost = lives < lastLives;
  el.setAttribute('aria-label', `Lives: ${lives} of ${STARTING_LIVES}`);
  let html = '';
  for (let i = 0; i < lives; i++) html += `<span class="life${lives === 1 ? ' last-life' : ''}">♥</span>`;
  for (let i = 0; i < lost; i++) {
    const animate = animateLost && i === lost - 1 ? ' just-lost' : '';
    html += `<span class="life lost${animate}">♡</span>`;
  }
  el.innerHTML = html;
  lastLives = lives;
}

function updateHud(s: GameState) {
  const level = currentLevel();
  hudLevel().textContent = `Level ${s.levelId}`;
  const remaining = level.topics.length - s.completedTopics.length;
  hudTopics().textContent = `Topics: ${remaining}`;
  hudMistakes().textContent = `Mistakes: ${s.mistakes}/${s.mistakeThreshold}`;
  const tension = s.mistakeThreshold > 0 ? s.mistakes / s.mistakeThreshold : 0;
  const boardNode = document.querySelector('#board');
  if (boardNode) {
    boardNode.classList.remove('tension-1', 'tension-2', 'tension-3');
    if (tension >= 0.99) boardNode.classList.add('tension-3');
    else if (tension >= 0.6) boardNode.classList.add('tension-2');
    else if (tension >= 0.3) boardNode.classList.add('tension-1');
  }
  renderLives(s.lives);
  const hintAvailable =
    s.status === 'playing' &&
    level.topics.some((t) => !s.completedTopics.includes(t.id) && !s.hintsUsed.includes(t.id));
  hintBtn().disabled = !hintAvailable;
  hintBtn().textContent = hintSelecting ? 'Cancel' : 'Hint';
}

function render() {
  board.render(state, revealing);
  updateHud(state);
}

function buildBoardAndWire() {
  board = new Board(boardEl());
  board.onRender = updateHud;
  // Re-scatter bubbles when the viewport changes (rotate/resize on mobile).
  // Mid-flight resizes are handled by the launch sequence itself (generation
  // guard + fresh scatter on the next render).
  board.observeViewport(() => {
    if (!board.isLaunching()) render();
  });

  board.onAttempt = async (a: number, b: number): Promise<AttemptResult> => {
    const gen = generation;
    const outcome = attemptGrouping(state, currentLevel(), a, b, (lives) => restartAfterLifeLoss(lives));
    const prevState = state;
    state = outcome.state;

    if (outcome.kind === 'correct') {
      const prevRemaining = prevState.completedTopics.length;
      const newRemaining = state.completedTopics.length;
      if (newRemaining > prevRemaining) {
        const completedTopicId = state.completedTopics[newRemaining - 1];
        const topic = currentLevel().topics.find((t) => t.id === completedTopicId)!;
        // attemptGrouping keeps the dragged bubble's id for the merged bubble;
        // look it up by id so the reveal always targets the real merged bubble
        // (a topicId lookup could find the partner bubble instead).
        const merged = prevState.bubbles.find((bb) => bb.id === a)!;
        if (!revealing.has(merged.id)) {
          audio.play('topicComplete');
          revealing.add(merged.id);
          updateHud(state);
          // The partner bubble left the state on the final merge: fade it out
          // after the feedback flash instead of lingering through the reveal.
          board.retireBubble(b, 500);
          board.revealCategory(merged.id, topic.category, CATEGORY_REVEAL_MS).finally(() => {
            revealing.delete(merged.id);
            if (gen !== generation) return;
            render();
            checkLevelComplete();
          });
        }
      } else {
        setTimeout(() => {
          if (gen === generation) render();
        }, 0);
      }
      if (state.status === 'gameOver') {
        setTimeout(() => {
          if (gen === generation) showGameOver();
        }, 700);
      }
      audio.play('correct');
      return 'correct';
    }

    if (outcome.kind === 'incorrect') {
      if (state.status === 'gameOver') {
        setTimeout(() => {
          if (gen === generation) showGameOver();
        }, 700);
      } else {
        // Deliberately unguarded: a life-loss restart replaced the level
        // instance inside attemptGrouping, and this render must show the
        // fresh arrangement (the generation guard was bumped, not stuck).
        setTimeout(render, 0);
      }
      audio.play('incorrect');
      return 'incorrect';
    }

    return 'invalid';
  };

  hintBtn().addEventListener('click', () => {
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

  boardEl().addEventListener('pointerdown', (e) => {
    if (hintSelecting && (e.target as HTMLElement) === boardEl()) {
      hintSelecting = false;
      board.setHintMode(false);
      updateHud(state);
    }
  });

  menuBtn().addEventListener('click', openGameMenu);
}

/** Build the fresh instance for a life-loss restart (fresh topics and words). */
function restartAfterLifeLoss(lives: number): Level {
  void lives; // lives are applied by the caller (registerMistake)
  return newInstanceFor(currentLevelInstance.id);
}

/**
 * Decorative background: repopulates the floating-colour-bubble layer with a
 * fresh random arrangement. Called on the main menu and once per genuinely
 * new level (guarded by isFreshLevel), never on ordinary renders. Purely
 * aesthetic: the layer is pointer-events:none and sits behind #screen,
 * fully isolated from gameplay.
 */
function regenerateBackground() {
  const layer = document.querySelector<HTMLElement>('#bg-bubbles');
  if (!layer) return;
  layer.innerHTML = '';
  const w = window.innerWidth;
  const h = window.innerHeight;
  const count = Math.max(600, Math.min(600, Math.round((w * h) / 7300)));
  for (let i = 0; i < count; i++) {
    // Bubble size scales with the viewport (shortest edge against a 720px
  // reference) so large screens keep the same visual density as phones;
  // phones stay at the 50-90px base, desktops grow up to 2.2x.
  const scale = Math.max(1, Math.min(2.2, Math.min(w, h) / 720));
  const size = (50 + Math.random() * 78) * scale;
    const hue = Math.floor(Math.random() * 360);
    const light = 48 + Math.random() * 10; // 48-58: vivid, not pastel
    const sat = 95 + Math.random() * 5; // near-full saturation
    const el = document.createElement('div');
    el.className = 'bg-bubble ' + (Math.random() < 0.5 ? 'drift-a' : 'drift-b');
    el.style.left = Math.random() * 100 + '%';
    el.style.top = Math.random() * 100 + '%';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.background =
      'radial-gradient(circle at 30% 25%, hsla(0,0%,100%,0.7) 0%, hsla(' + hue + ',' + sat + '%,' + light + '%,0.75) 18%, hsla(' + hue + ',' + sat + '%,' + (light - 10) + '%,0.6) 100%)';
    el.style.animationDuration = (12 + Math.random() * 18) + 's';
    el.style.animationDelay = -Math.random() * 30 + 's';
    el.style.opacity = String(0.55 + Math.random() * 0.3);
    layer.appendChild(el);
  }
}

/**
 * Fresh-level turret launch: hide the bubbles, then fire each one from the
 * turret to its pre-assigned destination. Bubbles are not interactive until
 * every bubble has settled (board locked during the sequence).
 */
function maybeLaunchSequence() {
  if (!isFreshLevel()) return;
  regenerateBackground();
  board.setLocked(true);
  board.launchSequence(state, {
    sequenceTarget: LAUNCH_SEQUENCE_TARGET_MS,
    travel: LAUNCH_TRAVEL_MS,
    overlap: LAUNCH_OVERLAP,
    reducedFade: LAUNCH_REDUCED_FADE_MS,
    reducedStagger: LAUNCH_REDUCED_STAGGER_MS
  }).then(() => {
    board.setLocked(false);
    render();
  });
}

/** True when the current state is a fresh, not-yet-played level. */
function isFreshLevel(): boolean {
  return (
    state.bubbles.length > 0 &&
    !board.isLaunching() &&
    state.mistakes === 0 &&
    state.hintsUsed.length === 0 &&
    !state.completedTopics.length
  );
}

function checkLevelComplete() {
  if (state.status !== 'levelComplete' || advancing) return;
  advancing = true;
  const gen = generation;
  setTimeout(() => {
    advancing = false;
    if (gen !== generation) return;
    // Save the completed-level checkpoint (main run only).
    if (!replay) {
      const cp = checkpointFrom(state, LEVELS.length);
      if (saveCheckpoint(cp)) {
        checkpoint = loadCheckpoint();
      } else {
        warnStorage();
      }
    }
    if (replay) {
      // Replay: celebrate then return to Level Select.
      celebrate(`Level ${state.levelId} Complete! 🎉`);
      setTimeout(showLevelSelect, LEVEL_COMPLETE_PAUSE_MS);
      return;
    }
    const nextId = state.levelId + 1;
    if (nextId > LEVELS.length) {
      showRunComplete();
      return;
    }
    board.invalidatePending();
    const instance = newInstanceFor(nextId);
    state = startLevel(instance, state.lives);
    board.resetLayout();
    celebrate(`Level ${state.levelId} Complete! 🎉`);
    render();
    maybeLaunchSequence();
  }, LEVEL_COMPLETE_PAUSE_MS);
}

function celebrate(text: string) {
  audio.play('levelComplete');
  const el = document.createElement('div');
  el.className = 'celebration';
  el.textContent = text;
  app.appendChild(el);
  setTimeout(() => el.remove(), LEVEL_COMPLETE_PAUSE_MS);
}

// --- Pause & gameplay menu (game screen only) ---------------------------------

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
    overlay.remove();
    setPaused(false);
    showSettingsPanel(() => {
      // Return to the game after settings.
      if (!paused) setPaused(true);
      const o = showModal('');
      menuView(o);
    });
  });
  overlay.querySelector('#m-restart')!.addEventListener('click', () => {
    showConfirmInOverlay(
      overlay,
      'Restart Level?',
      'Current-level progress will be lost. The level restarts with a fresh selection of topics and words.',
      'Restart',
      () => {
        overlay.remove();
        board.invalidatePending();
        const instance = newInstanceFor(currentLevel().id);
        state = replay ? startReplay(instance) : startLevel(instance, state.lives);
        board.resetLayout();
        render();
        maybeLaunchSequence();
        setPaused(false);
      }
    );
  });
  overlay.querySelector('#m-main')!.addEventListener('click', () => {
    showConfirmInOverlay(
      overlay,
      'Return to Menu?',
      'Unfinished level progress will be lost. The level will restart with a fresh selection if played again.',
      'Return to Menu',
      () => {
        overlay.remove();
        setPaused(false);
        // Completed levels, unlocks and the checkpoint stay protected.
        if (replay) {
          showLevelSelect();
        } else {
          showMainMenu();
        }
      }
    );
  });
}

function showConfirmInOverlay(
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

function openGameMenu() {
  if (paused) return;
  setPaused(true);
  const overlay = showModal('');
  menuView(overlay);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && inGame()) pauseForFocusLoss();
});
window.addEventListener('blur', () => {
  if (inGame()) pauseForFocusLoss();
});

function inGame(): boolean {
  return document.querySelector('#board') !== null && !paused;
}

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

// --- End states ------------------------------------------------------------

function showGameOver() {
  const overlay = showModal(`
    <h2>Game Over</h2>
    <div class="menu-buttons">
      <button class="btn" id="btn-new-run">New Run</button>
      <button class="btn" id="btn-main">Main Menu</button>
    </div>
  `);
  overlay.querySelector('#btn-new-run')!.addEventListener('click', () => {
    overlay.remove();
    board.invalidatePending();
    startGame(0, 3); // checkpoint (unlocked levels) remains protected
  });
  overlay.querySelector('#btn-main')!.addEventListener('click', () => {
    overlay.remove();
    showMainMenu();
  });
}

function showRunComplete() {
  const overlay = showModal(`
    <h2>All levels complete! 🎉</h2>
    <div class="menu-buttons"><button class="btn" id="btn-main">Main Menu</button></div>
  `);
  overlay.querySelector('#btn-main')!.addEventListener('click', () => {
    overlay.remove();
    showMainMenu();
  });
}

// --- Boot --------------------------------------------------------------------

// Keep the decorative background sized for the viewport across resizes
// (debounced; purely aesthetic layer, safe at any time).
let bgResizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(bgResizeTimer);
  bgResizeTimer = window.setTimeout(regenerateBackground, 250);
});

sync();
buildShell();
showMainMenu();

