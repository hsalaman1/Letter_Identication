import type { Session } from '@/types';
import { Button } from '@/components/ui/button';
import { ClipboardList, Zap } from 'lucide-react';

interface HomeScreenProps {
  onBaseline: () => void;
  onFluency: () => void;
  onViewHistory: () => void;
  resumable?: Session | null;
  onResume?: () => void;
  onDiscardActive?: () => void;
}

export function HomeScreen({
  onBaseline,
  onFluency,
  onViewHistory,
  resumable,
  onResume,
  onDiscardActive,
}: HomeScreenProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Letter Identification Assessment</h1>
        <p className="mt-2 text-lg text-slate-600">
          Font Generalization Probe — Manuscript letters
        </p>
      </header>

      {resumable && (
        <div className="mb-8 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <div className="font-semibold text-amber-900">Resume in-progress session?</div>
          <div className="mt-1 text-sm text-amber-800">
            <span className="inline-block rounded bg-amber-200 px-1.5 py-0.5 text-xs font-semibold uppercase">
              {resumable.mode ?? 'baseline'}
            </span>{' '}
            Student: <b>{resumable.studentName}</b> — {resumable.trials.length} trials,{' '}
            {Object.keys(resumable.responses).length} answered
          </div>
          <div className="mt-3 flex gap-3">
            <Button size="md" variant="primary" onClick={onResume}>Resume</Button>
            <Button size="md" variant="outline" onClick={onDiscardActive}>Discard</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <button
          type="button"
          onClick={onBaseline}
          className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-sm transition-colors hover:border-slate-900 hover:bg-slate-50"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
            <ClipboardList size={32} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">Gather Baseline</div>
            <p className="mt-1 text-sm text-slate-600">
              Full assessment across all 3 conditions (regular, bold, hollow).
              Score each trial as Correct, Incorrect, or No Response.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onFluency}
          className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-sm transition-colors hover:border-blue-600 hover:bg-blue-50"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            <Zap size={32} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">Fluency Session</div>
            <p className="mt-1 text-sm text-slate-600">
              Pick specific letters, conditions, and case. Quick Correct/Incorrect
              scoring with auto-advance.
            </p>
          </div>
        </button>
      </div>

      <div className="mt-8 text-center">
        <Button variant="ghost" size="md" onClick={onViewHistory}>
          Session history
        </Button>
      </div>
    </div>
  );
}
