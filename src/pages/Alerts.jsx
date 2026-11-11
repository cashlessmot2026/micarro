import { useActive } from '../store';
import { computeAlerts } from '../analytics';
import { ALERT_ICON, routeFor } from './Dashboard';
import { go } from '../router';
import { Empty } from '../components/ui';
import { BellOff } from 'lucide-react';

const GROUPS = [
  { level: 'danger', label: 'Urgente' },
  { level: 'warn', label: 'Pronto' },
  { level: 'info', label: 'Sugerencias' },
  { level: 'ok', label: 'Al día' }
];

export default function Alerts() {
  const { vehicle, data, odo, settings } = useActive();
  const alerts = computeAlerts(vehicle, data, settings, odo);
  if (!alerts.length) return <Empty icon={BellOff} title="Sin alertas" text="Todo en orden." />;
  return (
    <div className="alerts-page">
      {GROUPS.map((g) => {
        const list = alerts.filter((a) => a.level === g.level);
        if (!list.length) return null;
        return (
          <section key={g.level}>
            <div className="section-title"><h2>{g.label}</h2><span className={`badge b-${g.level}`}>{list.length}</span></div>
            <div className="alert-list">
              {list.map((a, i) => {
                const Ic = ALERT_ICON[a.level];
                return (
                  <button key={a.id} className={`alert-row a-${a.level}`} style={{ '--d': `${i * 40}ms` }} onClick={() => go(`/${routeFor(a.module)}`)}>
                    <span className="alert-ic"><Ic size={20} /></span>
                    <span className="grow"><b>{a.title}</b><small>{a.detail}</small>
                      {a.progress != null && <span className="progress sm"><span style={{ width: `${a.progress * 100}%` }} /></span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
