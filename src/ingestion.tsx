import { useRef, useState } from 'react';
import { CheckCircle2, ClipboardList, Database, Download, FileWarning, HardDrive, Info, Upload } from 'lucide-react';
import { compact, countries, downloadCsv, ldis, number } from './data';
import { DataTable, Modal, Notice, Panel, Segmented, Stats } from './ui';

const fields = ['calling_number', 'called_number', 'source_ip', 'destination_ip', 'start_time', 'end_time', 'sip_call_id'];
const sample = [
  ['447700900010', '923000000000', '192.0.2.10', '198.51.100.11', '2026-11-21T10:00:00+05:00', '2026-11-21T10:01:47+05:00', 'demo-1@example.test'],
  ['923000000000', '12025550104', '198.51.100.11', '203.0.113.20', '2026-11-21T12:01:00+05:00', '2026-11-21T12:04:01+05:00', 'demo-2@example.test'],
  ['447700900010', '923000000000', '192.0.2.10', '198.51.100.11', '2026-11-21T10:00:00+05:00', '2026-11-21T10:01:47+05:00', 'demo-1@example.test'],
  ['12025550104', '923000000000', 'invalid-ip', '198.51.100.11', '2026-11-21T14:02:04+05:00', '2026-11-21T14:04:01+05:00', 'demo-3@example.test'],
];
type Issue = { row: number; reason: string };
type Batch = { id: string; source: string; filename: string; received: string; accepted: number; rejected: number; duplicates: number; issues: Issue[] };
const seed: Batch[] = [
  { id: 'CDR-1024', source: 'Database', filename: 'Probe extract', received: '21 Nov · 06:00 PKT', accepted: 164238, rejected: 42, duplicates: 30, issues: [{ row: 24, reason: 'End time precedes start time' }, { row: 809, reason: 'Missing SIP Call ID' }, { row: 1915, reason: 'Duplicate SIP Call ID' }] },
  { id: 'CDR-1023', source: 'CSV', filename: 'cdr_20_nov.csv', received: '20 Nov · 08:30 PKT', accepted: 134022, rejected: 0, duplicates: 11, issues: [{ row: 309, reason: 'Duplicate SIP Call ID' }] },
  { id: 'CDR-1022', source: 'Database', filename: 'Probe extract', received: '19 Nov · 06:00 PKT', accepted: 129665, rejected: 16, duplicates: 0, issues: [{ row: 977, reason: 'Invalid destination IP' }] },
];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { field += '"'; index++; }
      else if (quoted || field === '') quoted = !quoted;
      else throw new Error('A quote appeared inside an unquoted field.');
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(field.trim());
      field = '';
      if (char !== ',') { rows.push(row); row = []; }
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('The file ends inside a quoted field.');
  if (row.length || field) rows.push([...row, field.trim()]);
  return rows;
}

function isIp(ip: string) {
  if (ip.includes(':')) {
    if (!/^[0-9a-f:.]+$/i.test(ip)) return false;
    try { new URL('http://[' + ip + ']'); return true; } catch { return false; }
  }
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip) && ip.split('.').every(part => Number(part) <= 255);
}

export function DataView({ notify, batches, setBatches }: { notify: (message: string) => void; batches: Batch[]; setBatches: (update: (previous: Batch[]) => Batch[]) => void }) {
  const [tab, setTab] = useState<'Import history' | 'Reference data'>('Import history');
  const [batch, setBatch] = useState<Batch | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const uploader = useRef<HTMLInputElement>(null);
  const process = async (file: File) => {
    setError('');
    if (file.size > 5_000_000) { setError('Choose a CSV file under 5 MB for this browser demo.'); return; }
    setBusy(true);
    try {
      const [header, ...rows] = parseCsv(await file.text());
      const labels = header?.map(name => name.toLowerCase()) ?? [];
      const indexes = fields.map(field => labels.indexOf(field));
      const missing = fields.filter((_, index) => indexes[index] < 0);
      if (missing.length) throw new Error('Missing CSV columns: ' + missing.join(', ') + '.');
      let accepted = 0, rejected = 0, duplicates = 0;
      const ids = new Set<string>();
      const issues: Issue[] = [];
      for (const [index, row] of rows.entries()) {
        if (row.every(cell => !cell)) continue;
        const [from, to, source, destination, start, end, id] = indexes.map(column => row[column] ?? '');
        let reason = '';
        if (row.length !== labels.length) reason = 'Column count does not match the header';
        else if (!from || !to || !source || !destination || !start || !end || !id) reason = 'A required field is empty';
        else if (![from, to].every(value => /^\+?\d{5,15}$/.test(value))) reason = 'Invalid phone number format';
        else if (!isIp(source) || !isIp(destination)) reason = 'Invalid source or destination IP';
        else if (![start, end].every(value => /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)))) reason = 'Timestamp must be ISO 8601 with an explicit timezone';
        else if (Date.parse(end) < Date.parse(start)) reason = 'End time precedes start time';
        if (reason) { issues.push({ row: index + 2, reason }); rejected++; }
        else if (ids.has(id)) { issues.push({ row: index + 2, reason: 'Duplicate SIP Call ID within this file' }); duplicates++; }
        else { ids.add(id); accepted++; }
      }
      if (!(accepted + rejected + duplicates)) throw new Error('The file contains a header and no call records.');
      const record = {
        id: 'CSV-' + crypto.randomUUID().slice(0, 6).toUpperCase(), source: 'CSV', filename: file.name,
        received: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' }).format(new Date()) + ' PKT',
        accepted, rejected, duplicates, issues,
      };
      setBatches(current => [record, ...current]);
      setTab('Import history');
      setBatch(record);
      notify('CSV validation finished.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The CSV could not be read.'); }
    finally { setBusy(false); }
  };
  return <div className="dashboard-stack">
    <Stats items={[
      { label: 'Import batches', value: number(batches.length), icon: Database, tone: 'blue', note: 'Database and CSV' },
      { label: 'Accepted rows', value: compact(batches.reduce((total, item) => total + item.accepted, 0), 2), icon: CheckCircle2, tone: 'teal', note: 'Passed validation' },
      { label: 'Rejected rows', value: number(batches.reduce((total, item) => total + item.rejected, 0)), icon: FileWarning, tone: 'rose', note: 'Quarantined for review' },
      { label: 'Duplicate rows', value: number(batches.reduce((total, item) => total + item.duplicates, 0)), icon: ClipboardList, tone: 'purple', note: 'Excluded by demo policy' },
    ]} />
    <div className="section-actions"><Segmented label="Data workspace" options={['Import history', 'Reference data'] as const} value={tab} onChange={setTab} /><div className="button-group">
      <button className="button" onClick={() => downloadCsv('callscope-cdr-sample', fields, sample)}><Download size={16} /> Sample CSV</button>
      <button className="button primary" disabled={busy} onClick={() => uploader.current?.click()}><Upload size={16} /> {busy ? 'Validating…' : 'Validate CSV'}</button>
      <input type="file" accept=".csv,text/csv" ref={uploader} className="sr-only" aria-label="CDR CSV file" tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void process(file); }} />
    </div></div>
    {error && <div role="alert" className="notice"><FileWarning size={18} /><div>{error}</div></div>}
    {tab === 'Import history' ? <>
      <Panel title="Batch history" description="Open a batch for validation results and its row-level report">
        <DataTable label="Import batch history" headers={['Batch', 'Source', 'Received', 'Accepted', 'Rejected', 'Duplicates', 'Status']} rows={batches.map(item => [
          <div className="cell-detail"><button className="text-link table-link" onClick={() => setBatch(item)}>{item.id}</button><small>{item.filename}</small></div>,
          <span className="inline-icon"><HardDrive size={14} />{item.source}</span>, item.received, number(item.accepted), number(item.rejected), number(item.duplicates),
          <span className={'pill ' + (item.rejected ? 'warning' : 'success')}>{item.rejected ? 'With errors' : 'Validated'}</span>,
        ])} />
      </Panel>
      <Panel title="CDR import contract" description="CSV headers used by the browser validator"><div className="code-list">{fields.map(field => <code key={field}>{field}</code>)}</div></Panel>
      <Notice>CSV validation runs in your browser and reports row issues. The reporting dashboards use the bundled synthetic dataset.</Notice>
    </> : <div className="even-grid">
      <Panel title="Gateway mappings" description="Sample IP assignments for LDI attribution"><DataTable label="Gateway mappings" headers={['Gateway IP', 'LDI operator', 'Version']} rows={ldis.map((item, index) => [<code>{'198.51.100.' + (11 + index)}</code>, item, 'Demo v1'])} /></Panel>
      <Panel title="Numbering & carrier reference" description="Sample attribution records for the demo dataset"><DataTable label="Numbering and carrier reference" headers={['Country code', 'Country', 'Demo carrier']} rows={countries.map(item => [<code>{item.prefix}</code>, item.name, item.carrier])} /></Panel>
      <Panel title="Pakistan numbering reference" description="The client’s operator allocation dataset will supply production mappings"><DataTable label="Pakistan numbering reference" headers={['Country code', 'Country', 'Network types']} rows={[[<code>+92</code>, 'Pakistan', 'Mobile and fixed-line']]} /></Panel>
    </div>}
    {batch && <Modal close={() => setBatch(null)} title={batch.id + ' · Validation report'} description={batch.filename + ' · ' + batch.received}>
      <div className="batch-summary"><span><strong>{number(batch.accepted)}</strong> accepted</span><span><strong>{number(batch.rejected)}</strong> rejected</span><span><strong>{number(batch.duplicates)}</strong> duplicates</span></div>
      {batch.issues.length ? <DataTable label="Row issues" headers={['CSV row', 'Issue']} rows={batch.issues.map(item => [item.row, item.reason])} /> : <p className="info-strip"><Info size={16} /> No row issues found.</p>}
      <div className="dialog-actions">{!!batch.issues.length && <button className="button" onClick={() => downloadCsv(batch.id + '-issues', ['CSV row', 'Issue'], batch.issues.map(item => [item.row, item.reason]))}><Download size={16} /> Download issues</button>}<button className="button primary" onClick={() => setBatch(null)}>Done</button></div>
    </Modal>}
  </div>;
}

export const initialBatches = seed;
