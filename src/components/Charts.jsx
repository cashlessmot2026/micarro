import { useState } from 'react';
import { fmtCompact, fmtMoney, fmtNum } from '../utils';

export function StackedBars({ data, series, currency }) {
  const [sel, setSel] = useState(data.length - 1);
  const W = 320, H = 150, pad = 18;
  const max = Math.max(1, ...data.map((d) => d.total));
  const bw = (W - pad * 2) / data.length;
  const cur = data[sel];
  return (
    <div className="chart">
      <div className="chart-readout">
        <span>{cur?.label}</span>
        <b>{fmtMoney(cur?.total || 0, currency)}</b>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="chart-svg" role="img" aria-label="Gasto mensual">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={pad} x2={W - pad} y1={H - H * g * 0.9} y2={H - H * g * 0.9} className="grid" />
        ))}
        {data.map((d, i) => {
          let y = H;
          const x = pad + i * bw + bw * 0.2;
          const w = bw * 0.6;
          return (
            <g key={d.key} onClick={() => setSel(i)} className={`bar-g ${i === sel ? 'sel' : ''}`} style={{ '--d': `${i * 60}ms` }}>
              <rect x={pad + i * bw} y={0} width={bw} height={H} fill="transparent" />
              {series.map((s) => {
                const v = d.values[s.key] || 0;
                if (!v) return null;
                const h = (v / max) * H * 0.9;
                y -= h;
                return <rect key={s.key} x={x} y={y} width={w} height={Math.max(h - 1.5, 1)} rx={5} fill={s.color} className="bar" />;
              })}
              {!d.total && <rect x={x} y={H - 3} width={w} height={3} rx={1.5} className="bar-empty" />}
              <text x={x + w / 2} y={H + 16} textAnchor="middle" className="axis">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {series.filter((s) => data.some((d) => d.values[s.key])).map((s) => (
          <span key={s.key}><i style={{ background: s.color }} />{s.label}{cur?.values[s.key] ? `: ${fmtCompact(cur.values[s.key])}` : ''}</span>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ points, color = 'var(--primary)', unit = '', decimals = 1 }) {
  const [sel, setSel] = useState(points.length - 1);
  if (points.length < 2) return <p className="muted small">Registra al menos 3 tanqueadas con tanque lleno para ver la tendencia.</p>;
  const W = 320, H = 120, pad = 14;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = max - min || 1;
  const X = (i) => pad + (i * (W - pad * 2)) / (points.length - 1);
  const Y = (v) => H - pad - ((v - min) / span) * (H - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${X(points.length - 1)},${H} L${X(0)},${H} Z`;
  const cur = points[sel] || points.at(-1);
  const id = `lg${Math.round(Math.random() * 1e6)}`;
  return (
    <div className="chart">
      <div className="chart-readout"><span>{cur.label}</span><b>{fmtNum(cur.y, decimals)} {unit}</b></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.35" /><stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="line-draw" />
        {points.map((p, i) => (
          <g key={i} onClick={() => setSel(i)}>
            <rect x={X(i) - 10} y={0} width={20} height={H} fill="transparent" />
            <circle cx={X(i)} cy={Y(p.y)} r={i === sel ? 5.5 : 3} fill={i === sel ? color : 'var(--card)'} stroke={color} strokeWidth="2" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function Donut({ items, currency, size = 140 }) {
  const total = items.reduce((a, x) => a + x.value, 0);
  const r = 52, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox="0 0 140 140" className="donut">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--track)" strokeWidth="16" />
        {items.map((it) => {
          const len = total ? (it.value / total) * c : 0;
          const el = (
            <circle key={it.key} cx="70" cy="70" r={r} fill="none" stroke={it.color} strokeWidth="16"
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" strokeLinecap="butt" className="donut-seg" />
          );
          off += len;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="donut-l">Total</text>
        <text x="70" y="84" textAnchor="middle" className="donut-v">{fmtCompact(total)}</text>
      </svg>
      <ul className="donut-legend">
        {items.map((it) => (
          <li key={it.key}><i style={{ background: it.color }} /><span>{it.label}</span><b>{total ? Math.round((it.value / total) * 100) : 0}%</b><small>{fmtMoney(it.value, currency)}</small></li>
        ))}
      </ul>
    </div>
  );
}
