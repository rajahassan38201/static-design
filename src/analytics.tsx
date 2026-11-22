import { useMemo, useState, type ReactNode } from 'react';
import { Activity, BarChart3, Clock3, Globe2, Layers3, Network, PhoneIncoming, PhoneOutgoing, Route, Timer } from 'lucide-react';
import { Donut, HeroMap, Legend, TrafficMap, TrendChart } from './charts';
import {
  change, colors, compact, countries, dateLabel, duration, group, industryFactor, number, palette, percentage, selectRecords, signed, sum, timeSeries, valueFor,
  type Filters, type Metric, type Page, type Period, type Range, type RecordGroup,
} from './data';
import { DataTable, Empty, Notice, Panel, Segmented, Select, Stats, type Stat } from './ui';

const periods = ['Hourly', 'Daily', 'Weekly', 'Monthly'] as const;
const metricOptions = [{ value: 'calls', label: 'Calls' }, { value: 'minutes', label: 'Minutes' }];
type DatasetProps = { rows: RecordGroup[]; previous: RecordGroup[]; range: Range };
type ViewProps = DatasetProps & { page: Page; filters: Filters; onCountry: (country: string) => void };

function seriesFor(rows: RecordGroup[], range: Range, period: Period, metric: Metric) {
  const { labels, series } = timeSeries(rows, range, period, metric);
  const matching = series.filter(line => rows.some(row => row.direction === line.name));
  return { labels, series: matching.length ? matching : series };
}

function TrendPanel({ rows, range, title = 'Traffic trends' }: Pick<DatasetProps, 'rows' | 'range'> & { title?: string }) {
  const [period, setPeriod] = useState<Period>('Daily');
  const [metric, setMetric] = useState<Metric>('calls');
  const chart = useMemo(() => seriesFor(rows, range, period, metric), [rows, range, period, metric]);
  const subtitle = period === 'Hourly' ? 'Hourly profile for ' + dateLabel(range.end, true) + ' · PKT (UTC+5)' : 'International ' + (metric === 'calls' ? 'call volumes' : 'traffic minutes') + ' over the selected period';
  return <Panel title={title} description={subtitle} className="trend-panel" action={<Select label="Trend metric" value={metric} options={metricOptions} onChange={value => setMetric(value as Metric)} />}>
    <div className="chart-controls"><Legend series={chart.series} /><Segmented label="Time granularity" options={periods} value={period} onChange={setPeriod} /></div>
    <TrendChart {...chart} metric={metric === 'calls' ? 'Calls' : 'Minutes'} />
  </Panel>;
}

function SplitPanel({ rows }: { rows: RecordGroup[] }) {
  const [metric, setMetric] = useState<Metric>('calls');
  const inbound = valueFor(sum(rows.filter(row => row.direction === 'Incoming')), metric);
  const outbound = valueFor(sum(rows.filter(row => row.direction === 'Outgoing')), metric);
  const total = inbound + outbound;
  const data = [{ name: 'Incoming', value: inbound, color: colors.incoming }, { name: 'Outgoing', value: outbound, color: colors.outgoing }];
  return <Panel title="Traffic split" description="Incoming vs. outgoing" action={<Select label="Traffic split metric" value={metric} options={metricOptions} onChange={value => setMetric(value as Metric)} />} className="split-panel">
    <Donut data={data} total={compact(total, 2)} caption={metric === 'calls' ? 'Total calls' : 'Total minutes'} />
    <div className="split-legend">{data.map(item => <div key={item.name}>
      <span><i style={{ background: item.color }} />{item.name}</span>
      <strong>{compact(item.value, 2)}</strong><small>{percentage(total ? item.value * 100 / total : 0)}</small>
    </div>)}</div>
  </Panel>;
}

function OverviewStats({ rows, previous, range }: DatasetProps) {
  const series = timeSeries(rows, range, 'Daily', 'calls').series;
  const minutes = timeSeries(rows, range, 'Daily', 'minutes').series;
  const items = [
    { label: 'Incoming calls', direction: 'Incoming', metric: 'calls', icon: PhoneIncoming, tone: 'blue', color: colors.incoming },
    { label: 'Outgoing calls', direction: 'Outgoing', metric: 'calls', icon: PhoneOutgoing, tone: 'teal', color: colors.outgoing },
    { label: 'Incoming minutes', direction: 'Incoming', metric: 'minutes', icon: Clock3, tone: 'purple', color: colors.purple },
    { label: 'Outgoing minutes', direction: 'Outgoing', metric: 'minutes', icon: Timer, tone: 'amber', color: colors.amber },
  ] as const;
  return <Stats items={items.map(item => {
    const current = valueFor(sum(rows.filter(row => row.direction === item.direction)), item.metric);
    const prior = valueFor(sum(previous.filter(row => row.direction === item.direction)), item.metric);
    const trail = (item.metric === 'calls' ? series : minutes).find(line => line.name === item.direction)?.values;
    return { ...item, value: compact(current, 2), exact: current, delta: change(current, prior), trail };
  })} />;
}

function ScopeStats({ rows, previous, range, page }: DatasetProps & { page: Page }) {
  const total = sum(rows);
  const prior = sum(previous);
  const trail = (metric: Metric) => {
    const { labels, series } = seriesFor(rows, range, 'Daily', metric);
    return labels.map((_, index) => series.reduce((total, line) => total + line.values[index], 0));
  };
  const breakdown = page === 'transit' ? group(rows, row => row.country + ' → ' + row.destination) : group(rows, row => row.country);
  const items: Stat[] = [
    { label: 'Total calls', value: compact(total.calls, 2), exact: total.calls, delta: change(total.calls, prior.calls), icon: Activity, tone: 'blue', trail: trail('calls') },
    { label: 'Traffic minutes', value: compact(total.seconds / 60, 2), exact: total.seconds / 60, delta: change(total.seconds, prior.seconds), icon: Clock3, tone: 'teal', trail: trail('minutes'), color: colors.outgoing },
    { label: 'Average duration', value: total.calls ? duration(total.seconds / total.calls) : '—', icon: Timer, tone: 'purple', note: 'Per eligible call' },
    { label: page === 'transit' ? 'Country pairs' : 'Partner countries', value: number(breakdown.length), icon: page === 'transit' ? Route : Globe2, tone: 'amber', note: 'With recorded traffic' },
  ];
  return <Stats items={items} />;
}

type Rank = ReturnType<typeof group>;
function RankPanel({ title, description, data, metric = 'calls', link, onPick, limit = 5, flags = false }: {
  title: string; description: string; data: Rank; metric?: Metric; link?: ReactNode; onPick?: (name: string) => void; limit?: number; flags?: boolean;
}) {
  const ordered = [...data].sort((a, b) => valueFor(b, metric) - valueFor(a, metric));
  const max = ordered[0] ? valueFor(ordered[0], metric) : 1;
  return <Panel title={title} description={description} action={link} className="ranking-panel">
    {ordered.length ? <ol className="rank-list">{ordered.slice(0, limit).map((row, index) => {
      const countryCode = countries.find(country => country.name === row.name)?.code;
      const content = <><span className={'rank-mark ' + (flags && countryCode ? 'nation nation-' + countryCode.toLowerCase() : '')}>{flags && countryCode ? countryCode : String(index + 1).padStart(2, '0')}</span>
        <span className="rank-info"><span className="rank-name">{row.name || 'Unmatched'}</span><span className="rank-track"><i style={{ width: valueFor(row, metric) / (max || 1) * 100 + '%', background: palette[index % palette.length] }} /></span></span>
        <strong title={number(valueFor(row, metric), 1)}>{compact(valueFor(row, metric), 2)}</strong></>;
      return <li key={row.name}>{onPick ? <button onClick={() => onPick(row.name)}>{content}</button> : <div className="rank-line">{content}</div>}</li>;
    })}</ol> : <Empty />}
  </Panel>;
}

function MapPanel({ rows, filters, onCountry }: Pick<ViewProps, 'rows' | 'filters' | 'onCountry'>) {
  const data = group(rows, row => row.country);
  return <Panel title="Global traffic map" description="Calls between Pakistan and partner countries" className="map-panel" action={<span className="pill quiet"><Globe2 size={14} /> {data.length} countries</span>}>
    <div className="map-frame"><TrafficMap values={new Map(data.map(row => [row.name, row.calls]))} selected={filters.country} onSelect={onCountry} /></div>
    <div className="map-legend"><span><i />Pakistan hub</span><span><i />Partner country</span><span className="map-hint">Select a partner to filter</span></div>
  </Panel>;
}

export function Overview({ rows, previous, range, filters, onCountry, alerts }: Omit<ViewProps, 'page'> & { alerts: ReactNode }) {
  const totals = sum(rows);
  const totalDelta = change(totals.calls, sum(previous).calls);
  return <div className="dashboard-stack">
    <section className="hero">
      <HeroMap />
      <div className="hero-text">
        <span className="hero-tag"><span /> INTERNATIONAL VOICE NETWORK</span>
        <h2>Pakistan’s voice traffic</h2>
        <p>Track calls, minutes, and routes across the global network.</p>
        <div className="hero-metrics"><span><Network size={16} /> <strong>{number(new Set(rows.map(row => row.country)).size)}</strong> partner countries</span><span><Layers3 size={16} /> <strong>{number(new Set(rows.map(row => row.ldi)).size)}</strong> LDI operators</span>{totalDelta != null && <span><Activity size={16} /><strong>{signed(totalDelta)}</strong> call volume</span>}</div>
      </div>
    </section>
    <OverviewStats rows={rows} previous={previous} range={range} />
    <div className="panel-grid"><TrendPanel rows={rows} range={range} /><SplitPanel rows={rows} /></div>
    <div className="panel-grid"><MapPanel rows={rows} filters={filters} onCountry={onCountry} />
      <RankPanel title="Top countries" description="Ranked by total calls" data={group(rows, row => row.country)} link={<a href="#countries" className="text-link">View all</a>} flags onPick={onCountry} />
    </div>
    <div className="even-grid">
      <RankPanel title="Top LDI operators" description="Carrying international traffic" data={group(rows, row => row.ldi)} link={<a href="#operators" className="text-link">Explore</a>} />
      <RankPanel title="Top local operators" description="Calls originating or terminating in Pakistan" data={group(rows, row => row.operator)} />
    </div>
    {alerts}
  </div>;
}

function VolumeTable({ data, dimension, title, action }: { data: Rank; dimension: string; title: string; action?: (name: string) => void }) {
  const allCalls = data.reduce((total, row) => total + row.calls, 0);
  return <DataTable label={title} headers={[dimension, 'Calls', 'Minutes', 'Avg. duration', 'Call share']} rows={data.map(row => [
    action ? <button className="text-link table-link" onClick={() => action(row.name)}>{row.name}</button> : <strong>{row.name}</strong>,
    number(row.calls), number(row.seconds / 60, 1), row.calls ? duration(row.seconds / row.calls) : '—', percentage(allCalls ? row.calls * 100 / allCalls : 0),
  ])} />;
}

function Breakdowns({ rows, page, onCountry }: Pick<ViewProps, 'rows' | 'page' | 'onCountry'>) {
  if (page === 'transit') return <div className="even-grid">
    <RankPanel title="Transit by LDI" description="Calls by carrying operator" data={group(rows, row => row.ldi)} />
    <RankPanel title="Transit by international carrier" description="Calls by sample origin carrier" data={group(rows, row => row.carrier)} />
  </div>;
  return <div className="even-grid">
    <RankPanel title={page === 'incoming' ? 'Receiving local operators' : page === 'outgoing' ? 'Originating local operators' : 'Local operators'} description="Ranked by call volume" data={group(rows, row => row.operator)} />
    <RankPanel title="International carriers" description="Sample carrier attribution by calls" data={group(rows, row => row.carrier)} />
    <RankPanel title={page === 'outgoing' ? 'Destination countries' : page === 'incoming' ? 'Origin countries' : 'Partner countries'} description="Ranked by call volume" data={group(rows, row => row.country)} flags onPick={onCountry} />
    <RankPanel title="Carrying LDI operators" description="Ranked by call volume" data={group(rows, row => row.ldi)} />
  </div>;
}

export function TrafficDetails(props: ViewProps) {
  const { rows, range, page } = props;
  const transit = page === 'transit';
  const flagged = page === 'non-whitelisted';
  const title = transit ? 'Transit country pairs' : flagged ? 'Flagged traffic by country and operator' : 'Operator routing';
  const data = group(rows, row => transit ? row.country + ' → ' + row.destination : flagged ? row.country + ' · ' + row.operator : row.operator + ' · ' + row.ldi);
  return <div className="dashboard-stack">
    {flagged && <Notice>Sample policy flags calls associated with gateways outside the demo whitelist. The production policy is subject to approval.</Notice>}
    {transit && <Notice>Sample classification treats these routes as foreign-to-foreign calls carried through Pakistan. The production rules are subject to approval.</Notice>}
    <ScopeStats {...props} />
    <TrendPanel rows={rows} range={range} title={transit ? 'Transit traffic trends' : flagged ? 'Flagged traffic trends' : 'Traffic trends'} />
    <Breakdowns {...props} />
    <Panel title={title} description={transit ? 'Foreign origin and destination pairs' : 'Traffic volume for each grouping'}><VolumeTable data={data} dimension={transit ? 'Origin → destination' : flagged ? 'Country · local operator' : 'Local operator · LDI'} title={title} /></Panel>
  </div>;
}

export function CountriesView(props: ViewProps) {
  const { rows, range, onCountry } = props;
  const total = sum(rows).calls;
  const inbound = new Map(group(rows.filter(row => row.direction === 'Incoming'), row => row.country).map(row => [row.name, row]));
  const outbound = new Map(group(rows.filter(row => row.direction === 'Outgoing'), row => row.country).map(row => [row.name, row]));
  return <div className="dashboard-stack">
    <ScopeStats {...props} />
    <div className="panel-grid"><MapPanel {...props} /><RankPanel title="Country rankings" description="Ranked by calls" data={group(rows, row => row.country)} flags onPick={onCountry} /></div>
    <TrendPanel rows={rows} range={range} title="Country traffic trends" />
    <Panel title="Country traffic breakdown" description="Select a country to drill down into its operators, carriers, and trends">
      <DataTable label="Country traffic breakdown" headers={['Country', 'Incoming calls', 'Incoming minutes', 'Outgoing calls', 'Outgoing minutes', 'Call share']} rows={group(rows, row => row.country).map(row => [
        <button className="text-link table-link" onClick={() => onCountry(row.name)}>{row.name}</button>, number(inbound.get(row.name)?.calls ?? 0), number((inbound.get(row.name)?.seconds ?? 0) / 60, 1), number(outbound.get(row.name)?.calls ?? 0), number((outbound.get(row.name)?.seconds ?? 0) / 60, 1), percentage(total ? row.calls * 100 / total : 0),
      ])} />
    </Panel>
    <Breakdowns {...props} />
  </div>;
}

export function OperatorsView(props: ViewProps) {
  const { rows, range, filters, onCountry } = props;
  const [dimension, setDimension] = useState('LDI operators');
  const [metric, setMetric] = useState<Metric>('calls');
  const [selected, setSelected] = useState('');
  const key = dimension === 'LDI operators' ? 'ldi' : dimension === 'Local operators' ? 'operator' : 'carrier';
  const data = group(rows, row => row[key]);
  const scoped = selected ? rows.filter(row => row[key] === selected) : rows;
  const ordered = [...data].sort((a, b) => valueFor(b, metric) - valueFor(a, metric));
  const total = valueFor(sum(rows), metric);
  return <div className="dashboard-stack">
    <div className="section-actions"><Segmented label="Operator dimension" options={['LDI operators', 'Local operators', 'International carriers']} value={dimension} onChange={value => { setDimension(value); setSelected(''); }} /><Select label="Market share metric" value={metric} options={metricOptions} onChange={value => setMetric(value as Metric)} /></div>
    {selected && <div className="active-filters"><button onClick={() => setSelected('')} className="filter-chip">{selected} <span aria-hidden="true">×</span><span className="sr-only">Clear operator drill-down</span></button></div>}
    <div className="panel-grid">
      <Panel title={dimension + ' market share'} description={'Share of total ' + metric} className="details-donut">
        <Donut data={ordered.map((row, index) => ({ name: row.name, value: valueFor(row, metric), color: palette[index % palette.length] }))} total={compact(total, 2)} caption={'Total ' + metric} />
        <div className="chart-legend wrap-legend">{ordered.map((row, index) => <span key={row.name}><i style={{ background: palette[index % palette.length] }} />{row.name} · {percentage(total ? valueFor(row, metric) * 100 / total : 0)}</span>)}</div>
      </Panel>
      <RankPanel title={dimension} description={'Select to drill down by ' + metric} data={data} metric={metric} limit={7} onPick={name => setSelected(current => current === name ? '' : name)} />
    </div>
    <TrendPanel rows={scoped} range={range} title={selected ? selected + ' traffic trends' : 'Operator traffic trends'} />
    <Panel title={dimension + ' breakdown'} description="Traffic volumes and average duration across the selected scope"><VolumeTable data={data} dimension="Operator / carrier" title={dimension + ' breakdown'} action={setSelected} /></Panel>
    <Breakdowns rows={scoped} page="operators" onCountry={onCountry} />
    <MapPanel rows={scoped} filters={filters} onCountry={onCountry} />
  </div>;
}

export function industryRows(rows: RecordGroup[]) {
  return rows.map(row => ({ ...row, seconds: row.seconds * industryFactor(row.ldi, row.direction, row.day) }));
}

export function IndustryView({ range, filters }: Pick<ViewProps, 'range' | 'filters'>) {
  const [period, setPeriod] = useState<Period>('Daily');
  const [source, setSource] = useState('Database');
  const [category, setCategory] = useState<'LDI' | 'Local'>('LDI');
  const rows = useMemo(() => selectRecords(range, { ...filters, country: '' }, 'industry'), [range, filters]);
  const comparison = useMemo(() => industryRows(rows), [rows]);
  const probe = sum(rows).seconds / 60;
  const industry = sum(comparison).seconds / 60;
  const variance = change(probe, industry);
  const primary = timeSeries(rows, range, period, 'minutes');
  const reported = timeSeries(comparison, range, period, 'minutes');
  const combine = (series: typeof primary.series) => primary.labels.map((_, index) => series.reduce((total, line) => total + line.values[index], 0));
  const chart = [
    { name: 'Probe minutes', values: combine(primary.series), color: colors.incoming },
    { name: 'Industry minutes', values: combine(reported.series), color: colors.outgoing },
  ];
  const key = (row: RecordGroup) => row[category === 'LDI' ? 'ldi' : 'operator'] + '|' + row.direction;
  const reportedMap = new Map(group(comparison, key).map(row => [row.name, row.seconds / 60]));
  const rowsByOperator = group(rows, key);
  return <div className="dashboard-stack">
    <div className="section-actions"><Segmented label="Industry operator category" options={['LDI', 'Local'] as const} value={category} onChange={setCategory} /><Select label="Demo reporting source" value={source} options={['Database', 'API', 'CSV upload']} onChange={setSource} /></div>
    <Stats items={[
      { label: 'Probe minutes', value: compact(probe, 2), exact: probe, icon: Activity, tone: 'blue', note: 'From demo CDRs' },
      { label: 'Industry minutes', value: compact(industry, 2), exact: industry, icon: Layers3, tone: 'teal', note: 'Demo ' + source + ' feed' },
      { label: 'Variance', value: variance == null ? '—' : signed(variance), icon: BarChart3, tone: 'purple', note: '(Probe − industry) ÷ industry' },
      { label: 'Reporting days', value: number(new Set(comparison.map(row => row.day)).size), icon: Clock3, tone: 'amber', note: 'In the selected period' },
    ]} />
    <Panel title="Minutes comparison" description="Probe-derived traffic and sample PTA-reported minutes" action={<Segmented label="Comparison granularity" options={['Daily', 'Weekly', 'Monthly'] as const} value={period as 'Daily' | 'Weekly' | 'Monthly'} onChange={setPeriod} />}>
      <div className="chart-controls"><Legend series={chart} /></div><TrendChart labels={primary.labels} series={chart} metric="Minutes" mode="bar" />
    </Panel>
    <Panel title="Operator reconciliation" description="Compare minutes and market share by operator and direction">
      <DataTable label="Operator reconciliation" headers={['Operator', 'Direction', 'Probe min', 'Industry min', 'Difference', 'Variance', 'Industry share']} rows={rowsByOperator.map(row => {
        const [operator, direction] = row.name.split('|');
        const measured = row.seconds / 60;
        const expected = reportedMap.get(row.name) ?? 0;
        const diff = change(measured, expected);
        return [<strong>{operator}</strong>, direction, number(measured, 1), number(expected, 1), number(measured - expected, 1), <span className={'pill ' + ((diff ?? 0) < 0 ? 'warning' : 'quiet')}>{diff == null ? '—' : signed(diff)}</span>, percentage(industry ? expected * 100 / industry : 0)];
      })} />
    </Panel>
  </div>;
}
