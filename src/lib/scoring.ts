import type { Condition, Session, Trial, TrialResponse } from '@/types';

export interface ConditionScore {
  upper: number;
  lower: number;
  combined: number;
  attempted: number;
  total: number;
  percent: number;
}

export interface Results {
  perCondition: Record<Condition, ConditionScore>;
  filled: { correct: number; total: number; percent: number };
  hollow: { correct: number; total: number; percent: number };
  gap: number;
  flags: {
    fillDependent: boolean;
    weightDependent: boolean;
    letterSpecific: string[];
    caseSpecific: boolean;
  };
  errors: Array<{
    letter: string;
    case: 'upper' | 'lower';
    condition: Condition;
    response: TrialResponse;
    said: string;
  }>;
}

const CONDS: Condition[] = ['regular', 'bold', 'hollow'];

function countCorrect(
  trials: Trial[],
  responses: Record<string, TrialResponse>,
  predicate: (t: Trial) => boolean,
): number {
  let n = 0;
  for (const t of trials) {
    if (!predicate(t)) continue;
    if (responses[t.id] === 'correct') n++;
  }
  return n;
}

function countAttempted(
  trials: Trial[],
  responses: Record<string, TrialResponse>,
  predicate: (t: Trial) => boolean,
): number {
  let n = 0;
  for (const t of trials) {
    if (!predicate(t)) continue;
    if (responses[t.id] !== undefined) n++;
  }
  return n;
}

export function computeResults(session: Session): Results {
  const { trials, responses, notes, caseSet } = session;

  const perCondition = {} as Record<Condition, ConditionScore>;
  for (const c of CONDS) {
    const upper = countCorrect(trials, responses, t => t.condition === c && t.case === 'upper');
    const lower = countCorrect(trials, responses, t => t.condition === c && t.case === 'lower');
    const attempted = countAttempted(trials, responses, t => t.condition === c);
    const total = trials.filter(t => t.condition === c).length;
    const combined = upper + lower;
    // Percentage is of attempted trials when session ended early, else of total.
    const denom = session.endedEarly ? attempted : total;
    const percent = denom > 0 ? (combined / denom) * 100 : 0;
    perCondition[c] = { upper, lower, combined, attempted, total, percent };
  }

  const filledCorrect = perCondition.regular.combined + perCondition.bold.combined;
  const filledDenom = session.endedEarly
    ? perCondition.regular.attempted + perCondition.bold.attempted
    : perCondition.regular.total + perCondition.bold.total;
  const filledPercent = filledDenom > 0 ? (filledCorrect / filledDenom) * 100 : 0;

  const hollowCorrect = perCondition.hollow.combined;
  const hollowDenom = session.endedEarly ? perCondition.hollow.attempted : perCondition.hollow.total;
  const hollowPercent = hollowDenom > 0 ? (hollowCorrect / hollowDenom) * 100 : 0;

  const gap = filledPercent - hollowPercent;

  // Determine which conditions are actually present in the session.
  const testedConditions = new Set(trials.map(t => t.condition));
  const hasRegular = testedConditions.has('regular');
  const hasBold = testedConditions.has('bold');
  const hasHollow = testedConditions.has('hollow');
  const conditionCount = testedConditions.size;

  // Letter-specific: a letter wrong/NR in ALL tested conditions.
  const letterIds = new Set(trials.map(t => `${t.case}:${t.letter}`));
  const letterSpecific: string[] = [];
  for (const key of letterIds) {
    const [, letter] = key.split(':');
    const forLetter = trials.filter(t => `${t.case}:${t.letter}` === key);
    const answered = forLetter.every(t => responses[t.id] !== undefined);
    if (!answered) continue;
    const allWrong = forLetter.every(t => responses[t.id] !== 'correct');
    if (allWrong && forLetter.length >= conditionCount) letterSpecific.push(letter);
  }

  // Case-specific flag: only meaningful when caseSet === 'both'.
  let caseSpecific = false;
  if (caseSet === 'both') {
    const upperCorrect = countCorrect(trials, responses, t => t.case === 'upper');
    const lowerCorrect = countCorrect(trials, responses, t => t.case === 'lower');
    const upperAttempted = countAttempted(trials, responses, t => t.case === 'upper');
    const lowerAttempted = countAttempted(trials, responses, t => t.case === 'lower');
    const upperTotal = trials.filter(t => t.case === 'upper').length;
    const lowerTotal = trials.filter(t => t.case === 'lower').length;
    const upperDenom = session.endedEarly ? upperAttempted : upperTotal;
    const lowerDenom = session.endedEarly ? lowerAttempted : lowerTotal;
    const upperPct = upperDenom > 0 ? (upperCorrect / upperDenom) * 100 : 0;
    const lowerPct = lowerDenom > 0 ? (lowerCorrect / lowerDenom) * 100 : 0;
    caseSpecific = Math.abs(upperPct - lowerPct) >= 15;
  }

  const errors = trials
    .filter(t => {
      const r = responses[t.id];
      return r === 'incorrect' || r === 'nr';
    })
    .map(t => ({
      letter: t.letter,
      case: t.case,
      condition: t.condition,
      response: responses[t.id],
      said: notes[t.id] ?? '',
    }));

  return {
    perCondition,
    filled: { correct: filledCorrect, total: filledDenom, percent: filledPercent },
    hollow: { correct: hollowCorrect, total: hollowDenom, percent: hollowPercent },
    gap,
    flags: {
      fillDependent: hasRegular && hasBold && hasHollow && gap >= 15,
      weightDependent: hasRegular && hasBold && Math.abs(perCondition.regular.percent - perCondition.bold.percent) >= 10,
      letterSpecific,
      caseSpecific,
    },
    errors,
  };
}
