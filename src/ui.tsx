import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, ChevronDown, Inbox, X, type LucideIcon } from 'lucide-react';
import { signed } from './data';
import { Sparkline } from './charts';

export function Select({ label, value, options, onChange, className = '' }: { label: string; value: string; options: (string | { value: string; label: string })[]; onChange: (value: string) => void; className?: string }) {
  return <span className={'select-wrap ' + className}>
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
      {options.map(option => typeof option === 'string' ? <option key={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}
    </select><ChevronDown size={15} aria-hidden="true" />
  </span>;
}

export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return <div className="segmented" role="group" aria-label={label}>{options.map(option =>
    <button className={option === value ? 'selected' : ''} key={option} aria-pressed={option === value} onClick={() => onChange(option)}>{option}</button>,
  )}</div>;
}

export function Panel({ title, description, action, children, className = '' }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={'panel ' + className}>
    <header className="panel-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>
    {children}
  </section>;
}

export type Stat = { label: string; value: string; exact?: number; delta?: number | null; icon: LucideIcon; tone: string; trail?: number[]; color?: string; note?: string };
export function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const { label, value, exact, delta, icon: Icon, tone, trail, color, note } = stat;
  return <article className="stat-card" style={{ animationDelay: (index * 45) + 'ms' }}>
    <div className={'stat-icon tone-' + tone}><Icon size={19} strokeWidth={2} /></div>
    <h2>{label}</h2>
    <strong className="stat-value" title={exact?.toLocaleString('en-US', { maximumFractionDigits: 2 })}>{value}</strong>
    <div className="stat-foot">
      {delta != null && <span className={'delta ' + (delta < 0 ? 'down' : 'up')}>{delta < 0 ? <ArrowDown size={12} /> : <ArrowUp size={12} />}{signed(delta)}</span>}
      <span>{note ?? (delta == null ? 'Selected period' : 'vs. prior period')}</span>
    </div>
    {!!trail?.length && <Sparkline values={trail} color={color ?? '#5368f7'} id={'spark-' + index} />}
  </article>;
}

export function Stats({ items }: { items: Stat[] }) {
  return <div className="stat-grid">{items.map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}</div>;
}

export function Empty({ label = 'No records match these filters.' }: { label?: string }) {
  return <div className="empty"><Inbox size={25} /><p>{label}</p></div>;
}

export function DataTable({ headers, rows, label }: { headers: string[]; rows: ReactNode[][]; label: string }) {
  return rows.length ? <div className="table-scroll" tabIndex={0} aria-label={label + ' scroll area'}><table aria-label={label}>
    <thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody>
  </table></div> : <Empty />;
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="notice"><AlertCircle size={18} /><div>{children}</div></div>;
}

export function Modal({ title, description, children, close }: { title: string; description?: string; children: ReactNode; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="dialog" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="dialog-inner"><header><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={20} /></button></header>{children}</div>
  </dialog>;
}

