import { Wallet, Map, Bell, Car, Settings, ChevronRight, ShieldAlert, FileText, ExternalLink } from 'lucide-react';
import { go } from '../router';
import { useActive } from '../store';
import { computeAlerts } from '../analytics';

const ITEMS = [
  { to: '/expenses', icon: Wallet, label: 'Gastos e ingresos', sub: 'Peajes, parqueaderos, cuotas, viajes', color: '#a855f7' },
  { to: '/map', icon: Map, label: 'Mapa de registros', sub: 'Dónde tanqueaste, lavaste y revisaste', color: '#22c55e' },
  { to: '/alerts', icon: Bell, label: 'Alertas', sub: 'Aceite, documentos, frenos, líquidos', color: '#f59e0b', count: true },
  { to: '/vehicles', icon: Car, label: 'Mis vehículos', sub: 'Agregar, editar, escanear tarjeta', color: '#6366f1' },
  { to: '/settings', icon: Settings, label: 'Ajustes', sub: 'Cuenta, intervalos, exportar, instalar', color: '#64748b' }
];
const LINKS = [
  { href: 'https://www.fcm.org.co/simit/#/home-public', icon: ShieldAlert, label: 'Consultar SIMIT', color: '#ef4444' },
  { href: 'https://www.runt.gov.co/consultaCiudadana/#/consultaVehiculo', icon: FileText, label: 'Consultar RUNT', color: '#0ea5e9' }
];

export default function More() {
  const { vehicle, data, odo, settings } = useActive();
  const urgent = vehicle ? computeAlerts(vehicle, data, settings, odo).filter((a) => a.level === 'danger' || a.level === 'warn').length : 0;
  return (
    <div className="menu-list">
      {ITEMS.map((it, i) => (
        <button key={it.to} className="menu-item" style={{ '--c': it.color, '--d': `${i * 50}ms` }} onClick={() => go(it.to)}>
          <span className="icon-bubble"><it.icon size={22} /></span>
          <span className="grow"><b>{it.label}</b><small>{it.sub}</small></span>
          {it.count && urgent > 0 && <span className="badge b-danger">{urgent}</span>}
          <ChevronRight size={18} className="muted" />
        </button>
      ))}
      <div className="section-title mt"><h2>Consultas oficiales</h2></div>
      {LINKS.map((l) => (
        <a key={l.href} className="menu-item" style={{ '--c': l.color }} href={l.href} target="_blank" rel="noreferrer">
          <span className="icon-bubble"><l.icon size={22} /></span>
          <span className="grow"><b>{l.label}</b></span>
          <ExternalLink size={16} className="muted" />
        </a>
      ))}
    </div>
  );
}
