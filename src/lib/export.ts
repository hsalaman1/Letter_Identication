import type { Session } from '@/types';

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'student';
}

function isoDatePart(iso: string): string {
  return iso.slice(0, 10);
}

function download(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCsv(session: Session): void {
  const header = ['studentName', 'date', 'letter', 'case', 'condition', 'response', 'note', 'timestamp'];
  const rows = [header.join(',')];
  for (const trial of session.trials) {
    const response = session.responses[trial.id] ?? '';
    const note = session.notes[trial.id] ?? '';
    rows.push([
      csvEscape(session.studentName),
      csvEscape(isoDatePart(session.date)),
      csvEscape(trial.letter),
      csvEscape(trial.case),
      csvEscape(trial.condition),
      csvEscape(response),
      csvEscape(note),
      csvEscape(session.date),
    ].join(','));
  }
  const name = `letter-id_${slug(session.studentName)}_${isoDatePart(session.date)}.csv`;
  download(name, rows.join('\n'), 'text/csv;charset=utf-8');
}

export function downloadJson(session: Session): void {
  const name = `letter-id_${slug(session.studentName)}_${isoDatePart(session.date)}.json`;
  download(name, JSON.stringify(session, null, 2), 'application/json');
}
