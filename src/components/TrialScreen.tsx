import { useEffect, useMemo, useRef, useState } from 'react';
import type { Condition, Session, TrialResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { LetterDisplay } from '@/components/LetterDisplay';
import { cn } from '@/lib/utils';

interface TrialScreenProps {
  session: Session;
  index: number;
  onRecord: (trialId: string, response: TrialResponse) => void;
  onNote: (trialId: string, note: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onEndEarly: () => void;
}

const conditionLabel: Record<Condition, string> = {
  regular: 'Regular',
  bold: 'Bold',
  hollow: 'Hollow',
};

const conditionChipClass: Record<Condition, string> = {
  regular: 'bg-slate-200 text-slate-900',
  bold: 'bg-slate-900 text-white',
  hollow: 'bg-white text-slate-900 border-2 border-slate-900',
};

export function TrialScreen({
  session,
  index,
  onRecord,
  onNote,
  onPrev,
  onNext,
  onEndEarly,
}: TrialScreenProps) {
  const trial = session.trials[index];
  const response = session.responses[trial.id];
  const note = session.notes[trial.id] ?? '';

  const [remaining, setRemaining] = useState(5);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const progress = useMemo(() => `Trial ${index + 1} of ${session.trials.length}`, [index, session.trials.length]);

  // 5-second visual countdown — visual only, no auto-advance.
  useEffect(() => {
    setRemaining(5);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, 5 - elapsed);
      setRemaining(left);
      if (left <= 0) window.clearInterval(interval);
    }, 50);
    return () => window.clearInterval(interval);
  }, [trial.id]);

  // Arrow-key nav.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext]);

  const timesUp = remaining <= 0;
  const answered = Object.keys(session.responses).length;

  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0) onPrev();
    else onNext();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', conditionChipClass[trial.condition])}>
            {conditionLabel[trial.condition]}
          </span>
          <span className="text-sm text-slate-600">{progress}</span>
          <span className="text-xs text-slate-400">· {answered} answered</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-md px-3 py-1 text-sm font-mono font-bold tabular-nums',
              timesUp ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700',
            )}
          >
            {remaining.toFixed(1)}s
          </div>
          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            className="rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            End early
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div
          className={cn(
            'flex w-full max-w-[min(90vw,900px)] items-center justify-center rounded-2xl border-4 bg-white',
            'aspect-square md:aspect-[4/3]',
            timesUp ? 'border-red-500 animate-pulse' : 'border-slate-200',
          )}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <LetterDisplay letter={trial.letter} condition={trial.condition} />
        </div>

        <div className="mt-6 w-full max-w-3xl">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="correct"
              size="xl"
              onClick={() => onRecord(trial.id, 'correct')}
              className={cn(response === 'correct' && 'ring-4 ring-emerald-300')}
            >
              Correct
            </Button>
            <Button
              variant="incorrect"
              size="xl"
              onClick={() => onRecord(trial.id, 'incorrect')}
              className={cn(response === 'incorrect' && 'ring-4 ring-red-300')}
            >
              Incorrect
            </Button>
            <Button
              variant="nr"
              size="xl"
              onClick={() => onRecord(trial.id, 'nr')}
              className={cn(response === 'nr' && 'ring-4 ring-zinc-300')}
            >
              No response
            </Button>
          </div>

          {response === 'incorrect' && (
            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                What did the student say?
              </label>
              <textarea
                value={note}
                onChange={e => onNote(trial.id, e.target.value)}
                placeholder="Optional notes on the error"
                className="w-full rounded-lg border-2 border-slate-300 p-3 text-base focus:border-slate-900 focus:outline-none"
                rows={2}
              />
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" size="xl" onClick={onPrev} disabled={index === 0}>
              ← Previous
            </Button>
            <Button
              variant="primary"
              size="xl"
              onClick={() => {
                if (index === session.trials.length - 1) onEndEarly();
                else onNext();
              }}
            >
              {index === session.trials.length - 1 ? 'Finish →' : 'Next →'}
            </Button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title="End assessment early?"
        description="You can still view and export results. Unanswered trials will be excluded from totals."
        confirmLabel="End early"
        onConfirm={() => {
          setShowEndConfirm(false);
          onEndEarly();
        }}
      />
    </div>
  );
}
