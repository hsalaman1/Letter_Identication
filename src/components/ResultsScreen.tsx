import { useMemo } from 'react';
import type { Condition, Session } from '@/types';
import { computeResults } from '@/lib/scoring';
import { downloadCsv, downloadJson } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResultsScreenProps {
  session: Session;
  onStartNew: () => void;
  onViewHistory: () => void;
}

function fmt(n: number): string {
  return `${n.toFixed(0)}%`;
}

export function ResultsScreen({ session, onStartNew, onViewHistory }: ResultsScreenProps) {
  const results = useMemo(() => computeResults(session), [session]);
  const { perCondition, filled, hollow, gap, flags, errors } = results;

  const mode = session.mode ?? 'baseline';
  const caseSet = session.caseSet;

  // For fluency sessions, only show conditions that were actually tested.
  const testedConditions: Condition[] = useMemo(() => {
    if (mode === 'baseline') return ['regular', 'bold', 'hollow'];
    const conds = new Set(session.trials.map(t => t.condition));
    return (['regular', 'bold', 'hollow'] as Condition[]).filter(c => conds.has(c));
  }, [mode, session.trials]);

  const hasAllConditions = testedConditions.length === 3;
  const hasRegularAndBold = testedConditions.includes('regular') && testedConditions.includes('bold');
  const hasHollow = testedConditions.includes('hollow');

  // Count unique letters per case for denominator display.
  const letterCounts = useMemo(() => {
    const upper = new Set(session.trials.filter(t => t.case === 'upper').map(t => t.letter)).size;
    const lower = new Set(session.trials.filter(t => t.case === 'lower').map(t => t.letter)).size;
    return { upper, lower, total: upper + lower };
  }, [session.trials]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900">Results</h1>
          <span className={cn(
            'rounded px-2 py-0.5 text-xs font-semibold uppercase',
            mode === 'fluency' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700',
          )}>
            {mode}
          </span>
        </div>
        <div className="mt-1 text-slate-600">
          <span className="font-semibold">{session.studentName}</span> —{' '}
          {new Date(session.date).toLocaleDateString()} · {session.adminMode} ·{' '}
          {session.caseSet === 'both' ? 'both cases' : `${session.caseSet} only`}
          {session.randomized && ' · randomized'}
          {session.endedEarly && ' · ended early'}
        </div>
      </header>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Score by condition</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-2 pr-4 text-sm font-semibold text-slate-600">Condition</th>
                {caseSet !== 'lower' && (
                  <th className="py-2 pr-4 text-sm font-semibold text-slate-600">
                    Upper /{letterCounts.upper}
                  </th>
                )}
                {caseSet !== 'upper' && (
                  <th className="py-2 pr-4 text-sm font-semibold text-slate-600">
                    Lower /{letterCounts.lower}
                  </th>
                )}
                <th className="py-2 pr-4 text-sm font-semibold text-slate-600">
                  Combined /{caseSet === 'both' ? letterCounts.total : (caseSet === 'upper' ? letterCounts.upper : letterCounts.lower)}
                </th>
                <th className="py-2 pr-4 text-sm font-semibold text-slate-600">%</th>
              </tr>
            </thead>
            <tbody>
              {testedConditions.map(c => (
                <tr key={c} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-semibold capitalize text-slate-900">{c}</td>
                  {caseSet !== 'lower' && <td className="py-3 pr-4 tabular-nums">{perCondition[c].upper}</td>}
                  {caseSet !== 'upper' && <td className="py-3 pr-4 tabular-nums">{perCondition[c].lower}</td>}
                  <td className="py-3 pr-4 tabular-nums">{perCondition[c].combined}</td>
                  <td className="py-3 pr-4 tabular-nums font-semibold">{fmt(perCondition[c].percent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Filled/Hollow/Gap summary — only show when meaningful */}
        {hasRegularAndBold && hasHollow && (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <StatCard label="Filled total" value={`${filled.correct} / ${filled.total}`} sub={fmt(filled.percent)} />
            <StatCard label="Hollow total" value={`${hollow.correct} / ${hollow.total}`} sub={fmt(hollow.percent)} />
            <StatCard
              label="Filled − Hollow gap"
              value={`${gap >= 0 ? '+' : ''}${gap.toFixed(1)} pp`}
              sub={flags.fillDependent ? 'Fill-dependent flag' : 'Within normal range'}
              highlight={flags.fillDependent}
            />
          </div>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Pattern flags</h2>

        {!hasAllConditions && (
          <p className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            Not all 3 conditions were tested — some pattern flags require all conditions and are hidden.
          </p>
        )}

        <ul className="space-y-2">
          {hasAllConditions && (
            <FlagRow
              checked={flags.fillDependent}
              label="Fill-dependent deficit"
              detail="Hollow % is ≥15 pp below filled %"
            />
          )}
          {hasRegularAndBold && (
            <FlagRow
              checked={flags.weightDependent}
              label="Weight-dependent deficit"
              detail="Regular % and Bold % differ by ≥10 pp"
            />
          )}
          <FlagRow
            checked={flags.letterSpecific.length > 0}
            label={`Letter-specific deficit${flags.letterSpecific.length > 0 ? ` — ${flags.letterSpecific.join(', ')}` : ''}`}
            detail={`Letter was incorrect/NR in all ${testedConditions.length} tested condition${testedConditions.length !== 1 ? 's' : ''}`}
          />
          {caseSet === 'both' && (
            <FlagRow
              checked={flags.caseSpecific}
              label="Case-specific deficit"
              detail="Upper vs lower overall accuracy differ by ≥15 pp"
            />
          )}
        </ul>
      </section>

      {errors.length > 0 && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Error log ({errors.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-4 text-sm font-semibold text-slate-600">Letter</th>
                  <th className="py-2 pr-4 text-sm font-semibold text-slate-600">Case</th>
                  <th className="py-2 pr-4 text-sm font-semibold text-slate-600">Condition</th>
                  <th className="py-2 pr-4 text-sm font-semibold text-slate-600">Response</th>
                  {mode === 'baseline' && (
                    <th className="py-2 pr-4 text-sm font-semibold text-slate-600">Student said</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={`${e.letter}-${e.case}-${e.condition}-${i}`} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-mono text-lg">{e.letter}</td>
                    <td className="py-2 pr-4 capitalize text-slate-600">{e.case}</td>
                    <td className="py-2 pr-4 capitalize text-slate-600">{e.condition}</td>
                    <td className="py-2 pr-4 capitalize text-slate-600">{e.response === 'nr' ? 'No response' : e.response}</td>
                    {mode === 'baseline' && (
                      <td className="py-2 pr-4 text-slate-900">{e.said || <span className="text-slate-400">—</span>}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="flex flex-wrap gap-3">
        <Button variant="primary" size="lg" onClick={() => downloadCsv(session)}>
          Export CSV
        </Button>
        <Button variant="outline" size="lg" onClick={() => downloadJson(session)}>
          Export JSON
        </Button>
        <Button variant="outline" size="lg" onClick={onViewHistory}>
          View history
        </Button>
        <Button variant="ghost" size="lg" onClick={onStartNew}>
          Start new session
        </Button>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4',
        highlight ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
      {sub && (
        <div className={cn('text-sm font-semibold', highlight ? 'text-red-700' : 'text-slate-600')}>{sub}</div>
      )}
    </div>
  );
}

function FlagRow({ checked, label, detail }: { checked: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2',
          checked ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 bg-white',
        )}
        aria-hidden
      >
        {checked ? '✓' : ''}
      </div>
      <div>
        <div className={cn('font-semibold', checked ? 'text-red-700' : 'text-slate-700')}>{label}</div>
        <div className="text-sm text-slate-500">{detail}</div>
      </div>
    </li>
  );
}
