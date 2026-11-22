import { useEffect, useId, useRef } from 'react';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, AriaComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { compact, colors, countries, number, palette } from './data';
import world from './world.json';

echarts.use([LineChart, PieChart, BarChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer]);

const font = 'Manrope Variable, system-ui, sans-serif';
const tooltip = { backgroundColor: '#fff', borderColor: '#e7ebf4', padding: [9, 13], textStyle: { color: '#283550', fontFamily: font, fontSize: 12 }, confine: true, valueFormatter: (value: unknown) => number(Number(value), 1) };

function Chart({ option, label, className = '' }: { option: EChartsCoreOption; label: string; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const instance = echarts.init(element, undefined, { renderer: 'canvas' });
    chart.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(element);
    return () => { observer.disconnect(); instance.dispose(); chart.current = null; };
  }, []);
  useEffect(() => {
    chart.current?.setOption({ textStyle: { fontFamily: font }, animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, animationDuration: 620, ...option }, { notMerge: true });
  }, [option]);
  return <div ref={container} className={'chart ' + className} role="img" aria-label={label} />;
}

export type Line = { name: string; values: number[]; color?: string };
const lineColor = (line: Line, index: number) => line.color ?? (line.name === 'Outgoing' ? colors.outgoing : line.name === 'Transit' ? colors.purple : palette[index % palette.length]);

export function TrendChart({ labels, series, metric, mode = 'line' }: { labels: string[]; series: Line[]; metric: string; mode?: 'line' | 'bar' }) {
  return <Chart label={metric + ' by period for ' + series.map(item => item.name).join(' and ')} className="trend-canvas" option={{
    grid: { top: 19, bottom: 25, left: 5, right: 12, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: mode === 'line' ? 'line' : 'shadow', lineStyle: { color: '#cbd3e7', type: 'dashed' } } },
    xAxis: { type: 'category', data: labels, boundaryGap: mode === 'bar', axisLine: { lineStyle: { color: '#e7edf6' } }, axisTick: { show: false }, axisLabel: { color: '#64748b', fontSize: 11, hideOverlap: true, margin: 12, interval: labels.length > 11 ? Math.ceil(labels.length / 7) - 1 : 'auto' } },
    yAxis: { type: 'value', min: 0, splitNumber: 4, minInterval: 1, axisLabel: { color: '#64748b', fontSize: 11, formatter: (value: number) => compact(value, 0) }, splitLine: { lineStyle: { color: '#e8edf5', type: 'dashed' } } },
    series: series.map((line, index) => {
      const color = lineColor(line, index);
      if (mode === 'bar') return { type: 'bar', name: line.name, data: line.values, barMaxWidth: 23, itemStyle: { color, borderRadius: [4, 4, 0, 0] } };
      return {
        type: 'line', name: line.name, data: line.values, smooth: 0.35, showSymbol: labels.length === 1, symbolSize: 7,
        lineStyle: { width: 3, color }, itemStyle: { color },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color + '2A' }, { offset: 1, color: color + '03' }]) },
      };
    }),
  }} />;
}

export function Legend({ series }: { series: Line[] }) {
  return <div className="chart-legend">{series.map((line, index) => <span key={line.name}><i style={{ background: lineColor(line, index) }} />{line.name}</span>)}</div>;
}

export function Sparkline({ values, color, id }: { values: number[]; color: string; id: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const points = values.map((value, index) => [index * 76 / Math.max(values.length - 1, 1), 31 - (value - min) / (max - min || 1) * 25]);
  const path = points.map(point => point.join(',')).join(' ');
  return <svg className="spark" viewBox="0 0 78 35" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    <polygon points={'0,35 ' + path + ' 76,35'} fill={'url(#' + id + ')'} />
    <polyline points={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export type PieItem = { name: string; value: number; color?: string };
export function Donut({ data, total, caption }: { data: PieItem[]; total: string; caption: string }) {
  return <div className="donut-shell">
    <Chart className="donut-canvas" label={caption + ' distribution'} option={{
      color: palette,
      tooltip: { ...tooltip, trigger: 'item' },
      series: [{ type: 'pie', radius: ['66%', '90%'], center: ['50%', '50%'], startAngle: 96, padAngle: data.length > 1 ? 3 : 0,
        data: data.some(item => item.value) ? data.map(item => ({ name: item.name, value: item.value, itemStyle: { color: item.color } })) : [{ name: 'No traffic', value: 1, itemStyle: { color: '#e9edf6' }, tooltip: { show: false } }],
        itemStyle: { borderRadius: 5 }, label: { show: false }, emphasis: { scaleSize: 5 },
      }],
    }} />
    <div className="donut-center"><strong>{total}</strong><span>{caption}</span></div>
  </div>;
}

const project = ([longitude, latitude]: number[]) => [20 + (longitude + 180) * 1.9, 16 + (84 - latitude) * 1.85];
const hub = project([69.4, 30.4]);
const pak = world.find(item => item.code === 'PK');
const routes = countries.slice(0, 9);
const land = world.map(item => item.d).join('');

function routePath(to: number[]) {
  const x = (hub[0] + to[0]) / 2;
  const y = Math.min(hub[1], to[1]) - Math.max(16, Math.abs(hub[0] - to[0]) * 0.125);
  return 'M' + hub.join(',') + ' Q' + x + ',' + y + ' ' + to.join(',');
}

export function HeroMap() {
  const gradient = useId();
  return <svg viewBox="115 0 590 276" className="hero-map" aria-hidden="true">
    <defs>
      <radialGradient id={gradient}><stop stopColor="#9ad2ff" stopOpacity=".35" /><stop offset="1" stopColor="#6697ff" stopOpacity="0" /></radialGradient>
    </defs>
    <circle cx={hub[0]} cy={hub[1]} r="122" fill={'url(#' + gradient + ')'} />
    <path d={land} fill="#b8c7ff" fillOpacity=".21" stroke="#cad6ff" strokeOpacity=".14" strokeWidth=".65" />
    <path d={pak?.d} fill="#71e4da" fillOpacity=".65" stroke="#a9f7ee" strokeWidth="1.2" />
    {[15, 28, 46, 67].map(radius => <circle key={radius} cx={hub[0]} cy={hub[1]} r={radius} fill="none" stroke="#c0dfff" strokeOpacity={radius > 40 ? '.22' : '.42'} strokeDasharray={radius > 40 ? '3 4' : undefined} />)}
    {routes.map((country, index) => {
      const target = project(country.coords);
      return <g key={country.code}>
        <path d={routePath(target)} fill="none" stroke={index % 2 ? '#97aaff' : '#83f6e8'} strokeWidth="1.15" strokeOpacity=".66" />
        <circle cx={target[0]} cy={target[1]} r="2.7" fill={index % 2 ? '#d8dfff' : '#9ff8eb'} />
      </g>;
    })}
    <circle cx={hub[0]} cy={hub[1]} r="8" fill="#90f3e6" fillOpacity=".32" className="hub-glow" />
    <circle cx={hub[0]} cy={hub[1]} r="4.1" fill="#d6fff7" />
    <g transform={'translate(' + (hub[0] + 10) + ',' + (hub[1] + 8) + ')'}>
      <rect width="75" height="20" rx="6" fill="#243faf" stroke="#9bb6ff" strokeOpacity=".55" />
      <text fill="#f2f8ff" x="37.5" y="13.6" textAnchor="middle" fontSize="9.5" fontWeight="800" letterSpacing="1.1">PAKISTAN</text>
    </g>
  </svg>;
}

export function TrafficMap({ values, selected, onSelect }: { values: Map<string, number>; selected: string; onSelect: (name: string) => void }) {
  const ranked = countries.filter(item => (values.get(item.name) ?? 0) > 0);
  const maximum = Math.max(1, ...values.values());
  return <svg viewBox="9 8 706 278" className="traffic-map" aria-label="Traffic corridors connecting Pakistan with partner countries">
    <path d={land} fill="#e7edf9" stroke="#fafdff" strokeWidth=".8" />
    <path d={pak?.d} fill="#455af2" stroke="#fff" strokeWidth=".7" />
    {ranked.map(country => <path key={country.code} d={routePath(project(country.coords))} fill="none" stroke="#667bff" strokeWidth={selected === country.name ? 2 : 1.15} strokeOpacity={selected === country.name ? 1 : '.42'} />)}
    {ranked.map(country => {
      const [x, y] = project(country.coords);
      const calls = values.get(country.name) ?? 0;
      const radius = 3.6 + 2.8 * calls / maximum;
      return <g key={country.code} role="button" tabIndex={0} aria-label={'Filter to ' + country.name} aria-pressed={selected === country.name} className="map-point" onClick={() => onSelect(country.name)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(country.name); } }}>
        <title>{country.name + ' · ' + number(calls) + ' calls'}</title>
        <circle cx={x} cy={y} r={radius + 3} fill="#6277ff" fillOpacity=".2" />
        <circle cx={x} cy={y} r={radius} fill="#576cf5" stroke="#fff" strokeWidth="1.35" />
      </g>;
    })}
    <circle cx={hub[0]} cy={hub[1]} r="11" fill="#556cff" fillOpacity=".22" />
    <circle cx={hub[0]} cy={hub[1]} r="5" fill="#455af2" stroke="#fff" strokeWidth="1.6" />
  </svg>;
}
