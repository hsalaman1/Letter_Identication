import { useState } from 'react';
import type { Condition, Session } from '@/types';
import { loadHistory, saveHistory } from '@/hooks/useSession';
import { computeResults } from '@/lib/scoring';
import { downloadCsv, downloadJson, downloadPdf, downloadWord } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SessionHistoryProps {
  onBack: () => void;
  onView: (session: Session) => void;
}

export function SessionHistory({ onBack, onView }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>(() => loadHistory());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    const next = sessions.filter(s => s.id !== id);
    setSessions(next);
    saveHistory(next);
    setDeleteId(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Session history</h1>
        <Button variant="outline" size="md" onClick={onBack}>
          ← Back
        </Button>
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          No completed sessions yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map(s => {
            const r = computeResults(s);
            const mode = s.mode ?? 'baseline';
            const testedConditions: Condition[] = mode === 'baseline'
              ? ['regular', 'bold', 'hollow']
              : (['regular', 'bold', 'hollow'] as Condition[]).filter(c =>
                  s.trials.some(t => t.condition === c));
            const hasAll3 = testedConditions.length === 3;
            return (
              <li
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">{s.studentName}</span>
                      <span className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                        mode === 'fluency' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600',
                      )}>
                        {mode}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(s.date).toLocaleDateString()} · {s.caseSet} · {s.adminMode}
                      {s.endedEarly && ' · ended early'}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      {testedConditions.map((c, i) => (
                        <span key={c}>
                          {i > 0 && ' · '}
                          {c.charAt(0).toUpperCase() + c.slice(1)} {r.perCondition[c].percent.toFixed(0)}%
                        </span>
                      ))}
                      {hasAll3 && (
                        <>
                          {' · '}
                          <span className={r.flags.fillDependent ? 'font-semibold text-red-700' : ''}>
                            Gap {r.gap >= 0 ? '+' : ''}{r.gap.toFixed(1)} pp
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" size="md" onClick={() => onView(s)}>
                      View
                    </Button>
                    <Button variant="outline" size="md" onClick={() => downloadPdf(s)}>
                      PDF
                    </Button>
                    <Button variant="outline" size="md" onClick={() => downloadWord(s)}>
                      Word
                    </Button>
                    <Button variant="outline" size="md" onClick={() => downloadCsv(s)}>
                      CSV
                    </Button>
                    <Button variant="outline" size="md" onClick={() => downloadJson(s)}>
                      JSON
                    </Button>
                    <Button variant="danger" size="md" onClick={() => setDeleteId(s.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={open => { if (!open) setDeleteId(null); }}
        title="Delete session?"
        description="This will permanently remove the session from your history. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
      />
    </div>
  );
}
