import { useMemo, useState } from 'react';
import { Gauge, Fuel, TrendingUp, Coins, Route, ChevronRight, AlertTriangle, BellRing, CheckCircle2, Info, Droplet, Plus, CalendarClock, Ticket } from 'lucide-react';
import { useActive } from '../store';
import { MODULES } from '../modules';
import { MODULE_KEYS, effUnit, vehicleType, isElectric } from '../constants';
import { fuelStats } from '../stats';
import { computeAlerts, spendByMonth, spendByCategory, costPerKm, kmPerDay } from '../analytics';
import { fmtNum, fmtMoney, num, sortRecords, fmtDate } from '../utils';
import { StackedBars, LineChart, Donut } from '../components/Charts';
import { Ring, Plate } from '../components/ui';
import RecordSheet from '../components/RecordSheet';
import { go } from '../router';
import { InstallButton } from '../components/Install';

export const ALERT_ICON = { danger: AlertTriangle, warn: BellRing, info: Info, ok: CheckCircle2 };

export default function Dashboard() {
  const { vehicle, data, odo, settings } = useActive();
  const [adding, setAdding] = useState(null);
  const cur = settings.currency;

  const a = useMemo(() => {
    const fs = fuelStats(data.fuel);
    const alerts = computeAlerts(vehicle, data, settings, odo);
    const months = spendByMonth(data, 6);
    return {
      fs, alerts, months,
      cats: spendByCategory(data),
      cpk: costPerKm(vehicle, data, odo),
      kpd: kmPerDay(data),
      kmSince: fs.lastFill ? odo - num(fs.lastFill.km) : null,
      recent: sortRecords(MODULE_KEYS.flatMap((m) => data[m].map((r) => ({ ...r, _m: m })))).slice(0, 6)
    };
  }, [vehicle, data, settings, odo]);

  const oil = a.alerts.find((x) => x.id === 'oil');
  const urgent = a.alerts.filter((x) => x.level === 'danger' || x.level === 'warn');
  const docs = a.alerts.filter((x) => x.kind === 'doc');
  const tank = num(vehicle.tankCapacity);
  const range = tank && a.fs.avg && a.kmSince != null ? Math.max(0, tank * a.fs.avg - a.kmSince) : null;
  const electric = isElectric(vehicle.powertrain);
  const series = MODULE_KEYS.map((m) => ({ key: m, label: MODULES[m].label, color: MODULES[m].color }));

  return (
    <div className="dash">
      <section className="hero card-grad">
        <div className="hero-top">
          <div className="hero-photo">
            {vehicle.photo ? <img src={vehicle.photo} alt="" /> : <span>{vehicleType(vehicle.type).emoji}</span>}
          </div>
          <div className="grow">
            <small>{vehicle.brand} {vehicle.model} {vehicle.year}</small>
            <h1>{vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`}</h1>
            <Plate plate={vehicle.plate} small />
          </div>
        </div>
        <div className="odo">
          <Gauge size={20} />
          <div>
            <small>Odómetro</small>
            <b className="odo-num">{fmtNum(odo)}<span> km</span></b>
          </div>
          {a.kpd && <div className="odo-side"><small>Promedio</small><b>{fmtNum(a.kpd, 0)} km/día</b></div>}
        </div>
      </section>

      <InstallButton variant="banner" />

      {urgent.length > 0 && (
        <section>
          <div className="section-title"><h2>Atención</h2><button className="link" onClick={() => go('/alerts')}>Ver todas <ChevronRight size={16} /></button></div>
          <div className="alert-scroll">
            {urgent.slice(0, 6).map((al, i) => {
              const Ic = ALERT_ICON[al.level];
              return (
                <button key={al.id} className={`alert-card a-${al.level}`} style={{ '--d': `${i * 60}ms` }} onClick={() => go(`/${routeFor(al.module)}`)}>
                  <Ic size={20} />
                  <b>{al.title}</b>
                  <small>{al.detail}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="stat-grid">
        <Stat icon={Route} color="#f59e0b" label={electric ? 'Km desde la última carga' : 'Km desde la última tanqueada'}
          value={a.kmSince != null ? fmtNum(a.kmSince) : '—'} unit="km"
          sub={range != null ? `Autonomía estimada: ${fmtNum(range)} km` : a.fs.lastFill ? fmtDate(a.fs.lastFill.date) : 'Sin registros'} onClick={() => go('/fuel')} />
        <Stat icon={Fuel} color="#22c55e" label="Rendimiento promedio" value={a.fs.avg ? fmtNum(a.fs.avg, 1) : '—'} unit={effUnit(a.fs.unit)}
          sub={a.fs.last ? `Último: ${fmtNum(a.fs.last, 1)} ${effUnit(a.fs.unit)}` : 'Tanque lleno a tanque lleno'} onClick={() => go('/fuel')} />
        <Stat icon={Coins} color="#a855f7" label="Costo por km" value={a.cpk ? fmtMoney(a.cpk, cur) : '—'}
          sub="Todos los gastos / km recorridos" />
        <Stat icon={TrendingUp} color="#0ea5e9" label="Gasto este mes" value={fmtMoney(a.months.at(-1).total, cur)}
          sub={trend(a.months)} />
      </section>

      {(oil || docs.length > 0) && (
        <section className="rings card">
          {oil && oil.progress != null && (
            <button className="ring-item" onClick={() => go('/service')}>
              <Ring value={oil.progress} size={78} color={oil.level === 'danger' ? 'var(--danger)' : oil.level === 'warn' ? 'var(--warn)' : 'var(--ok)'}>
                <Droplet size={22} />
              </Ring>
              <div>
                <small>Cambio de aceite</small>
                <b>{oil.left > 0 ? `${fmtNum(oil.left)} km` : 'Vencido'}</b>
                <small className="muted">próximo a los {fmtNum(oil.nextKm)} km</small>
              </div>
            </button>
          )}
          {oil && oil.progress == null && (
            <button className="ring-item" onClick={() => setAdding('maintenance')}>
              <Ring value={0} size={78}><Droplet size={22} /></Ring>
              <div><small>Cambio de aceite</small><b>Sin registro</b><small className="muted">Toca para registrar</small></div>
            </button>
          )}
          {docs.slice(0, 2).map((d) => (
            <button className="ring-item" key={d.id} onClick={() => go('/papers')}>
              <Ring value={Math.max(0, Math.min(1, d.days / 365))} size={78} color={d.level === 'danger' ? 'var(--danger)' : d.level === 'warn' ? 'var(--warn)' : 'var(--sky)'}>
                <CalendarClock size={22} />
              </Ring>
              <div>
                <small>{d.title.replace(' vencido', '')}</small>
                <b>{d.days < 0 ? 'Vencido' : `${d.days} días`}</b>
                <small className="muted">{d.days < 0 ? 'Renueva ya' : 'para vencer'}</small>
              </div>
            </button>
          ))}
        </section>
      )}

      <section>
        <div className="section-title"><h2>Registro rápido</h2></div>
        <div className="quick-grid">
          {MODULE_KEYS.map((m, i) => {
            const M = MODULES[m];
            return (
              <button key={m} className="quick" style={{ '--c': M.color, '--d': `${i * 40}ms` }} onClick={() => setAdding(m)}>
                <span className="icon-bubble"><M.icon size={22} /></span>
                <span>{M.short}</span>
                <Plus size={14} className="quick-plus" />
              </button>
            );
          })}
          <button className="quick" style={{ '--c': '#ec4899', '--d': '280ms' }} onClick={() => setAdding({ m: 'expenses', preset: { kind: 'Gasto', category: 'Peaje' } })}>
            <span className="icon-bubble"><Ticket size={22} /></span>
            <span>Peaje</span>
            <Plus size={14} className="quick-plus" />
          </button>
        </div>
      </section>

      <section className="card chart-card">
        <div className="section-title"><h2>Gasto mensual</h2><small className="muted">últimos 6 meses</small></div>
        <StackedBars data={a.months} series={series} currency={cur} />
      </section>

      {a.fs.points.length > 1 && (
        <section className="card chart-card">
          <div className="section-title"><h2>Rendimiento</h2><small className="muted">{effUnit(a.fs.unit)}</small></div>
          <LineChart color="#22c55e" unit={effUnit(a.fs.unit)} points={a.fs.points.slice(-12).map((p) => ({ y: p.eff, label: fmtDate(p.date) }))} />
        </section>
      )}

      {data.fuel.filter((r) => num(r.price)).length > 1 && (
        <section className="card chart-card">
          <div className="section-title"><h2>Precio del combustible</h2><small className="muted">por {a.fs.unit}</small></div>
          <LineChart color="#f59e0b" decimals={0} unit={cur}
            points={sortRecords(data.fuel.filter((r) => num(r.price) && r.unit === a.fs.unit)).reverse().slice(-12).map((r) => ({ y: num(r.price), label: fmtDate(r.date) }))} />
        </section>
      )}

      {a.cats.length > 0 && (
        <section className="card chart-card">
          <div className="section-title"><h2>¿En qué se va la plata?</h2></div>
          <Donut items={a.cats} currency={cur} />
        </section>
      )}

      {a.recent.length > 0 && (
        <section>
          <div className="section-title"><h2>Actividad reciente</h2></div>
          <div className="timeline card">
            {a.recent.map((r) => {
              const M = MODULES[r._m];
              const amt = M.displayAmount ? M.displayAmount(r) : M.amount(r);
              return (
                <button key={r.id} className="tl-item" onClick={() => setAdding({ m: r._m, r })}>
                  <span className="icon-bubble sm" style={{ '--c': M.color }}><M.icon size={16} /></span>
                  <span className="grow"><b>{M.title(r)}</b><small>{fmtDate(r.date)}{r.km ? ` · ${fmtNum(r.km)} km` : ''}</small></span>
                  {amt ? <span className="tl-amt">{fmtMoney(Math.abs(amt), cur)}</span> : null}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {adding && (
        <RecordSheet
          moduleKey={typeof adding === 'string' ? adding : adding.m}
          record={typeof adding === 'string' ? null : adding.r || null}
          preset={typeof adding === 'string' ? undefined : adding.preset}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  );
}

function Stat({ icon: Icon, color, label, value, unit, sub, onClick }) {
  return (
    <button className="stat" style={{ '--c': color }} onClick={onClick} disabled={!onClick}>
      <span className="icon-bubble sm"><Icon size={16} /></span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}{unit && value !== '—' && <small> {unit}</small>}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </button>
  );
}

function trend(months) {
  const [prev, curr] = months.slice(-2);
  if (!prev?.total) return 'Comparado con el mes pasado';
  const pct = Math.round(((curr.total - prev.total) / prev.total) * 100);
  return `${pct > 0 ? '▲' : pct < 0 ? '▼' : '='} ${Math.abs(pct)}% vs mes pasado`;
}

export function routeFor(m) {
  return { fuel: 'fuel', maintenance: 'service', checks: 'service?tab=checks', washes: 'service?tab=washes', documents: 'papers', fines: 'papers?tab=fines', expenses: 'expenses' }[m] || '';
}
