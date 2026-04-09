import { useState } from 'react';
import type { AdminMode, CaseSet, Session } from '@/types';
import { buildTrialList } from '@/data/letters';
import { Button } from '@/components/ui/button';
import { FontPreview } from '@/components/FontPreview';

interface SetupScreenProps {
  onStart: (session: Session) => void;
  onViewHistory: () => void;
  resumable?: Session | null;
  onResume?: () => void;
  onDiscardActive?: () => void;
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function SetupScreen({ onStart, onViewHistory, resumable, onResume, onDiscardActive }: SetupScreenProps) {
  const [studentName, setStudentName] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [caseSet, setCaseSet] = useState<CaseSet | null>(null);
  const [adminMode, setAdminMode] = useState<AdminMode>('by-letter');
  const [randomize, setRandomize] = useState(false);

  const canStart = studentName.trim().length > 0 && caseSet !== null;

  const handleStart = () => {
    if (!canStart || !caseSet) return;
    const nowIso = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    const trials = buildTrialList(caseSet, adminMode, randomize);
    const session: Session = {
      id: newSessionId(),
      studentName: studentName.trim(),
      date: nowIso,
      caseSet,
      adminMode,
      randomized: randomize,
      trials,
      responses: {},
      notes: {},
      startedAt: new Date().toISOString(),
    };
    onStart(session);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Letter Identification Assessment</h1>
        <p className="mt-1 text-slate-600">Font Generalization Probe — Manuscript letters (Regular / Bold / Hollow)</p>
      </header>

      {resumable && (
        <div className="mb-6 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <div className="font-semibold text-amber-900">Resume in-progress session?</div>
          <div className="mt-1 text-sm text-amber-800">
            Student: <b>{resumable.studentName}</b> — {resumable.trials.length} trials,{' '}
            {Object.keys(resumable.responses).length} answered
          </div>
          <div className="mt-3 flex gap-3">
            <Button size="md" variant="primary" onClick={onResume}>Resume</Button>
            <Button size="md" variant="outline" onClick={onDiscardActive}>Discard</Button>
          </div>
        </div>
      )}

      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Student name</label>
          <input
            type="text"
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            placeholder="e.g. Sam Rivera"
            className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-lg focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border-2 border-slate-300 px-4 py-3 text-lg focus:border-slate-900 focus:outline-none"
          />
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-semibold text-slate-700">Case</legend>
          <div className="flex flex-wrap gap-3">
            {(['upper', 'lower', 'both'] as CaseSet[]).map(c => (
              <label
                key={c}
                className={`flex min-h-16 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-lg font-semibold capitalize ${
                  caseSet === c ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="caseSet"
                  value={c}
                  checked={caseSet === c}
                  onChange={() => setCaseSet(c)}
                  className="sr-only"
                />
                {c === 'upper' ? 'Uppercase only' : c === 'lower' ? 'Lowercase only' : 'Both cases'}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 block text-sm font-semibold text-slate-700">Administration order</legend>
          <div className="flex flex-wrap gap-3">
            {([
              { v: 'by-letter', label: 'By letter (A-reg, A-bold, A-hollow, B-reg...)' },
              { v: 'by-condition', label: 'By condition (all letters regular, then all bold, then all hollow)' },
            ] as { v: AdminMode; label: string }[]).map(opt => (
              <label
                key={opt.v}
                className={`flex min-h-16 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-center text-sm font-semibold ${
                  adminMode === opt.v ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="adminMode"
                  value={opt.v}
                  checked={adminMode === opt.v}
                  onChange={() => setAdminMode(opt.v)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={randomize}
            onChange={e => setRandomize(e.target.checked)}
            className="h-6 w-6 cursor-pointer accent-slate-900"
          />
          <span className="font-semibold text-slate-700">Randomize letter order within each case</span>
        </label>

        <FontPreview />

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="xl" disabled={!canStart} onClick={handleStart}>
            Start assessment
          </Button>
          <Button variant="outline" size="xl" onClick={onViewHistory}>
            Session history
          </Button>
        </div>
      </div>
    </div>
  );
}
