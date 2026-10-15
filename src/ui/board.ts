import type { GameState } from '../core/game-state';
import { VALIDATION_DELAY_MS } from '../config';

export type AttemptResult = 'correct' | 'incorrect' | 'invalid';

/** Scramble the characters of a string (visual distraction only). */
export function scramble(text: string): string {
  const chars = text.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

interface Position {
  x: number;
  y: number;
}

interface ActiveDrag {
  bubbleId: number;
  cancel: () => void;
}

export class Board {
  private container: HTMLElement;
  private positions = new Map<number, Position>();
  private locked = false;
  private hintMode = false;
  private paused = false;
  private activeDrag: ActiveDrag | null = null;
  /** Called to validate a drop; the board awaits the result for feedback. */
  onAttempt: (a: number, b: number) => Promise<AttemptResult> = async () => 'invalid';
  /** Called after the state has changed (for HUD updates). */
  onRender: (state: GameState) => void = () => {};
  /** Called when the player taps a bubble in hint mode. */
  onHintSelect: (bubbleId: number) => void = () => {};

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.classList.add('board');
  }

  setLocked(locked: boolean) {
    this.locked = locked;
    this.container.classList.toggle('locked', locked);
  }

  /** Enter/exit hint-selection mode. */
  setHintMode(active: boolean) {
    this.hintMode = active;
    this.container.classList.toggle('hint-mode', active);
  }

  /**
   * Pause/resume gameplay. Pausing cancels any active drag (the bubble returns
   * to its last stable position) and freezes bubble motion.
   */
  setPaused(paused: boolean) {
    if (paused && !this.paused) {
      this.cancelActiveDrag();
    }
    this.paused = paused;
    this.container.classList.toggle('paused', paused);
  }

  isPaused() {
    return this.paused;
  }

  /** Cancel the in-flight drag: bubble snaps back; no attempt is made. */
  private cancelActiveDrag() {
    if (this.activeDrag) {
      this.activeDrag.cancel();
      this.activeDrag = null;
    }
  }

  /** Render the current state, preserving positions of existing bubbles. */
  render(state: GameState) {
    for (const el of Array.from(this.container.querySelectorAll('.bubble'))) {
      const id = Number((el as HTMLElement).dataset.id);
      if (!state.bubbles.some((b) => b.id === id)) el.remove();
    }

    for (const bubble of state.bubbles) {
      let el = this.bubbleEl(bubble.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'bubble';
        el.dataset.id = String(bubble.id);
        el.tabIndex = 0;
        this.attachDrag(el, bubble.id);
        this.container.appendChild(el);
      }
      el.classList.remove('dragging', 'target', 'feedback-good', 'feedback-bad', 'selected');
      el.textContent =
        bubble.words.length === 1 ? bubble.words[0] : scramble(bubble.words.join(''));
      const pos = this.ensurePosition(bubble.id);
      this.place(el, pos);
    }

    this.relax(state);
    this.onRender(state);
  }

  /**
   * Show a completed topic's category inside its bubble, then float it offscreen.
   */
  async revealCategory(bubbleId: number, category: string, revealMs: number): Promise<void> {
    const el = this.bubbleEl(bubbleId);
    if (!el) return;
    el.classList.add('revealing');
    el.textContent = category;
    await this.waitWhilePaused(revealMs);
    el.classList.add('float-off');
    await this.waitWhilePaused(700);
    el.remove();
  }

  /** setTimeout that does not count down while the game is paused. */
  private waitWhilePaused(ms: number): Promise<void> {
    return new Promise((resolve) => {
      let remaining = ms;
      let last = performance.now();
      const tick = (now: number) => {
        if (!this.paused) {
          remaining -= now - last;
        }
        last = now;
        if (remaining <= 0) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /** Show a hint in a speech bubble above the given word bubble; auto-dismiss. */
  showHint(bubbleId: number, hint: string, dismissMs = 4000) {
    this.hideHint();
    const el = this.bubbleEl(bubbleId);
    if (!el) return;
    const tip = document.createElement('div');
    tip.className = 'hint-tip';
    tip.textContent = hint;
    this.container.appendChild(tip);

    const place = () => {
      const r = el.getBoundingClientRect();
      const br = this.container.getBoundingClientRect();
      const width = tip.offsetWidth;
      const height = tip.offsetHeight;
      let top = r.top - br.top - height - 10;
      if (top < 8) top = r.bottom - br.top + 10;
      let left = r.left - br.left + r.width / 2 - width / 2;
      left = Math.max(8, Math.min(left, br.width - width - 8));
      tip.style.top = `${top}px`;
      tip.style.left = `${left}px`;
    };

    requestAnimationFrame(place);
    setTimeout(place, 60);

    const dismiss = () => {
      tip.remove();
      document.removeEventListener('pointerdown', onDocDown, true);
      clearTimeout(timer);
    };
    const onDocDown = (e: Event) => {
      if (!tip.contains(e.target as Node) && e.target !== el) dismiss();
    };
    document.addEventListener('pointerdown', onDocDown, true);
    const timer = setTimeout(dismiss, dismissMs);
  }

  hideHint() {
    this.container.querySelectorAll('.hint-tip').forEach((t) => t.remove());
  }

  private bubbleEl(id: number): HTMLElement | null {
    return this.container.querySelector<HTMLElement>(`.bubble[data-id="${id}"]`);
  }

  private ensurePosition(id: number): Position {
    if (!this.positions.has(id)) {
      const rect = this.container.getBoundingClientRect();
      this.positions.set(id, {
        x: 40 + Math.random() * Math.max(80, rect.width - 160),
        y: 40 + Math.random() * Math.max(80, rect.height - 160)
      });
    }
    return this.positions.get(id)!;
  }

  private place(el: HTMLElement, pos: Position) {
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
  }

  /** Gently push overlapping bubbles apart (layout only; never groups them). */
  private relax(state: GameState) {
    const size = 120;
    for (let pass = 0; pass < 2; pass++) {
      for (const a of state.bubbles) {
        for (const b of state.bubbles) {
          if (a.id >= b.id) continue;
          const pa = this.ensurePosition(a.id);
          const pb = this.ensurePosition(b.id);
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = size * 0.75;
          if (dist < minDist) {
            const push = (minDist - dist) / 2;
            const nx = (dx / dist) * push;
            const ny = (dy / dist) * push;
            pa.x -= nx;
            pa.y -= ny;
            pb.x += nx;
            pb.y += ny;
          }
        }
      }
    }
    const rect = this.container.getBoundingClientRect();
    for (const bubble of state.bubbles) {
      const p = this.ensurePosition(bubble.id);
      p.x = Math.max(8, Math.min(p.x, rect.width - 100));
      p.y = Math.max(8, Math.min(p.y, rect.height - 60));
      this.place(this.bubbleEl(bubble.id)!, p);
    }
  }

  /** Wire pointer-based dragging (mouse + touch via Pointer Events). */
  private attachDrag(el: HTMLElement, id: number) {
    el.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.locked || this.paused) return;

      if (this.hintMode) {
        e.preventDefault();
        this.onHintSelect(id);
        return;
      }

      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      const startX = e.clientX;
      const startY = e.clientY;
      const pos = { ...this.ensurePosition(id) };
      const stable = this.ensurePosition(id);

      const move = (ev: PointerEvent) => {
        pos.x = stable.x + (ev.clientX - startX);
        pos.y = stable.y + (ev.clientY - startY);
        this.place(el, pos);
        const target = this.targetUnder(el, ev.clientX, ev.clientY);
        this.container.querySelectorAll('.bubble.target').forEach((t) => t.classList.remove('target'));
        if (target) target.classList.add('target');
      };

      const cleanup = () => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', cancel);
      };

      const up = async (ev: PointerEvent) => {
        cleanup();
        this.activeDrag = null;
        const target = this.targetUnder(el, ev.clientX, ev.clientY);
        el.classList.remove('dragging');
        this.container.querySelectorAll('.bubble.target').forEach((t) => t.classList.remove('target'));
        if (!target) {
          this.positions.set(id, pos);
          return;
        }
        await this.runAttempt(el, target);
      };

      const cancel = () => {
        cleanup();
        el.classList.remove('dragging');
        this.container.querySelectorAll('.bubble.target').forEach((t) => t.classList.remove('target'));
        // Return to the last stable position: no attempt, no penalty.
        this.place(el, stable);
      };

      this.activeDrag = { bubbleId: id, cancel };

      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', cancel);
    });
  }

  /** Find the bubble under the pointer, excluding the dragged one. */
  private targetUnder(dragged: HTMLElement, clientX: number, clientY: number): HTMLElement | null {
    const bubbles = Array.from(this.container.querySelectorAll<HTMLElement>('.bubble'));
    let best: HTMLElement | null = null;
    let bestDist = Infinity;
    for (const el of bubbles) {
      if (el === dragged) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist < Math.max(r.width, r.height) / 1.6 && dist < bestDist) {
        best = el;
        bestDist = dist;
      }
    }
    return best;
  }

  /** Suspense sequence: highlight, scramble, delay, validate, feedback. */
  private async runAttempt(a: HTMLElement, b: HTMLElement) {
    const idA = Number(a.dataset.id);
    const idB = Number(b.dataset.id);
    a.classList.add('selected');
    b.classList.add('selected');
    this.setLocked(true);
    const scrambleTimer = window.setInterval(() => {
      for (const el of [a, b]) {
        if (el.classList.contains('selected')) {
          el.classList.add('scrambling');
        }
      }
    }, 120);
    await this.waitWhilePaused(VALIDATION_DELAY_MS);
    window.clearInterval(scrambleTimer);
    a.classList.remove('scrambling');
    b.classList.remove('scrambling');

    const result = await this.onAttempt(idA, idB);
    if (result === 'correct') {
      a.classList.add('feedback-good');
      b.classList.add('feedback-good');
    } else if (result === 'incorrect') {
      a.classList.add('feedback-bad');
      b.classList.add('feedback-bad');
    }
    await this.waitWhilePaused(500);
    a.classList.remove('selected', 'feedback-good', 'feedback-bad');
    b.classList.remove('selected', 'feedback-good', 'feedback-bad');
    this.setLocked(false);
  }
}
