import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, MapPin, ExternalLink, Camera } from 'lucide-react';
import { MODULES } from '../modules';
import { useActive } from '../store';
import { sortRecords, fmtDate, fmtNum, fmtMoney, mapsUrl } from '../utils';
import RecordSheet from '../components/RecordSheet';
import { Empty, Badge } from '../components/ui';

export default function ModulePage({ moduleKey, autoNew }) {
  const { data, odo, settings } = useActive();
  const mod = MODULES[moduleKey];
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const cur = settings.currency;

  useEffect(() => { if (autoNew) setEditing('new'); }, [autoNew]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return sortRecords(data[moduleKey]).filter((r) => !s || JSON.stringify(r).toLowerCase().includes(s));
  }, [data, moduleKey, q]);

  const summary = mod.summary?.(data[moduleKey], { odo, currency: cur });
  const Icon = mod.icon;

  return (
    <div className="module-page" style={{ '--c': mod.color }}>
      {summary && (
        <div className="stats-strip">
          {summary.map((s, i) => (
            <div className="mini-stat" key={s.label} style={{ '--d': `${i * 50}ms` }}>
              <span>{s.label}</span><b>{s.value}</b>
            </div>
          ))}
        </div>
      )}

      {mod.info && (
        <a className="info-card" href={mod.info.url} target="_blank" rel="noreferrer">
          <span>{mod.info.text}</span><ExternalLink size={16} />
        </a>
      )}

      {data[moduleKey].length > 3 && (
        <div className="search">
          <Search size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar en ${mod.label.toLowerCase()}…`} />
        </div>
      )}

      {list.length === 0 ? (
        <Empty icon={Icon} color={mod.color} title={q ? 'Sin resultados' : `Aún no hay ${mod.label.toLowerCase()}`}
          text={q ? 'Prueba con otra búsqueda.' : `Registra tu primer ${mod.singular} y empieza a ver la analítica.`}
          action={!q && <button className="btn btn-primary" style={{ '--c': mod.color }} onClick={() => setEditing('new')}><Plus size={18} />Agregar</button>} />
      ) : (
        <div className="rec-list">
          {list.map((r, i) => {
            const badge = mod.badge?.(r);
            const amount = mod.displayAmount ? mod.displayAmount(r) : mod.amount(r);
            const accent = mod.accent?.(r) || mod.color;
            return (
              <button key={r.id} className="rec" style={{ '--d': `${Math.min(i, 12) * 35}ms`, '--a': accent }} onClick={() => setEditing(r)}>
                <span className="icon-bubble" style={{ '--c': accent }}><Icon size={20} /></span>
                <span className="rec-main">
                  <span className="rec-title">{mod.title(r)}</span>
                  <span className="rec-sub">{mod.subtitle(r, cur)}</span>
                  <span className="rec-meta">
                    {fmtDate(r.date)}{r.km != null && r.km !== '' ? ` · ${fmtNum(r.km)} km` : ''}
                    {r.photo && <span className="photo-tag"><Camera size={13} />foto</span>}
                    {r.gps && (
                      <a href={mapsUrl(r.gps)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="gps-link" aria-label="Ver en mapa">
                        <MapPin size={13} />mapa
                      </a>
                    )}
                  </span>
                </span>
                <span className="rec-right">
                  {amount !== 0 && <span className={`rec-amount ${amount > 0 && mod.key === 'expenses' ? 'pos' : ''}`}>{fmtMoney(Math.abs(amount), cur)}</span>}
                  {badge && <Badge tone={badge.tone}>{badge.text}</Badge>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button className="fab" style={{ '--c': mod.color }} onClick={() => setEditing('new')} aria-label={`Agregar ${mod.singular}`}>
        <Plus size={26} />
      </button>

      {editing && <RecordSheet moduleKey={moduleKey} record={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
