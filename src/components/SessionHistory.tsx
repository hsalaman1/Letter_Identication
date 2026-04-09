import { useState } from 'react';
import type { Session } from '@/types';
import { loadHistory, saveHistory } from '@/hooks/useSession';
import { computeResults } from '@/lib/scoring';
import { downloadCsv, downloadJson } from '@/lib/export';
import { Button } from '@/components/ui/button';

interface SessionHistoryProps {
  onBack: () => void;
  onView: (session: Session) => void;
}

export function SessionHistory({ onBack, onView }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>(() => loadHistory());

  const handleDelete = (id: string) => {
    const next = sessions.filter(s => s.id !== id);
    setSessions(next);
    saveHistory(next);
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
            return (
              <li
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{s.studentName}</div>
                    <div className="text-sm text-slate-600">
                      {new Date(s.date).toLocaleDateString()} · {s.caseSet} · {s.adminMode}
                      {s.endedEarly && ' · ended early'}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      Regular {r.perCondition.regular.percent.toFixed(0)}% · Bold{' '}
                      {r.perCondition.bold.percent.toFixed(0)}% · Hollow{' '}
                      {r.perCondition.hollow.percent.toFixed(0)}%
                      {' · '}
                      <span className={r.flags.fillDependent ? 'font-semibold text-red-700' : ''}>
                        Gap {r.gap >= 0 ? '+' : ''}{r.gap.toFixed(1)} pp
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" size="md" onClick={() => onView(s)}>
                      View
                    </Button>
                    <Button variant="outline" size="md" onClick={() => downloadCsv(s)}>
                      CSV
                    </Button>
                    <Button variant="outline" size="md" onClick={() => downloadJson(s)}>
                      JSON
                    </Button>
                    <Button variant="danger" size="md" onClick={() => handleDelete(s.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
