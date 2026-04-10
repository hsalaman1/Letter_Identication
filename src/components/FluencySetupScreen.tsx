import { useState } from 'react';
import type { CaseSet, Condition, Session } from '@/types';
import { UPPER, LOWER, buildFluencyTrialList } from '@/data/letters';
import { Button } from '@/components/ui/button';
import { FontPreview } from '@/components/FontPreview';
import { cn, newSessionId } from '@/lib/utils';

interface FluencySetupScreenProps {
  onStart: (session: Session) => void;
  onBack: () => void;
}

const ALL_CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'bold', label: 'Bold' },
  { value: 'hollow', label: 'Hollow' },
];

export function FluencySetupScreen({ onStart, onBack }: FluencySetupScreenProps) {
  const [studentName, setStudentName] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [caseSet, setCaseSet] = useState<CaseSet>('upper');
  const [conditions, setConditions] = useState<Set<Condition>>(new Set(['regular']));
  const [selectedLetters, setSelectedLetters] = useState<Set<string>>(new Set());
  const [randomize, setRandomize] = useState(true);

  const visibleUpper = caseSet === 'lower' ? [] : UPPER;
  const visibleLower = caseSet === 'upper' ? [] : LOWER;

  const toggleCondition = (c: Condition) => {
    setConditions(prev => {
      const next = new Set(prev);
      if (next.has(c)) {
        if (next.size > 1) next.delete(c);
      } else {
        next.add(c);
      }
      return next;
    });
  };

  const toggleLetter = (letter: string) => {
    setSelectedLetters(prev => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  };

  const selectAllCase = (letters: string[]) => {
    setSelectedLetters(prev => {
      const next = new Set(prev);
      const allSelected = letters.every(l => next.has(l));
      if (allSelected) {
        for (const l of letters) next.delete(l);
      } else {
        for (const l of letters) next.add(l);
      }
      return next;
    });
  };

  // When case changes, prune letters that are no longer visible.
  const handleCaseChange = (c: CaseSet) => {
    setCaseSet(c);
    setSelectedLetters(prev => {
      const next = new Set<string>();
      for (const l of prev) {
        const isUpper = l === l.toUpperCase();
        if (c === 'both' || (c === 'upper' && isUpper) || (c === 'lower' && !isUpper)) {
          next.add(l);
        }
      }
      return next;
    });
  };

  const letters = [...selectedLetters];
  const trialCount = letters.length * conditions.size;
  const canStart = studentName.trim().length > 0 && conditions.size > 0 && letters.length > 0;

  const handleStart = () => {
    if (!canStart) return;
    const condArr = [...conditions];
    const nowIso = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    const trials = buildFluencyTrialList(letters, condArr, randomize);
    const session: Session = {
      id: newSessionId(),
      studentName: studentName.trim(),
      date: nowIso,
      caseSet,
      adminMode: 'by-letter',
      randomized: randomize,
      trials,
      responses: {},
      notes: {},
      startedAt: new Date().toISOString(),
      mode: 'fluency',
      selectedConditions: condArr,
      selectedLetters: letters,
    };
    onStart(session);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center gap-4">
        <Button variant="outline" size="md" onClick={onBack}>← Back</Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fluency Session</h1>
          <p className="mt-1 text-slate-600">Select conditions, case, and specific letters to practice</p>
        </div>
      </header>

      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Student name */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Student name</label>
          <input
            type="text"
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            placeholder="e.g. Sam Rivera"
            className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-lg focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Date */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border-2 border-slate-300 px-4 py-3 text-lg focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Conditions */}
        <fieldset>
          <legend className="mb-2 block text-sm font-semibold text-slate-700">Conditions (select at least one)</legend>
          <div className="flex flex-wrap gap-3">
            {ALL_CONDITIONS.map(c => (
              <label
                key={c.value}
                className={cn(
                  'flex min-h-14 cursor-pointer items-center justify-center rounded-lg border-2 px-5 py-3 text-base font-semibold',
                  conditions.has(c.value)
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white text-slate-900',
                )}
              >
                <input
                  type="checkbox"
                  checked={conditions.has(c.value)}
                  onChange={() => toggleCondition(c.value)}
                  className="sr-only"
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Case */}
        <fieldset>
          <legend className="mb-2 block text-sm font-semibold text-slate-700">Case</legend>
          <div className="flex flex-wrap gap-3">
            {(['upper', 'lower', 'both'] as CaseSet[]).map(c => (
              <label
                key={c}
                className={cn(
                  'flex min-h-14 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-base font-semibold capitalize',
                  caseSet === c
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white text-slate-900',
                )}
              >
                <input
                  type="radio"
                  name="caseSet"
                  value={c}
                  checked={caseSet === c}
                  onChange={() => handleCaseChange(c)}
                  className="sr-only"
                />
                {c === 'upper' ? 'Uppercase' : c === 'lower' ? 'Lowercase' : 'Both'}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Letter grid */}
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">Letters (tap to select)</div>

          {visibleUpper.length > 0 && (
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Uppercase</span>
                <button
                  type="button"
                  onClick={() => selectAllCase(UPPER)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {UPPER.every(l => selectedLetters.has(l)) ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visibleUpper.map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLetter(l)}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-lg border-2 text-base font-bold transition-colors',
                      selectedLetters.has(l)
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {visibleLower.length > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lowercase</span>
                <button
                  type="button"
                  onClick={() => selectAllCase(LOWER)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {LOWER.every(l => selectedLetters.has(l)) ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visibleLower.map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLetter(l)}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-lg border-2 text-base font-bold transition-colors',
                      selectedLetters.has(l)
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {letters.length > 0 && (
            <div className="mt-2 text-sm text-slate-600">
              {letters.length} letter{letters.length !== 1 && 's'} × {conditions.size} condition{conditions.size !== 1 && 's'} = <b>{trialCount} trials</b>
            </div>
          )}
        </div>

        {/* Randomize */}
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={randomize}
            onChange={e => setRandomize(e.target.checked)}
            className="h-6 w-6 cursor-pointer accent-blue-600"
          />
          <span className="font-semibold text-slate-700">Randomize letter order</span>
        </label>

        <FontPreview />

        <Button variant="primary" size="xl" disabled={!canStart} onClick={handleStart} className="w-full bg-blue-600 hover:bg-blue-700">
          Start fluency session ({trialCount} trials)
        </Button>
      </div>
    </div>
  );
}
