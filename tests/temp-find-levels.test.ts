// temp-find-levels.test.ts
import { describe, it } from 'vitest';
import { LEVELS } from './src/levels';
import { claimedCrossTopicWords } from './src/core/validate-ambiguity';

describe('find my new claimed levels', () => {
  it('prints the current claimed levels', () => {
    const claimedLevels = LEVELS.filter(
      (l) => claimedCrossTopicWords(l).length > 0
    ).map((l) => l.id);

    // This will print to your terminal
    console.log(JSON.stringify(claimedLevels));
    expect(true).toBe(true); // dummy assertion
  });
});
