import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Condition, Session, TrialResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { LetterDisplay } from '@/components/LetterDisplay';
import { cn } from '@/lib/utils';

interface FluencyTrialScreenProps {
  session: Session;
  index: number;
  onRecordAndAdvance: (trialId: string, response: TrialResponse) => void;
  onPrev: () => void;
  onFinish: () => void;
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

export function FluencyTrialScreen({
  session,
  index,
  onRecordAndAdvance,
  onPrev,
  onFinish,
}: FluencyTrialScreenProps) {
  const trial = session.trials[index];
  const response = session.responses[trial.id];
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const answered = useMemo(() => Object.keys(session.responses).length, [session.responses]);
  const total = session.trials.length;
  const progressPct = total > 0 ? ((index + 1) / total) * 100 : 0;

  const handleResponse = useCallback((r: TrialResponse) => {
    onRecordAndAdvance(trial.id, r);
  }, [trial.id, onRecordAndAdvance]);

  // Arrow-key nav: left = prev only.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev]);

  // Swipe: right-swipe → prev.
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
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold uppercase text-blue-700">
              Fluency
            </span>
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', conditionChipClass[trial.condition])}>
              {conditionLabel[trial.condition]}
            </span>
            <span className="text-sm text-slate-600">
              {index + 1} / {total}
            </span>
            <span className="text-xs text-slate-400">· {answered} answered</span>
          </div>
          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            className="rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            End early
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Letter display */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div
          className="flex w-full max-w-[min(90vw,900px)] items-center justify-center rounded-2xl border-4 border-slate-200 bg-white aspect-square md:aspect-[4/3]"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <LetterDisplay letter={trial.letter} condition={trial.condition} />
        </div>

        {/* Response buttons */}
        <div className="mt-6 w-full max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="correct"
              size="xl"
              onClick={() => handleResponse('correct')}
              className={cn('text-2xl', response === 'correct' && 'ring-4 ring-emerald-300')}
            >
              Correct
            </Button>
            <Button
              variant="incorrect"
              size="xl"
              onClick={() => handleResponse('incorrect')}
              className={cn('text-2xl', response === 'incorrect' && 'ring-4 ring-red-300')}
            >
              Incorrect
            </Button>
          </div>

          {/* Prev button for correcting mis-taps */}
          <div className="mt-4">
            <Button variant="outline" size="lg" onClick={onPrev} disabled={index === 0} className="w-full">
              ← Previous (undo)
            </Button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title="End fluency session early?"
        description="Results will be computed from answered trials only."
        confirmLabel="End early"
        onConfirm={() => {
          setShowEndConfirm(false);
          onFinish();
        }}
      />
    </div>
  );
}
