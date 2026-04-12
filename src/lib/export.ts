import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  HeadingLevel,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import type { Condition, Session, TrialResponse } from '@/types';
import { computeResults } from '@/lib/scoring';

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

function fmtCondResult(r: TrialResponse | 'unanswered' | undefined): string {
  if (r === 'correct') return '\u2713';
  if (r === 'incorrect') return '\u2717';
  if (r === 'nr') return 'NR';
  return '\u2014';
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCsv(session: Session): void {
  const header = ['studentName', 'date', 'mode', 'letter', 'case', 'condition', 'response', 'note', 'sessionDate'];
  const rows = [header.join(',')];
  const mode = session.mode ?? 'baseline';
  for (const trial of session.trials) {
    const response = session.responses[trial.id] ?? '';
    const note = session.notes[trial.id] ?? '';
    rows.push([
      csvEscape(session.studentName),
      csvEscape(isoDatePart(session.date)),
      csvEscape(mode),
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

export function downloadPdf(session: Session): void {
  const mode = session.mode ?? 'baseline';
  const results = computeResults(session);
  const { perCondition, filled, hollow, gap, flags, errors } = results;

  const testedConditions: Condition[] = mode === 'baseline'
    ? ['regular', 'bold', 'hollow']
    : (['regular', 'bold', 'hollow'] as Condition[]).filter(c =>
        session.trials.some(t => t.condition === c));
  const hasAllConds = testedConditions.length === 3;
  const hasRegularAndBold = testedConditions.includes('regular') && testedConditions.includes('bold');
  const hasHollow = testedConditions.includes('hollow');
  const caseSet = session.caseSet;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 40;
  const marginR = 40;
  let y = 40;

  // --- Title ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Letter Identification Assessment', marginL, y);
  y += 22;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${mode === 'fluency' ? 'Fluency' : 'Baseline'} Report`, marginL, y);
  y += 24;

  // --- Session info ---
  doc.setFontSize(10);
  const infoLines = [
    `Student: ${session.studentName}`,
    `Date: ${isoDatePart(session.date)}`,
    `Mode: ${mode}  |  Case: ${caseSet}  |  Order: ${session.adminMode}${session.randomized ? '  |  Randomized' : ''}`,
    `Trials: ${session.trials.length}  |  Answered: ${Object.keys(session.responses).length}${session.endedEarly ? '  |  Ended early' : ''}`,
  ];
  if (mode === 'fluency' && session.selectedConditions) {
    infoLines.push(`Conditions: ${session.selectedConditions.join(', ')}`);
  }
  if (mode === 'fluency' && session.selectedLetters) {
    infoLines.push(`Letters: ${session.selectedLetters.join(' ')}`);
  }
  for (const line of infoLines) {
    doc.text(line, marginL, y);
    y += 14;
  }
  y += 8;

  // --- Score table ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Score by Condition', marginL, y);
  y += 4;

  const scoreHead: string[] = ['Condition'];
  if (caseSet !== 'lower') scoreHead.push('Upper');
  if (caseSet !== 'upper') scoreHead.push('Lower');
  scoreHead.push('Combined', '%');

  const scoreBody = testedConditions.map(c => {
    const row: string[] = [c.charAt(0).toUpperCase() + c.slice(1)];
    if (caseSet !== 'lower') row.push(String(perCondition[c].upper));
    if (caseSet !== 'upper') row.push(String(perCondition[c].lower));
    row.push(String(perCondition[c].combined), `${perCondition[c].percent.toFixed(0)}%`);
    return row;
  });

  autoTable(doc, {
    startY: y,
    head: [scoreHead],
    body: scoreBody,
    theme: 'grid',
    margin: { left: marginL, right: marginR },
    headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    styles: { cellPadding: 4 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY as number) ?? y + 60;
  y += 16;

  // --- Filled / Hollow / Gap summary ---
  if (hasRegularAndBold && hasHollow) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Filled (Regular + Bold):  ${filled.correct} / ${filled.total}  (${filled.percent.toFixed(0)}%)`, marginL, y);
    y += 14;
    doc.text(`Hollow:  ${hollow.correct} / ${hollow.total}  (${hollow.percent.toFixed(0)}%)`, marginL, y);
    y += 14;
    const gapStr = `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} pp`;
    doc.text(`Filled − Hollow Gap:  ${gapStr}${flags.fillDependent ? '  *** FILL-DEPENDENT FLAG ***' : ''}`, marginL, y);
    y += 20;
  }

  // --- Score by Letter table ---
  if (y > 550) { doc.addPage(); y = 40; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Score by Letter', marginL, y);
  y += 4;

  const letterHead: string[] = ['Letter'];
  if (caseSet === 'both') letterHead.push('Case');
  for (const c of testedConditions) letterHead.push(c.charAt(0).toUpperCase() + c.slice(1));
  letterHead.push('Score', '%');

  const letterBody = results.perLetter.map(pl => {
    const row: string[] = [pl.letter];
    if (caseSet === 'both') row.push(pl.case);
    for (const c of testedConditions) row.push(fmtCondResult(pl.conditionResults[c]));
    row.push(`${pl.correct}/${pl.total}`, `${pl.percent.toFixed(0)}%`);
    return row;
  });

  autoTable(doc, {
    startY: y,
    head: [letterHead],
    body: letterBody,
    theme: 'grid',
    margin: { left: marginL, right: marginR },
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    styles: { cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY as number) ?? y + 60;
  y += 16;

  // --- Pattern flags ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Pattern Flags', marginL, y);
  y += 16;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const flagItems: { checked: boolean; label: string }[] = [];
  if (hasAllConds) {
    flagItems.push({ checked: flags.fillDependent, label: 'Fill-dependent deficit (hollow % ≥15 pp below filled %)' });
  }
  if (hasRegularAndBold) {
    flagItems.push({ checked: flags.weightDependent, label: 'Weight-dependent deficit (regular vs bold differ ≥10 pp)' });
  }
  const letterLabel = flags.letterSpecific.length > 0
    ? `Letter-specific deficit — ${flags.letterSpecific.join(', ')}`
    : 'Letter-specific deficit';
  flagItems.push({ checked: flags.letterSpecific.length > 0, label: letterLabel });
  if (caseSet === 'both') {
    flagItems.push({ checked: flags.caseSpecific, label: 'Case-specific deficit (upper vs lower differ ≥15 pp)' });
  }

  for (const f of flagItems) {
    const mark = f.checked ? '[X]' : '[ ]';
    doc.text(`${mark}  ${f.label}`, marginL, y);
    y += 14;
  }

  if (!hasAllConds) {
    y += 4;
    doc.setFontSize(8);
    doc.text('Note: Not all 3 conditions were tested — some pattern flags require all conditions.', marginL, y);
    doc.setFontSize(10);
    y += 14;
  }
  y += 10;

  // --- Error log ---
  if (errors.length > 0) {
    // Check if we need a new page
    if (y > 600) {
      doc.addPage();
      y = 40;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Error Log (${errors.length})`, marginL, y);
    y += 4;

    const errHead = ['Letter', 'Case', 'Condition', 'Response'];
    if (mode === 'baseline') errHead.push('Student said');

    const errBody = errors.map(e => {
      const row = [e.letter, e.case, e.condition, e.response === 'nr' ? 'No response' : e.response];
      if (mode === 'baseline') row.push(e.said || '—');
      return row;
    });

    autoTable(doc, {
      startY: y,
      head: [errHead],
      body: errBody,
      theme: 'grid',
      margin: { left: marginL, right: marginR },
      headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 3 },
    });
  }

  // --- Footer on every page ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(
      `Generated ${new Date().toLocaleString()} — Letter Identification Assessment App`,
      marginL,
      pageH - 20,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - marginR - 60, pageH - 20);
  }

  const name = `letter-id_${slug(session.studentName)}_${isoDatePart(session.date)}.pdf`;
  doc.save(name);
}

// --- Word (DOCX) export ---

const HEADER_SHADING = { type: ShadingType.SOLID, color: '1e293b' };
const HEADER_TEXT_COLOR = 'ffffff';

function wordHeaderCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 18, color: HEADER_TEXT_COLOR, font: 'Calibri' })],
    })],
    shading: HEADER_SHADING,
  });
}

function wordCell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold, size: 18, font: 'Calibri' })],
    })],
  });
}

export async function downloadWord(session: Session): Promise<void> {
  const mode = session.mode ?? 'baseline';
  const results = computeResults(session);
  const { perCondition, filled, hollow, gap, flags, errors } = results;

  const testedConditions: Condition[] = mode === 'baseline'
    ? ['regular', 'bold', 'hollow']
    : (['regular', 'bold', 'hollow'] as Condition[]).filter(c =>
        session.trials.some(t => t.condition === c));
  const hasAllConds = testedConditions.length === 3;
  const hasRegularAndBold = testedConditions.includes('regular') && testedConditions.includes('bold');
  const hasHollow = testedConditions.includes('hollow');
  const caseSet = session.caseSet;

  const sections: (Paragraph | Table)[] = [];

  // --- Title ---
  sections.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: 'Letter Identification Assessment', bold: true, font: 'Calibri' })],
  }));
  sections.push(new Paragraph({
    children: [new TextRun({
      text: `${mode === 'fluency' ? 'Fluency' : 'Baseline'} Report`,
      size: 24,
      color: '64748b',
      font: 'Calibri',
    })],
    spacing: { after: 200 },
  }));

  // --- Session info ---
  const infoLines = [
    `Student: ${session.studentName}`,
    `Date: ${isoDatePart(session.date)}`,
    `Mode: ${mode}  |  Case: ${caseSet}  |  Order: ${session.adminMode}${session.randomized ? '  |  Randomized' : ''}`,
    `Trials: ${session.trials.length}  |  Answered: ${Object.keys(session.responses).length}${session.endedEarly ? '  |  Ended early' : ''}`,
  ];
  if (mode === 'fluency' && session.selectedConditions) {
    infoLines.push(`Conditions: ${session.selectedConditions.join(', ')}`);
  }
  if (mode === 'fluency' && session.selectedLetters) {
    infoLines.push(`Letters: ${session.selectedLetters.join(' ')}`);
  }
  for (const line of infoLines) {
    sections.push(new Paragraph({
      children: [new TextRun({ text: line, size: 20, font: 'Calibri' })],
      spacing: { after: 40 },
    }));
  }

  // --- Score by Condition table ---
  sections.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: 'Score by Condition', bold: true, font: 'Calibri' })],
    spacing: { before: 300, after: 100 },
  }));

  const scoreHead: string[] = ['Condition'];
  if (caseSet !== 'lower') scoreHead.push('Upper');
  if (caseSet !== 'upper') scoreHead.push('Lower');
  scoreHead.push('Combined', '%');

  const scoreHeaderRow = new TableRow({
    children: scoreHead.map(h => wordHeaderCell(h)),
  });

  const scoreBodyRows = testedConditions.map(c => {
    const cells: string[] = [c.charAt(0).toUpperCase() + c.slice(1)];
    if (caseSet !== 'lower') cells.push(String(perCondition[c].upper));
    if (caseSet !== 'upper') cells.push(String(perCondition[c].lower));
    cells.push(String(perCondition[c].combined), `${perCondition[c].percent.toFixed(0)}%`);
    return new TableRow({
      children: cells.map((text, i) => wordCell(text, i === 0)),
    });
  });

  sections.push(new Table({
    rows: [scoreHeaderRow, ...scoreBodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  }));

  // --- Filled / Hollow / Gap summary ---
  if (hasRegularAndBold && hasHollow) {
    sections.push(new Paragraph({
      children: [new TextRun({
        text: `Filled (Regular + Bold):  ${filled.correct} / ${filled.total}  (${filled.percent.toFixed(0)}%)`,
        size: 20,
        font: 'Calibri',
      })],
      spacing: { before: 200, after: 40 },
    }));
    sections.push(new Paragraph({
      children: [new TextRun({
        text: `Hollow:  ${hollow.correct} / ${hollow.total}  (${hollow.percent.toFixed(0)}%)`,
        size: 20,
        font: 'Calibri',
      })],
      spacing: { after: 40 },
    }));
    const gapStr = `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} pp`;
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: `Filled - Hollow Gap:  ${gapStr}`, size: 20, font: 'Calibri' }),
        ...(flags.fillDependent ? [new TextRun({
          text: '  *** FILL-DEPENDENT FLAG ***',
          bold: true,
          color: 'dc2626',
          size: 20,
          font: 'Calibri',
        })] : []),
      ],
      spacing: { after: 100 },
    }));
  }

  // --- Score by Letter table ---
  sections.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: 'Score by Letter', bold: true, font: 'Calibri' })],
    spacing: { before: 300, after: 100 },
  }));

  const letterHead: string[] = ['Letter'];
  if (caseSet === 'both') letterHead.push('Case');
  for (const c of testedConditions) letterHead.push(c.charAt(0).toUpperCase() + c.slice(1));
  letterHead.push('Score', '%');

  const letterHeaderRow = new TableRow({
    children: letterHead.map(h => wordHeaderCell(h)),
  });

  const letterBodyRows = results.perLetter.map(pl => {
    const cells: string[] = [pl.letter];
    if (caseSet === 'both') cells.push(pl.case);
    for (const c of testedConditions) cells.push(fmtCondResult(pl.conditionResults[c]));
    cells.push(`${pl.correct}/${pl.total}`, `${pl.percent.toFixed(0)}%`);
    return new TableRow({
      children: cells.map((text, i) => wordCell(text, i === 0)),
    });
  });

  sections.push(new Table({
    rows: [letterHeaderRow, ...letterBodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  }));

  // --- Pattern flags ---
  sections.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: 'Pattern Flags', bold: true, font: 'Calibri' })],
    spacing: { before: 300, after: 100 },
  }));

  const flagItems: { checked: boolean; label: string }[] = [];
  if (hasAllConds) {
    flagItems.push({ checked: flags.fillDependent, label: 'Fill-dependent deficit (hollow % >= 15 pp below filled %)' });
  }
  if (hasRegularAndBold) {
    flagItems.push({ checked: flags.weightDependent, label: 'Weight-dependent deficit (regular vs bold differ >= 10 pp)' });
  }
  const letterLabel = flags.letterSpecific.length > 0
    ? `Letter-specific deficit - ${flags.letterSpecific.join(', ')}`
    : 'Letter-specific deficit';
  flagItems.push({ checked: flags.letterSpecific.length > 0, label: letterLabel });
  if (caseSet === 'both') {
    flagItems.push({ checked: flags.caseSpecific, label: 'Case-specific deficit (upper vs lower differ >= 15 pp)' });
  }

  for (const f of flagItems) {
    const mark = f.checked ? '[X]' : '[ ]';
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: `${mark}  `, bold: true, size: 20, font: 'Calibri', color: f.checked ? 'dc2626' : '334155' }),
        new TextRun({ text: f.label, size: 20, font: 'Calibri', color: f.checked ? 'dc2626' : '334155' }),
      ],
      spacing: { after: 60 },
    }));
  }

  if (!hasAllConds) {
    sections.push(new Paragraph({
      children: [new TextRun({
        text: 'Note: Not all 3 conditions were tested - some pattern flags require all conditions.',
        italics: true,
        size: 16,
        color: '64748b',
        font: 'Calibri',
      })],
      spacing: { after: 100 },
    }));
  }

  // --- Error log ---
  if (errors.length > 0) {
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: `Error Log (${errors.length})`, bold: true, font: 'Calibri' })],
      spacing: { before: 300, after: 100 },
    }));

    const errHead = ['Letter', 'Case', 'Condition', 'Response'];
    if (mode === 'baseline') errHead.push('Student said');

    const errHeaderRow = new TableRow({
      children: errHead.map(h => wordHeaderCell(h)),
    });

    const errBodyRows = errors.map(e => {
      const cells = [e.letter, e.case, e.condition, e.response === 'nr' ? 'No response' : e.response];
      if (mode === 'baseline') cells.push(e.said || '-');
      return new TableRow({
        children: cells.map(text => wordCell(text)),
      });
    });

    sections.push(new Table({
      rows: [errHeaderRow, ...errBodyRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
  }

  // --- Footer ---
  sections.push(new Paragraph({
    children: [new TextRun({
      text: `Generated ${new Date().toLocaleString()} - Letter Identification Assessment App`,
      size: 14,
      color: '94a3b8',
      font: 'Calibri',
    })],
    spacing: { before: 400 },
  }));

  const doc = new Document({
    sections: [{
      children: sections,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const name = `letter-id_${slug(session.studentName)}_${isoDatePart(session.date)}.docx`;
  saveAs(blob, name);
}
