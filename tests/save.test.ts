import { describe, it, expect } from 'vitest';
import { loadCheckpoint, saveCheckpoint, clearCheckpoint, checkpointFrom } from '../src/ui/save';

// In-memory localStorage stub (vitest environment has no DOM).
const store = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k)
};
(globalThis as any).localStorage = localStorageStub;

describe('save', () => {
  it('round-trips a checkpoint', () => {
    clearCheckpoint();
    expect(saveCheckpoint({ completedLevels: [1, 2], highestUnlocked: 3, lives: 2, tutorialDone: true })).toBe(true);
    const cp = loadCheckpoint();
    expect(cp).toEqual({ completedLevels: [1, 2], highestUnlocked: 3, lives: 2, tutorialDone: true });
  });

  it('returns null when nothing is saved', () => {
    clearCheckpoint();
    expect(loadCheckpoint()).toBeNull();
  });

  it('tolerates corrupted data', () => {
    store.set('wordwise.checkpoint', '{not json');
    expect(loadCheckpoint()).toBeNull();
  });

  it('merges newly completed levels into the checkpoint', () => {
    clearCheckpoint();
    saveCheckpoint({ completedLevels: [1], highestUnlocked: 2, lives: 3, tutorialDone: true });
    const next = checkpointFrom(
      { levelId: 2, lives: 2, completedLevels: [1], highestUnlocked: 2 } as never,
      10
    );
    expect(next.completedLevels).toContain(1);
    expect(next.completedLevels).toContain(2);
    expect(next.highestUnlocked).toBe(3);
    expect(next.lives).toBe(2);
  });

  it('caps highest unlocked at the total level count', () => {
    clearCheckpoint();
    const next = checkpointFrom({ levelId: 10, lives: 3 } as never, 10);
    expect(next.highestUnlocked).toBe(10);
  });
});
