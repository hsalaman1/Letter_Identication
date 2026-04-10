import type { AdminMode, CaseSet, Condition, LetterCase, Trial } from '@/types';

export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');
export const CONDITIONS: Condition[] = ['regular', 'bold', 'hollow'];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function trialId(letter: string, condition: Condition): string {
  return `${letter}-${condition}`;
}

function withCase(letters: string[], c: LetterCase): { letter: string; case: LetterCase }[] {
  return letters.map(letter => ({ letter, case: c }));
}

export function buildTrialList(
  caseSet: CaseSet,
  adminMode: AdminMode,
  randomize: boolean,
): Trial[] {
  const upper = randomize ? shuffle(UPPER) : UPPER;
  const lower = randomize ? shuffle(LOWER) : LOWER;

  let letters: { letter: string; case: LetterCase }[] = [];
  if (caseSet === 'upper') letters = withCase(upper, 'upper');
  else if (caseSet === 'lower') letters = withCase(lower, 'lower');
  else letters = [...withCase(upper, 'upper'), ...withCase(lower, 'lower')];

  const trials: Trial[] = [];
  if (adminMode === 'by-letter') {
    for (const { letter, case: c } of letters) {
      for (const condition of CONDITIONS) {
        trials.push({ id: trialId(letter, condition), letter, case: c, condition });
      }
    }
  } else {
    for (const condition of CONDITIONS) {
      for (const { letter, case: c } of letters) {
        trials.push({ id: trialId(letter, condition), letter, case: c, condition });
      }
    }
  }
  return trials;
}

export function buildFluencyTrialList(
  letters: string[],
  conditions: Condition[],
  randomize: boolean,
): Trial[] {
  const ordered = randomize ? shuffle(letters) : [...letters];
  const trials: Trial[] = [];
  for (const letter of ordered) {
    const c: LetterCase = letter === letter.toUpperCase() ? 'upper' : 'lower';
    for (const condition of conditions) {
      trials.push({ id: trialId(letter, condition), letter, case: c, condition });
    }
  }
  return trials;
}
