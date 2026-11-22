import { useEffect, useState } from 'react';
import { Activity, Bell, BellRing, CheckCircle2, CircleAlert, Clock3, Pencil, Play, Plus, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { change, compact, countries, dateLabel, emptyFilters, industryFactor, latest, ldis, operators, selectRecords, shiftDay, sum, timeSeries, type Filters } from './data';
import { DataTable, Empty, Modal, Panel, Segmented, Select, Stats } from './ui';

const severities = ['Information', 'Warning', 'Major', 'Critical'] as const;
type Severity = typeof severities[number];
type Status = 'Open' | 'Resolved' | 'Closed';
const conditions = ['Above', 'Below', 'Outside range', 'Change from previous', 'Change from baseline', 'No data'] as const;
const metrics = ['Calls', 'Minutes', 'Average duration', 'Call share', 'Minute share', 'Call growth', 'Minute growth', 'Probe variance'] as const;
type Rule = {
  id: string; name: string; metric: typeof metrics[number]; direction: Filters['direction']; country: string; operator: string; ldi: string;
  window: 'Hour' | 'Day' | 'Week'; condition: typeof conditions[number]; threshold: number; upper: number; severity: Severity;
  hours: 'All day' | 'Custom hours'; startHour: string; endHour: string; enabled: boolean;
};
export type Alarm = { id: string; rule: string; name: string; scope: string; description: string; severity: Severity; status: Status; started: string };
const templates: Rule[] = [
  { id: 'volume', name: 'High inbound volume', metric: 'Calls', direction: 'Incoming', country: '', operator: '', ldi: '', window: 'Day', condition: 'Above', threshold: 85000, upper: 0, severity: 'Critical', hours: 'All day', startHour: '09:00', endHour: '18:00', enabled: true },
  { id: 'traffic', name: 'Low outbound traffic', metric: 'Minutes', direction: 'Outgoing', country: 'United Kingdom', operator: '', ldi: '', window: 'Day', condition: 'Below', threshold: 29000, upper: 0, severity: 'Warning', hours: 'All day', startHour: '09:00', endHour: '18:00', enabled: true },
  { id: 'missing', name: 'No data received', metric: 'Calls', direction: 'All', country: '', operator: '', ldi: 'Telecard', window: 'Hour', condition: 'No data', threshold: 0, upper: 0, severity: 'Major', hours: 'All day', startHour: '09:00', endHour: '18:00', enabled: true },
];
const seeds: Alarm[] = [
  { id: 'alert-571', rule: 'volume', name: 'High inbound volume', scope: 'Incoming · All operators', description: 'Inbound calls exceeded the daily threshold.', severity: 'Critical', status: 'Open', started: '21 Nov · 15:20 PKT' },
  { id: 'alert-570', rule: 'traffic', name: 'Low outbound traffic', scope: 'Outgoing · United Kingdom', description: 'Outbound minutes fell below the configured threshold.', severity: 'Warning', status: 'Open', started: '21 Nov · 13:45 PKT' },
  { id: 'alert-554', rule: 'missing', name: 'No data received', scope: 'Telecard', description: 'Incoming CDR flow resumed in the next window.', severity: 'Major', status: 'Resolved', started: '20 Nov · 10:05 PKT' },
];

function useSaved<T>(key: string, seed: T) {
  const [value, setValue] = useState<T>(() => {
    try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) as T : seed; }
    catch { return seed; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The session remains usable without storage. */ } }, [key, value]);
  return [value, setValue] as const;
}

function previousWindow(rule: Rule, end: string, length: number, hour: number, windows = 1) {
  if (rule.window !== 'Hour') return { end: shiftDay(end, -length * windows), hour };
  const shiftedHour = hour - windows;
  return { end: shiftDay(end, Math.floor(shiftedHour / 24)), hour: (shiftedHour % 24 + 24) % 24 };
}

function measure(rule: Rule, end: string, length: number, hour: number) {
  const range = { start: shiftDay(end, 1 - length), end };
  const rows = selectRecords(range, rule);
  const total = sum(rows);
  const volume = (groups: typeof rows, metric: 'calls' | 'minutes') => {
    if (rule.window === 'Hour') return timeSeries(groups, range, 'Hourly', metric).series.reduce((all, line) => all + line.values[hour], 0);
    const total = sum(groups);
    return metric === 'calls' ? total.calls : total.seconds / 60;
  };
  if (rule.metric === 'Average duration') return total.calls ? total.seconds / total.calls : null;
  if (rule.metric === 'Probe variance') {
    const reported = rows.map(row => ({ ...row, seconds: row.seconds * industryFactor(row.ldi, row.direction, row.day) }));
    return change(volume(rows, 'minutes'), volume(reported, 'minutes'));
  }
  const metric = rule.metric === 'Calls' || rule.metric.startsWith('Call ') ? 'calls' : 'minutes';
  const value = volume(rows, metric);
  if (rule.metric.endsWith('share')) {
    const overall = volume(selectRecords(range, { ...emptyFilters, direction: rule.direction }), metric);
    return overall ? value / overall * 100 : null;
  }
  if (rule.metric.endsWith('growth')) {
    const prior = previousWindow(rule, end, length, hour);
    const previousRange = { start: shiftDay(prior.end, 1 - length), end: prior.end };
    const previous = selectRecords(previousRange, rule);
    const past = rule.window === 'Hour'
      ? timeSeries(previous, previousRange, 'Hourly', metric).series.reduce((all, line) => all + line.values[prior.hour], 0)
      : volume(previous, metric);
    return change(value, past);
  }
  return value;
}

export function useAlerts() {
  const [rules, setRules] = useSaved('callscope-rules-v1', templates);
  const [alarms, setAlarms] = useSaved('callscope-alarms-v1', seeds);
  const evaluate = () => setAlarms(current => {
    const next = [...current];
    for (const rule of rules.filter(item => item.enabled)) {
      const time = '18:00';
      const within = rule.startHour <= rule.endHour ? time >= rule.startHour && time < rule.endHour : time >= rule.startHour || time < rule.endHour;
      if (rule.hours === 'Custom hours' && !within) continue;
      const length = rule.window === 'Week' ? 7 : 1;
      const hour = 18;
      const value = measure(rule, latest, length, hour);
      const recent = ['Change from previous', 'Change from baseline'].includes(rule.condition)
        ? Array.from({ length: rule.condition === 'Change from previous' ? 1 : 4 }, (_, index) => {
          const prior = previousWindow(rule, latest, length, hour, index + 1);
          return measure(rule, prior.end, length, prior.hour);
        }).filter(item => item != null)
        : [];
      const comparison = recent.length ? recent.reduce((total, item) => total + item, 0) / recent.length : 0;
      const movement = value != null ? change(value, comparison) : null;
      const breached = rule.condition === 'No data'
        ? !selectRecords({ start: shiftDay(latest, 1 - length), end: latest }, rule).length
        : value != null && {
        Above: value > rule.threshold, Below: value < rule.threshold, 'Outside range': value < rule.threshold || value > rule.upper,
        'Change from previous': movement != null && Math.abs(movement) >= rule.threshold,
        'Change from baseline': movement != null && Math.abs(movement) >= rule.threshold,
      }[rule.condition];
      const open = next.findIndex(alarm => alarm.rule === rule.id && alarm.status === 'Open');
      if (breached && open < 0) next.unshift({
        id: crypto.randomUUID(), rule: rule.id, name: rule.name,
        scope: [rule.direction, rule.country, rule.operator, rule.ldi].filter(Boolean).join(' · '),
        description: rule.condition === 'No data' ? 'No CDR groups matched the selected window.' : rule.metric + ' measured at ' + compact(value ?? 0, 2) + ' in the selected window.',
        severity: rule.severity, status: 'Open', started: dateLabel(latest) + ' · ' + time + ' PKT',
      });
      if (!breached && open >= 0) next[open] = { ...next[open], status: 'Resolved' };
    }
    return next;
  });
  return { rules, alarms, evaluate, setRules, closeAlarm: (id: string) => setAlarms(current => current.map(alarm => alarm.id === id ? { ...alarm, status: 'Closed' } : alarm)) };
}

export function SeverityPill({ severity }: { severity: Severity }) {
  return <span className={'pill severity ' + severity.toLowerCase()}><i />{severity}</span>;
}

export function ActiveAlerts({ alarms, compactView = false }: { alarms: Alarm[]; compactView?: boolean }) {
  const active = alarms.filter(alarm => alarm.status === 'Open');
  const content = active.length ? <ul className="alarm-list">{active.slice(0, compactView ? 3 : 4).map(alarm => <li key={alarm.id}>
    <div className={'alarm-icon ' + alarm.severity.toLowerCase()}><BellRing size={17} /></div>
    <div><strong>{alarm.name}</strong><small>{alarm.scope}</small></div><SeverityPill severity={alarm.severity} />
  </li>)}</ul> : <Empty label="There are no active alarms." />;
  return compactView ? content : <Panel title="Active alerts" description="Open alarms in the demo workspace" action={<a className="text-link" href="#alerts">Open alert console</a>}>{content}</Panel>;
}

function RuleEditor({ rule, onSave, onClose }: { rule: Rule; onSave: (rule: Rule) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(rule);
  const set = <K extends keyof Rule>(key: K, value: Rule[K]) => setDraft(current => ({ ...current, [key]: value }));
  const picker = <K extends keyof Rule>(key: K, label: string, options: (string | { value: string; label: string })[]) =>
    <label>{label}<Select label={label} value={String(draft[key])} options={options} onChange={value => set(key, value as Rule[K])} /></label>;
  const error = draft.condition === 'Outside range' && draft.upper <= draft.threshold;
  const relative = draft.condition.startsWith('Change');
  const signedMetric = draft.metric.endsWith('growth') || draft.metric === 'Probe variance';
  const thresholdMin = relative || !signedMetric ? 0 : undefined;
  return <Modal title={rule.id ? 'Edit alert rule' : 'Create alert rule'} description="Evaluate a KPI against a threshold or missing-data condition." close={onClose}>
    <form className="rule-form" onSubmit={event => { event.preventDefault(); if (!error && draft.name.trim()) onSave({ ...draft, name: draft.name.trim() }); }}>
      <label className="form-full">Rule name<input required maxLength={80} value={draft.name} onChange={event => set('name', event.target.value)} autoFocus /></label>
      {picker('metric', 'Metric', [...metrics])}
      {picker('severity', 'Severity', [...severities])}
      {picker('direction', 'Direction', ['All', 'Incoming', 'Outgoing'])}
      {picker('country', 'Country', [{ value: '', label: 'All countries' }, ...countries.map(item => item.name)])}
      {picker('operator', 'Local operator', [{ value: '', label: 'All local operators' }, ...operators])}
      {picker('ldi', 'LDI operator', [{ value: '', label: 'All LDIs' }, ...ldis])}
      {picker('window', 'Window', ['Hour', 'Day', 'Week'])}
      {picker('condition', 'Condition', [...conditions])}
      {draft.condition !== 'No data' && <label>{relative ? 'Change threshold (%)' : signedMetric || draft.metric.endsWith('share') ? 'Threshold (%)' : draft.metric === 'Average duration' ? 'Threshold (seconds)' : 'Threshold'}<input type="number" min={thresholdMin} step="any" required value={draft.threshold} onChange={event => set('threshold', Number(event.target.value))} /></label>}
      {draft.condition === 'Outside range' && <label>Upper threshold<input type="number" min={thresholdMin} step="any" required value={draft.upper} onChange={event => set('upper', Number(event.target.value))} /></label>}
      {picker('hours', 'Active hours (PKT)', ['All day', 'Custom hours'])}
      {draft.hours === 'Custom hours' && <><label>Start time<input required type="time" value={draft.startHour} onChange={event => set('startHour', event.target.value)} /></label><label>End time<input required type="time" value={draft.endHour} onChange={event => set('endHour', event.target.value)} /></label></>}
      {error && <p className="form-full field-error">Upper threshold must exceed the lower threshold.</p>}
      <div className="dialog-actions form-full"><button type="button" className="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={error}>Save rule</button></div>
    </form>
  </Modal>;
}

export function AlertsView({ controller, notify }: { controller: ReturnType<typeof useAlerts>; notify: (message: string) => void }) {
  const { alarms, rules, setRules, closeAlarm, evaluate } = controller;
  const [tab, setTab] = useState<'Alarm console' | 'Rule editor'>('Alarm console');
  const [status, setStatus] = useState('All statuses');
  const [editing, setEditing] = useState<Rule | null>(null);
  const add = () => setEditing({ ...templates[0], id: '', name: '', threshold: 1000, severity: 'Warning', ...emptyFilters });
  return <div className="dashboard-stack">
    <Stats items={[
      { label: 'Open alarms', value: String(alarms.filter(item => item.status === 'Open').length), icon: Bell, tone: 'blue', note: 'Active breaches' },
      { label: 'Critical alarms', value: String(alarms.filter(item => item.status === 'Open' && item.severity === 'Critical').length), icon: ShieldAlert, tone: 'rose', note: 'Open and critical' },
      { label: 'Resolved alarms', value: String(alarms.filter(item => item.status === 'Resolved').length), icon: CheckCircle2, tone: 'teal', note: 'Metrics back in range' },
      { label: 'Enabled rules', value: String(rules.filter(rule => rule.enabled).length), icon: SlidersHorizontal, tone: 'purple', note: 'In this browser' },
    ]} />
    <div className="section-actions"><Segmented label="Alert workspace" options={['Alarm console', 'Rule editor'] as const} value={tab} onChange={setTab} /><div className="button-group"><button className="button" onClick={() => { evaluate(); notify('Rules evaluated against the latest demo window.'); }}><Play size={16} /> Evaluate demo rules</button><button className="button primary" onClick={add}><Plus size={17} /> New rule</button></div></div>
    {tab === 'Alarm console' ? <Panel title="Alarm history" description="Automatic recovery and manual closure are recorded as different states" action={<Select label="Alarm status" value={status} onChange={setStatus} options={['All statuses', 'Open', 'Resolved', 'Closed']} />}>
      <DataTable label="Alarm history" headers={['Alarm', 'Severity', 'Opened', 'Status', 'Action']} rows={alarms.filter(item => status === 'All statuses' || item.status === status).map(item => [
        <div className="cell-detail"><strong>{item.name}</strong><small>{item.scope} · {item.description}</small></div>, <SeverityPill severity={item.severity} />, item.started,
        <span className={'pill ' + (item.status === 'Open' ? 'warning' : 'quiet')}>{item.status}</span>,
        item.status === 'Open' ? <button className="text-link" onClick={() => { closeAlarm(item.id); notify('Alarm closed.'); }}>Close alarm</button> : '—',
      ])} />
    </Panel> : <Panel title="KPI rules" description="Rules run against the latest demo window when evaluated">
      <DataTable label="KPI rules" headers={['Rule', 'Condition', 'Window', 'Severity', 'Status', 'Action']} rows={rules.map(rule => [
        <div className="cell-detail"><strong>{rule.name}</strong><small>{[rule.metric, rule.direction, rule.country, rule.operator, rule.ldi].filter(Boolean).join(' · ')}</small></div>,
        rule.condition + (rule.condition === 'No data' ? '' : ' ' + rule.threshold + (rule.condition === 'Outside range' ? '–' + rule.upper : rule.condition.startsWith('Change') ? '%' : '')),
        <span className="inline-icon"><Clock3 size={14} /> {rule.window}</span>, <SeverityPill severity={rule.severity} />,
        <button className={'pill toggle ' + (rule.enabled ? 'success' : 'quiet')} aria-label={(rule.enabled ? 'Disable ' : 'Enable ') + rule.name} aria-pressed={rule.enabled} onClick={() => setRules(current => current.map(item => item.id === rule.id ? { ...item, enabled: !item.enabled } : item))}>{rule.enabled ? 'Enabled' : 'Paused'}</button>,
        <button className="icon-button" aria-label={'Edit ' + rule.name} onClick={() => setEditing(rule)}><Pencil size={16} /></button>,
      ])} />
    </Panel>}
    <div className="info-strip"><CircleAlert size={16} /> Notifications appear in the dashboard bell. <span><Activity size={15} /> Demo evaluation time · {dateLabel(latest, true)}, 18:00 PKT</span></div>
    {editing && <RuleEditor rule={editing} onClose={() => setEditing(null)} onSave={rule => {
      setRules(current => rule.id ? current.map(item => item.id === rule.id ? rule : item) : [...current, { ...rule, id: crypto.randomUUID() }]);
      setEditing(null); setTab('Rule editor'); notify('Alert rule saved.');
    }} />}
  </div>;
}
