export type Condition = 'regular' | 'bold' | 'hollow';
export type CaseSet = 'upper' | 'lower' | 'both';
export type AdminMode = 'by-letter' | 'by-condition';
export type TrialResponse = 'correct' | 'incorrect' | 'nr';
export type LetterCase = 'upper' | 'lower';
export type SessionMode = 'baseline' | 'fluency';

export interface Trial {
  id: string;
  letter: string;
  case: LetterCase;
  condition: Condition;
}

export interface Session {
  id: string;
  studentName: string;
  date: string;
  caseSet: CaseSet;
  adminMode: AdminMode;
  randomized: boolean;
  trials: Trial[];
  responses: Record<string, TrialResponse>;
  notes: Record<string, string>;
  startedAt: string;
  completedAt?: string;
  endedEarly?: boolean;
  mode: SessionMode;
  selectedConditions?: Condition[];
  selectedLetters?: string[];
}
