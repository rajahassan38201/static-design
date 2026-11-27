import { jsPDF } from 'jspdf';
import ahamsonLogo from '../Ahamson logo.png';
import { change, dateLabel, daysIn, group, ldiRoster, selectRecords, shiftDay, type Filters } from './data';

type TrafficPage = 'incoming' | 'outgoing';
const ink = '#172842';
const muted = '#4a5b72';
const rule = '#d9e2ed';
const wash = '#f2f6fa';
const thresholdRed = '#b42318';
const changeThreshold = 5;
const left = 14;
const right = 283;
const width = right - left;
const weekdayDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
const minutesFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const periodColumns = [
  { end: 128, minutes: 123, percent: null },
  { end: 179, minutes: 156, percent: 175 },
  { end: 231, minutes: 208, percent: 227 },
  { end: 283, minutes: 260, percent: 279 },
];

function write(pdf: jsPDF, text: string, x: number, y: number, options: {
  size?: number; color?: string; bold?: boolean; align?: 'left' | 'right' | 'center';
} = {}) {
  const { size = 9, color = ink, bold = false, align = 'left' } = options;
  pdf.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size).setTextColor(color);
  pdf.text(text, x, y, { align });
}

function divider(pdf: jsPDF, y: number) {
  pdf.setDrawColor(rule).setLineWidth(0.22).line(left, y, right, y);
}

async function drawBrand(pdf: jsPDF) {
  const logo = await fetch(ahamsonLogo)
    .then(response => response.ok ? response.arrayBuffer() : null)
    .catch(() => null);
  if (!logo) {
    write(pdf, 'AHamson', left, 15, { size: 14, bold: true });
    return;
  }
  // Crop the square source to the wordmark within the report header.
  const scale = 36 / 409;
  pdf.saveGraphicsState();
  pdf.rect(left, 10, 36, 59 * scale, null).clip().discardPath();
  pdf.addImage(new Uint8Array(logo), 'PNG', left - 14 * scale, 10 - 192 * scale, 447 * scale, 447 * scale);
  pdf.restoreGraphicsState();
}

function formatChange(value: number | null, baseline: number | null) {
  const percent = value == null || baseline == null ? null : change(value, baseline);
  if (percent == null) return { text: 'N/A', highlight: false };
  const rounded = Math.round(Math.abs(percent) * 10) / 10;
  const text = (rounded ? (percent > 0 ? '+' : '-') : '') + rounded.toFixed(1) + '%';
  return { text, highlight: rounded >= changeThreshold };
}

export async function downloadTrafficPdf(page: TrafficPage, day: string, filters: Filters) {
  const incoming = page === 'incoming';
  const title = incoming ? 'Incoming traffic' : 'Outgoing traffic';
  const accent = incoming ? '#3047aa' : '#126b60';
  const accentWash = incoming ? '#eaf0ff' : '#e7f5f2';
  const weekAgo = shiftDay(day, -7);
  const previous = shiftDay(day, -1);
  const monthStart = shiftDay(day, -30);
  const periods = [
    { label: 'Report day', start: day, end: day },
    { label: 'Same weekday last week', start: weekAgo, end: weekAgo },
    { label: 'Prior 7 days', start: weekAgo, end: previous },
    { label: 'Prior 30 days', start: monthStart, end: previous },
  ].map(period => ({
    ...period,
    dates: Array.from({ length: daysIn(period) }, (_, index) => shiftDay(period.start, index)),
    caption: period.start === period.end
      ? dateLabel(period.end, true)
      : dateLabel(period.start, period.start.slice(0, 4) !== period.end.slice(0, 4)) + ' - ' + dateLabel(period.end, true),
  }));
  const records = selectRecords({ start: monthStart, end: day }, filters, page);
  const secondsByDayAndOperator = new Map(group(records, row => row.day + '|' + row.ldi)
    .map(({ name, seconds }) => [name, seconds]));
  const operators = ldiRoster
    .filter(({ key }) => !filters.ldi || key === filters.ldi)
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const reported = operators.map(operator => ({
    ...operator,
    minutes: periods.map(period => {
      let seconds = 0;
      for (const date of period.dates) {
        const value = secondsByDayAndOperator.get(date + '|' + operator.key);
        if (value == null) return null;
        seconds += value;
      }
      return seconds / 60 / period.dates.length;
    }),
  }));
  const totals = periods.map((_, index) => {
    const values = reported.map(row => row.minutes[index]);
    return values.length && values.every(value => value != null)
      ? values.reduce((total, value) => total + value, 0)
      : null;
  });

  const pdf = new jsPDF({ format: 'a4', orientation: 'landscape', unit: 'mm', compress: true });
  pdf.setProperties({ title: title + ' | LDI minutes | ' + day, subject: 'Pakistan international voice traffic minutes by licensee', author: 'AHamson' });
  pdf.setFillColor(accent).rect(0, 0, 297, 2, 'F');
  await drawBrand(pdf);
  write(pdf, 'PAKISTAN INTERNATIONAL VOICE TRAFFIC', right, 13, { size: 8.5, bold: true, color: accent, align: 'right' });
  write(pdf, weekdayDate.format(Date.parse(day)) + '  |  PKT (UTC+5)', right, 18.3, { size: 8.7, align: 'right', color: muted });
  divider(pdf, 22.5);
  write(pdf, title, left, 34.5, { size: 26, bold: true });
  write(pdf, 'LDI minutes by operator', left, 42, { size: 12, bold: true, color: accent });
  const scope = ['Country  ' + (filters.country || 'All'), 'Local operator  ' + (filters.operator || 'All'), 'LDI  ' + (filters.ldi || 'All')];
  write(pdf, scope.join('  /  '), left, 48.3, { size: 8.8, color: muted });

  pdf.setFillColor(accent).rect(left, 53, width, 12, 'F');
  write(pdf, 'Licensee', left + 3, 60.5, { size: 9.5, bold: true, color: '#ffffff' });
  periods.forEach(({ label, caption }, index) => {
    const start = index === 0 ? 96 : periodColumns[index - 1].end;
    const center = (start + periodColumns[index].end) / 2;
    write(pdf, label, center, 57.7, { size: 9.2, bold: true, color: '#ffffff', align: 'center' });
    write(pdf, caption, center, 62.3, { size: 8, color: '#ffffff', align: 'center' });
  });
  pdf.setFillColor(wash).rect(left, 65, width, 6, 'F');
  periodColumns.forEach(({ minutes, percent }, index) => {
    write(pdf, index < 2 ? 'Minutes' : 'Daily avg (min)', minutes, 69.1, { size: 8.2, bold: true, align: 'right', color: muted });
    if (percent != null) write(pdf, 'Change', percent, 69.1, { size: 8.2, bold: true, align: 'right', color: muted });
  });

  function drawRow(name: string, minutes: (number | null)[], y: number, total = false) {
    write(pdf, name, left + 3, y, { size: total ? 9.5 : 8.8, bold: total });
    periodColumns.forEach((column, index) => {
      const value = minutes[index];
      write(pdf, value == null ? 'N/A' : minutesFormat.format(value), column.minutes, y, {
        size: 8.8, bold: total || index === 0, align: 'right',
      });
      if (column.percent != null) {
        const { text, highlight } = formatChange(minutes[0], value);
        write(pdf, text, column.percent, y, {
          size: 8.6, bold: total, align: 'right', color: highlight ? thresholdRed : accent,
        });
      }
    });
  }

  pdf.setFillColor(accentWash).rect(left, 71, width, 7, 'F');
  drawRow('Total across selected operators', totals, 75.6, true);
  let rowTop = 78;
  for (const category of ['LDI', 'Integrated'] as const) {
    const section = reported.filter(row => row.category === category);
    if (!section.length) continue;
    write(pdf, category + ' licensees', left + 3, rowTop + 3.7, { size: 8.5, bold: true, color: accent });
    rowTop += 5;
    section.forEach(({ name, minutes }, index) => {
      if (index % 2 === 0) pdf.setFillColor(wash).rect(left, rowTop, width, 5, 'F');
      drawRow(name, minutes, rowTop + 3.6);
      rowTop += 5;
    });
  }
  if (!reported.length) write(pdf, 'No licensees match this selection.', left + 3, 84, { color: muted });

  divider(pdf, 197);
  write(pdf, 'Change compares the report day with each baseline. Prior averages exclude the report day. N/A indicates missing history or a zero baseline for change.', left, 201.3, { size: 7.6, color: muted });
  write(pdf, 'Synthetic demonstration minutes  |  Licensee roster supplied for 13 May 2025', left, 205.4, { size: 7.6, color: muted });
  write(pdf, 'Red marks changes of ' + changeThreshold + '% or more in either direction.', right, 205.4, { size: 7.6, color: muted, align: 'right' });
  await pdf.save('traffic-' + page + '-' + day + '.pdf', { returnPromise: true });
}
