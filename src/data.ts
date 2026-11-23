export const countries = [
  { name: 'United Kingdom', code: 'GB', prefix: '+44', coords: [-2, 53], volume: 28, carrier: 'BT Global' },
  { name: 'Saudi Arabia', code: 'SA', prefix: '+966', coords: [46, 24], volume: 25, carrier: 'stc' },
  { name: 'United Arab Emirates', code: 'AE', prefix: '+971', coords: [54, 24], volume: 21, carrier: 'e& Carrier' },
  { name: 'United States', code: 'US', prefix: '+1', coords: [-98, 38], volume: 15, carrier: 'AT&T' },
  { name: 'Germany', code: 'DE', prefix: '+49', coords: [10, 51], volume: 7, carrier: 'Deutsche Telekom' },
  { name: 'Canada', code: 'CA', prefix: '+1', coords: [-104, 56], volume: 6, carrier: 'Bell Canada' },
  { name: 'France', code: 'FR', prefix: '+33', coords: [2, 47], volume: 5, carrier: 'Orange' },
  { name: 'Australia', code: 'AU', prefix: '+61', coords: [134, -25], volume: 4, carrier: 'Telstra' },
  { name: 'Malaysia', code: 'MY', prefix: '+60', coords: [103, 4], volume: 3.5, carrier: 'Telekom Malaysia' },
  { name: 'Qatar', code: 'QA', prefix: '+974', coords: [51, 25], volume: 3, carrier: 'Ooredoo' },
  { name: 'Oman', code: 'OM', prefix: '+968', coords: [57, 21], volume: 2, carrier: 'Omantel' },
  { name: 'Italy', code: 'IT', prefix: '+39', coords: [12, 42], volume: 1.6, carrier: 'Sparkle' },
];
export const ldis = ['PTCL', 'Wateen Telecom', 'Multinet Pakistan', 'Telecard', 'WorldCall'];
export const operators = ['Jazz', 'Zong', 'Telenor Pakistan', 'Ufone', 'PTCL Fixed'];
export const transitPairs = [
  ['United Kingdom', 'United Arab Emirates'], ['Saudi Arabia', 'United Kingdom'],
  ['United States', 'Saudi Arabia'], ['Germany', 'United Arab Emirates'],
  ['United Arab Emirates', 'Malaysia'], ['Canada', 'Saudi Arabia'],
];
export const navigation = [
  { id: 'overview', label: 'Overview', title: 'Executive overview', description: 'Monitor international voice traffic across Pakistan.' },
  { id: 'incoming', label: 'Incoming traffic', title: 'Incoming traffic', description: 'See which countries and carriers send calls to Pakistan, and where those calls land.' },
  { id: 'outgoing', label: 'Outgoing traffic', title: 'Outgoing traffic', description: 'See where calls from Pakistan go and which operators and carriers handle them.' },
  { id: 'countries', label: 'Country analysis', title: 'Country analysis', description: 'Compare traffic by country of origin and destination.' },
  { id: 'operators', label: 'Operator & carrier', title: 'Operator & carrier analysis', description: 'Explore market share and routing by LDI, local operator, and international carrier.' },
  { id: 'industry', label: 'Probe vs. industry', title: 'Probe vs. industry', description: 'Compare probe-derived minutes with daily operator totals reported to PTA.' },
  { id: 'transit', label: 'Transit traffic', title: 'Transit traffic', description: 'Explore demonstration calls routed through Pakistan between foreign countries.' },
  { id: 'non-whitelisted', label: 'Non-whitelisted', title: 'Non-whitelisted traffic', description: 'Review sample traffic flagged by the demonstration gateway whitelist policy.' },
  { id: 'alerts', label: 'Alerts', title: 'Alerts & anomalies', description: 'Monitor active alarms and configure KPI rules.' },
  { id: 'data', label: 'Data quality', title: 'Data quality & ingestion', description: 'Track import batches, validation outcomes, and reference data coverage.' },
] as const;
export type Page = typeof navigation[number]['id'];
export type Direction = 'Incoming' | 'Outgoing';
export type Filters = { direction: 'All' | Direction; country: string; operator: string; ldi: string };
export type Range = { start: string; end: string };
export type Period = 'Hourly' | 'Daily' | 'Weekly' | 'Monthly';
export type Metric = 'calls' | 'minutes';
export type RecordGroup = {
  day: string; direction: Direction | 'Transit'; country: string; destination?: string;
  operator: string; ldi: string; carrier: string; calls: number; seconds: number; flagged: boolean;
};
export const emptyFilters: Filters = { direction: 'All', country: '', operator: '', ldi: '' };
export const latest = '2026-11-21';
export const earliest = '2026-08-24';
const displayDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const dateLabel = (date: string, year = false) => (year ? fullDate : displayDate).format(Date.parse(date));
export const shiftDay = (day: string, amount: number) => new Date(Date.parse(day) + amount * 86_400_000).toISOString().slice(0, 10);
export const preset = (days: number): Range => ({ start: shiftDay(latest, 1 - days), end: latest });
export const rangeLabel = ({ start, end }: Range) => start === end ? dateLabel(end, true) : dateLabel(start) + ' – ' + dateLabel(end, true);
export const daysIn = ({ start, end }: Range) => 1 + Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
export const previousRange = (range: Range): Range => ({ start: shiftDay(range.start, -daysIn(range)), end: shiftDay(range.start, -1) });
export const number = (value: number, decimals = 0) => value.toLocaleString('en-US', { maximumFractionDigits: decimals });
export const compact = (value: number, digits = 1) => value >= 1e6 ? (value / 1e6).toFixed(digits) + 'M' : value >= 1e3 ? (value / 1e3).toFixed(digits) + 'K' : number(value, digits);
export const percentage = (value: number) => number(value, 1) + '%';
export const signed = (value: number) => (value > 0 ? '+' : value < 0 ? '−' : '') + percentage(Math.abs(value));
export const change = (value: number, prior: number) => prior ? 100 * (value - prior) / prior : null;
export const valueFor = (row: { calls: number; seconds: number }, metric: Metric) => metric === 'calls' ? row.calls : row.seconds / 60;
export const duration = (seconds: number) => Math.floor(Math.round(seconds) / 60) + 'm ' + String(Math.round(seconds) % 60).padStart(2, '0') + 's';

const dailyProfile = [0.68, 0.9, 0.79, 1.21, 0.98, 0.88, 0.91, 1.02, 1.25, 1.08, 0.88, 1.29, 1.38, 1.28, 1.33, 1.07, 1.45, 1.58, 1.32, 1.39, 1.08, 1.36, 1.18, 1.51, 1.61, 1.27, 1.38, 1.26, 1.69, 1.51];
const localWeights = [0.34, 0.24, 0.16, 0.15, 0.11];
const ldiWeights = [0.34, 0.25, 0.17, 0.14, 0.10];

// Synthetic aggregate groups share one source so trends, top lists and tables reconcile.
const dataset: RecordGroup[] = [];
for (let offset = -179; offset <= 0; offset++) {
  const day = shiftDay(latest, offset);
  const profile = dailyProfile[(offset + 209) % 30] * (1 + offset * 0.0032);
  for (const [c, country] of countries.entries()) {
    for (const [l, ldi] of ldis.entries()) {
      for (const [o, operator] of operators.entries()) {
        for (const direction of ['Incoming', 'Outgoing'] as const) {
          const variation = 0.89 + (Math.sin(offset * 1.6 + c * 2.1 + l + o * 0.8 + (direction === 'Outgoing' ? 3 : 0)) + 1) * 0.11;
          const directionMix = direction === 'Incoming' ? 1 : 0.64 + (c % 4) * 0.045 + 0.1 * Math.sin(offset * 0.68 + 1);
          const calls = Math.round(country.volume * 530 * profile * localWeights[o] * ldiWeights[l] * directionMix * variation);
          const flagged = (c * 3 + l * 7 + o * 11 + offset + 120 + Number(direction === 'Outgoing') * 5) % 43 === 0;
          dataset.push({ day, direction, country: country.name, operator, ldi, carrier: country.carrier, calls, seconds: calls * (104 + c * 4 + l * 3 + o * 2 + (direction === 'Outgoing' ? 12 : 0)), flagged });
        }
      }
    }
  }
  for (const [index, [country, destination]] of transitPairs.entries()) {
    const calls = Math.round((370 - index * 43) * profile * (1 + Math.sin(offset + index) * 0.16));
    dataset.push({ day, direction: 'Transit', country, destination, operator: '', ldi: ldis[index % ldis.length], carrier: countries.find(item => item.name === country)?.carrier ?? 'Unmatched', calls, seconds: calls * (126 + index * 11), flagged: false });
  }
}

export function selectRecords(range: Range, filters: Filters, page: Page = 'overview') {
  return dataset.filter(row => {
    if (row.day < range.start || row.day > range.end) return false;
    if (page === 'transit' ? row.direction !== 'Transit' : row.direction === 'Transit') return false;
    if (page === 'non-whitelisted' && !row.flagged) return false;
    if (page === 'incoming' && row.direction !== 'Incoming') return false;
    if (page === 'outgoing' && row.direction !== 'Outgoing') return false;
    if (page !== 'transit' && page !== 'incoming' && page !== 'outgoing' && filters.direction !== 'All' && filters.direction !== row.direction) return false;
    return (!filters.country || row.country === filters.country || row.destination === filters.country)
      && (!filters.operator || page === 'transit' || row.operator === filters.operator)
      && (!filters.ldi || row.ldi === filters.ldi);
  });
}

export type Totals = { calls: number; seconds: number };
export function sum(rows: RecordGroup[]): Totals {
  return rows.reduce((total, row) => ({ calls: total.calls + row.calls, seconds: total.seconds + row.seconds }), { calls: 0, seconds: 0 });
}
export function group(rows: RecordGroup[], key: (row: RecordGroup) => string) {
  const groups = new Map<string, Totals>();
  for (const row of rows) {
    const name = key(row);
    const total = groups.get(name) ?? { calls: 0, seconds: 0 };
    total.calls += row.calls;
    total.seconds += row.seconds;
    groups.set(name, total);
  }
  return [...groups].map(([name, totals]) => ({ name, ...totals })).sort((a, b) => b.calls - a.calls);
}

export function timeSeries(rows: RecordGroup[], range: Range, period: Period, metric: Metric) {
  const dates = Array.from({ length: daysIn(range) }, (_, index) => shiftDay(range.start, index));
  const lines = (rows.some(row => row.direction === 'Transit') ? ['Transit'] : ['Incoming', 'Outgoing']) as RecordGroup['direction'][];
  if (period === 'Hourly') {
    const hourly = [1, 0.8, 0.7, 0.6, 0.7, 1, 1.4, 1.8, 2.2, 2.5, 2.8, 3, 3.1, 3, 2.8, 3.1, 3.3, 3.6, 3.8, 4, 3.6, 3, 2.2, 1.5];
    const weight = hourly.reduce((total, value) => total + value, 0);
    return {
      labels: hourly.map((_, index) => String(index).padStart(2, '0') + ':00'),
      series: lines.map(name => {
        const total = valueFor(sum(rows.filter(row => row.direction === name && row.day === range.end)), metric);
        return { name, values: hourly.map(value => Math.round(total * value / weight)) };
      }),
    };
  }
  const bucket = (day: string) => {
    if (period === 'Monthly') return day.slice(0, 7) + '-01';
    if (period === 'Weekly') return shiftDay(day, -((new Date(day).getUTCDay() + 6) % 7));
    return day;
  };
  const buckets = [...new Set(dates.map(bucket))];
  const totals = group(rows, row => row.direction + '|' + bucket(row.day));
  const lookup = new Map(totals.map(item => [item.name, valueFor(item, metric)]));
  return {
    labels: buckets.map(date => period === 'Monthly' ? new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(date)) : dateLabel(date)),
    series: lines.map(name => ({ name, values: buckets.map(date => Math.round(lookup.get(name + '|' + date) ?? 0)) })),
  };
}

export function industryFactor(name: string, direction: string, day: string) {
  return 0.94 + (Math.sin(name.length * 0.7 + Number(day.slice(-2)) * 0.45 + (direction === 'Incoming' ? 0 : 2.7)) + 1) * 0.053;
}

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const safeCell = (value: string | number) => {
    const string = String(value);
    const safe = typeof value === 'string' && /^[=+@\-\t\r\n]/.test(string) ? "'" + string : string;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const content = [header, ...rows].map(row => row.map(safeCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename + '.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
