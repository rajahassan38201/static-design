import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, Bell, CalendarDays, Check, ChevronDown, CircleHelp, Database, Download, Globe2, LayoutDashboard, Menu, Network, PhoneIncoming, PhoneOutgoing, Radio, Route, Scale, ShieldAlert, SlidersHorizontal, X,
  type LucideIcon,
} from 'lucide-react';
import '@fontsource-variable/manrope';
import './styles.css';
import { ActiveAlerts, AlertsView, useAlerts } from './alerts';
import { CountriesView, industryRows, IndustryView, OperatorsView, Overview, TrafficDetails } from './analytics';
import { countries, downloadCsv, earliest, emptyFilters, group, latest, ldis, navigation, operators, preset, previousRange, rangeLabel, selectRecords, type Filters, type Page, type Range } from './data';
import { DataView, initialBatches } from './ingestion';
import { Modal, Select } from './ui';

const icons: Record<Page, LucideIcon> = {
  overview: LayoutDashboard, incoming: PhoneIncoming, outgoing: PhoneOutgoing, countries: Globe2, operators: Network,
  industry: Scale, transit: Route, 'non-whitelisted': ShieldAlert, alerts: Bell, data: Database,
};
const sections = [
  { label: 'MONITOR', indexes: [0, 1, 2, 3, 4] },
  { label: 'OPERATIONS', indexes: [5, 6, 7, 8, 9] },
];
const getPage = (): Page => navigation.find(item => '#' + item.id === window.location.hash)?.id ?? 'overview';
const presets = [7, 14, 30, 90];
type Popup = 'dates' | 'filters' | 'notifications' | 'account' | null;

function DatePicker({ value, onApply, close }: { value: Range; onApply: (range: Range) => void; close: () => void }) {
  const [draft, setDraft] = useState(value);
  return <div className="popover control-popover date-popover">
    <h2>Reporting period</h2><p>Dates are in Pakistan Standard Time.</p>
    <div className="preset-list">{presets.map(days => {
      const candidate = preset(days);
      return <button key={days} className={draft.start === candidate.start && draft.end === candidate.end ? 'selected' : ''} onClick={() => setDraft(candidate)}>Last {days} days</button>;
    })}</div>
    <form onSubmit={event => { event.preventDefault(); onApply(draft); }}>
      <div className="date-fields">
        <label>Start date<input type="date" value={draft.start} min={earliest} max={draft.end || latest} required onChange={event => setDraft({ ...draft, start: event.target.value })} /></label>
        <label>End date<input type="date" value={draft.end} min={draft.start || earliest} max={latest} required onChange={event => setDraft({ ...draft, end: event.target.value })} /></label>
      </div>
      <div className="dialog-actions"><button type="button" className="button" onClick={close}>Cancel</button><button className="button primary" disabled={!draft.start || !draft.end || draft.start > draft.end}>Apply dates</button></div>
    </form>
  </div>;
}

const optionsWithAll = (label: string, options: string[]) => [{ value: '', label }, ...options];
function FilterPicker({ value, page, onApply }: { value: Filters; page: Page; onApply: (value: Filters) => void }) {
  const [draft, setDraft] = useState(value);
  const picker = (key: keyof Filters, label: string, options: (string | { value: string; label: string })[]) =>
    <label>{label}<Select label={label} value={draft[key]} options={options} onChange={newValue => setDraft(current => ({ ...current, [key]: newValue }))} /></label>;
  return <div className="popover control-popover filter-popover">
    <h2>Traffic filters</h2><p>Refine the analytics in this workspace.</p>
    <div className="filter-fields">
      {!['incoming', 'outgoing', 'transit'].includes(page) && picker('direction', 'Direction', ['All', 'Incoming', 'Outgoing'])}
      {page !== 'industry' && picker('country', 'Country', optionsWithAll('All countries', countries.map(item => item.name)))}
      {page !== 'transit' && picker('operator', 'Local operator', optionsWithAll('All local operators', operators))}
      {picker('ldi', 'LDI operator', optionsWithAll('All LDIs', ldis))}
    </div>
    <div className="dialog-actions"><button className="button" onClick={() => { setDraft(emptyFilters); onApply(emptyFilters); }}>Reset</button><button className="button primary" onClick={() => onApply(draft)}>Apply filters</button></div>
  </div>;
}

function App() {
  const [page, setPage] = useState<Page>(getPage);
  const [range, setRange] = useState(() => preset(14));
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [popup, setPopup] = useState<Popup>(null);
  const [drawer, setDrawer] = useState(false);
  const [about, setAbout] = useState(false);
  const [toast, setToast] = useState('');
  const [batches, setBatches] = useState(initialBatches);
  const alerts = useAlerts();
  const active = alerts.alarms.filter(item => item.status === 'Open').length;
  const current = navigation.find(item => item.id === page)!;
  const mobileMenu = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const toastTimer = useRef<number>(undefined);
  const previous = useMemo(() => selectRecords(previousRange(range), filters, page), [range, filters, page]);
  const rows = useMemo(() => selectRecords(range, filters, page), [range, filters, page]);
  const hasTrafficControls = page !== 'alerts' && page !== 'data';

  useEffect(() => {
    const changePage = () => { setPage(getPage()); setDrawer(false); setPopup(null); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', changePage);
    return () => window.removeEventListener('hashchange', changePage);
  }, []);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!(event.target as Element).closest('[data-popover]')) setPopup(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPopup(null); setDrawer(false); } };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => { document.title = current.title + ' | CallScope'; }, [current.title]);
  useEffect(() => {
    if (!drawer) return;
    const desktop = window.matchMedia('(min-width: 901px)');
    const closeOnDesktop = () => { if (desktop.matches) setDrawer(false); };
    nav.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]')?.focus();
    document.body.classList.add('drawer-open');
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      document.body.classList.remove('drawer-open');
      if (!desktop.matches) mobileMenu.current?.focus({ preventScroll: true });
    };
  }, [drawer]);

  const notify = (message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(''), 3500);
  };
  const toggle = (key: Popup) => setPopup(current => current === key ? null : key);
  const onCountry = (country: string) => setFilters(current => ({ ...current, country: current.country === country ? '' : country }));
  const applied = Object.entries(filters).filter(([key, value]) => {
    if (!value || value === 'All') return false;
    if (key === 'direction' && ['incoming', 'outgoing', 'transit'].includes(page)) return false;
    if (key === 'country' && page === 'industry') return false;
    return key !== 'operator' || page !== 'transit';
  });
  const exportReport = () => {
    const filename = 'callscope-' + page + '-' + range.end;
    if (page === 'industry') {
      const measured = selectRecords(range, { ...filters, country: '' }, 'industry');
      const key = (row: typeof measured[number]) => [row.day, row.ldi, row.operator, row.direction].join('|');
      const industry = new Map(group(industryRows(measured), key).map(row => [row.name, row.seconds / 60]));
      downloadCsv(filename, ['Date', 'LDI', 'Local operator', 'Direction', 'Probe minutes', 'Industry minutes'], group(measured, key).map(row => [...row.name.split('|'), Number((row.seconds / 60).toFixed(2)), Number((industry.get(row.name) ?? 0).toFixed(2))]));
    } else {
      const key = (row: typeof rows[number]) => [row.day, row.direction, row.country, row.destination ?? '', row.ldi, row.operator, row.carrier].join('|');
      downloadCsv(filename, ['Date', 'Direction', 'Country', 'Transit destination', 'LDI', 'Local operator', 'International carrier', 'Calls', 'Minutes'], group(rows, key).map(row => [...row.name.split('|'), row.calls, Number((row.seconds / 60).toFixed(2))]));
    }
    notify('CSV report downloaded.');
  };
  const props = { rows, previous, range, filters, onCountry, page };

  return <div className="app-shell">
    <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    {drawer && <button className="drawer-overlay" onClick={() => setDrawer(false)} aria-label="Close navigation" />}
    <aside ref={nav} className={'sidebar' + (drawer ? ' is-open' : '')} id="navigation" aria-label="Sidebar">
      <div className="brand-row">
        <a className="brand" href="#overview" onClick={() => setDrawer(false)}><span className="brand-symbol"><Radio size={23} strokeWidth={2.25} /></span><span><strong>CallScope<span>.</span></strong><small>Voice analytics</small></span></a>
        <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setDrawer(false)}><X size={20} /></button>
      </div>
      <div className="workspace"><div className="workspace-icon"><span>PK</span></div><div><strong>Pakistan</strong><small>National workspace</small></div></div>
      <nav aria-label="Dashboard navigation">{sections.map(section => <div className="nav-group" key={section.label}>
        <p>{section.label}</p>
        {section.indexes.map(index => {
          const item = navigation[index];
          const Icon = icons[item.id];
          return <a className={'nav-link' + (page === item.id ? ' current' : '')} aria-current={page === item.id ? 'page' : undefined} href={'#' + item.id} key={item.id} onClick={() => setDrawer(false)}>
            <Icon size={18} strokeWidth={1.9} /> <span>{item.label}</span>{item.id === 'alerts' && active > 0 && <span className="nav-count">{active}</span>}
          </a>;
        })}
      </div>)}</nav>
      <div className="sidebar-footer"><button className="nav-link" onClick={() => { setDrawer(false); setAbout(true); }}><CircleHelp size={18} /> About this demo</button><div className="footer-brand"><Activity size={15} /> CallScope analytics</div></div>
    </aside>
    <div className="main-shell" inert={drawer}>
      <header className="topbar">
        <div className="breadcrumb">
          <button ref={mobileMenu} className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={drawer} aria-controls="navigation" onClick={() => setDrawer(true)}><Menu size={23} /></button>
          <span className="crumb-root">Analytics</span><span className="crumb-divider">/</span><strong>{current.label}</strong>
        </div>
        <div className="topbar-actions">
          <span className="demo-label"><i /> Demo data</span>
          <div className="popover-anchor" data-popover>
            <button className="icon-button bell-button" aria-label={'Notifications, ' + active + ' active'} aria-expanded={popup === 'notifications'} onClick={() => toggle('notifications')}><Bell size={20} />{active > 0 && <i />}</button>
            {popup === 'notifications' && <div className="popover notification-popover"><h2>Notifications</h2><ActiveAlerts alarms={alerts.alarms} compactView /><a className="text-link" href="#alerts" onClick={() => setPopup(null)}>Open alert console</a></div>}
          </div>
          <div className="topbar-divider" />
          <div className="popover-anchor" data-popover>
            <button className="profile-button" aria-label="Demo profile" aria-expanded={popup === 'account'} onClick={() => toggle('account')}><span className="avatar">DA</span><span className="profile-text"><strong>Demo Analyst</strong><small>Analyst workspace</small></span><ChevronDown size={15} className="profile-chevron" /></button>
            {popup === 'account' && <div className="popover account-popover"><h2>Demo Analyst</h2><p>Analyst workspace</p><button className="nav-link" onClick={() => { setPopup(null); setAbout(true); }}><CircleHelp size={17} /> About this demo</button></div>}
          </div>
        </div>
      </header>
      <main className="main-content" id="main-content" tabIndex={-1}>
        <div className="page-intro">
          <div><h1>{current.title}</h1><p>{current.description}</p></div>
          {hasTrafficControls && <div className="toolbar">
            <div className="popover-anchor" data-popover><button className="button date-button" aria-label={'Date range, ' + rangeLabel(range)} aria-expanded={popup === 'dates'} onClick={() => toggle('dates')}><CalendarDays size={17} /> <span>{rangeLabel(range)}</span><ChevronDown size={15} /></button>
              {popup === 'dates' && <DatePicker value={range} onApply={value => { setRange(value); setPopup(null); }} close={() => setPopup(null)} />}
            </div>
            <div className="popover-anchor" data-popover><button className="button filter-button" aria-expanded={popup === 'filters'} onClick={() => toggle('filters')}><SlidersHorizontal size={17} /> Filters {applied.length > 0 && <span className="filter-count">{applied.length}</span>}</button>
              {popup === 'filters' && <FilterPicker value={filters} page={page} onApply={value => { setFilters(value); setPopup(null); }} />}
            </div>
            <button className="button primary export-button" onClick={exportReport}><Download size={17} /> Export</button>
          </div>}
        </div>
        {hasTrafficControls && applied.length > 0 && <div className="active-filters" aria-label="Applied filters">
          {applied.map(([key, value]) => <button key={key} className="filter-chip" aria-label={'Remove filter ' + value} onClick={() => setFilters(current => ({ ...current, [key]: key === 'direction' ? 'All' : '' }))}>{value} <X size={13} /></button>)}
          <button className="text-link" onClick={() => setFilters(emptyFilters)}>Clear all</button>
        </div>}
        <div key={page} className="page-body">
          {page === 'overview' && <Overview {...props} alerts={<ActiveAlerts alarms={alerts.alarms} />} />}
          {(['incoming', 'outgoing', 'transit', 'non-whitelisted'] as Page[]).includes(page) && <TrafficDetails {...props} />}
          {page === 'countries' && <CountriesView {...props} />}
          {page === 'operators' && <OperatorsView {...props} />}
          {page === 'industry' && <IndustryView range={range} filters={filters} />}
          {page === 'alerts' && <AlertsView controller={alerts} notify={notify} />}
          {page === 'data' && <DataView batches={batches} setBatches={setBatches} notify={notify} />}
        </div>
        <footer className="main-footer"><span>CallScope · Synthetic demonstration data</span><span>Pakistan Standard Time · UTC+5</span></footer>
      </main>
    </div>
    {toast && <div className="toast" role="status"><span><Check size={16} /></span>{toast}<button className="icon-button" onClick={() => setToast('')} aria-label="Dismiss message"><X size={16} /></button></div>}
    {about && <Modal title="About CallScope" description="International voice traffic analytics for Pakistan." close={() => setAbout(false)}>
      <div className="about-copy"><p>The dashboards, operator assignments, PTA comparison, and alarms use synthetic data. Use the reporting period and traffic filters to explore the sample network.</p><p>In the data workspace, CSV validation runs locally. Alert rules and alarm states are stored in this browser.</p></div>
      <div className="dialog-actions"><button className="button primary" onClick={() => setAbout(false)}>Done</button></div>
    </Modal>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
