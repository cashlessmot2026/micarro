import { useEffect, useState, lazy, Suspense } from 'react';
import { Home, Fuel, Wrench, FileText, LayoutGrid, ArrowLeft, ChevronDown, Bell, Cloud, CloudOff, Loader2, ScanLine, Plus } from 'lucide-react';
import { useStore, useActive } from './store';
import { useRoute, go } from './router';
import { computeAlerts } from './analytics';
import { notifyAlerts } from './pwa';
import { vehicleType } from './constants';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import Vehicles, { VehicleSheet } from './pages/Vehicles';
import Alerts from './pages/Alerts';
const MapView = lazy(() => import('./pages/MapView'));
import Settings from './pages/Settings';
import More from './pages/More';
import Auth from './pages/Auth';
import { Segmented, Plate } from './components/ui';

const NAV = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/fuel', icon: Fuel, label: 'Combustible' },
  { to: '/service', icon: Wrench, label: 'Taller' },
  { to: '/papers', icon: FileText, label: 'Papeles' },
  { to: '/more', icon: LayoutGrid, label: 'Más' }
];

const TITLES = {
  '/fuel': 'Combustible', '/service': 'Taller y cuidado', '/papers': 'Documentos y multas', '/more': 'Más',
  '/expenses': 'Gastos e ingresos', '/map': 'Mapa', '/alerts': 'Alertas', '/vehicles': 'Mis vehículos', '/settings': 'Ajustes'
};
const SUB = ['/expenses', '/map', '/alerts', '/vehicles', '/settings'];

export default function App() {
  const { state, session, authReady, mode, syncInfo, setActive } = useStore();
  const { vehicle, data, odo, settings } = useActive();
  const { path, params } = useRoute();
  const [picker, setPicker] = useState(false);
  const [newVehicle, setNewVehicle] = useState(false);

  const alerts = vehicle ? computeAlerts(vehicle, data, settings, odo) : [];
  const urgent = alerts.filter((a) => a.level === 'danger' || a.level === 'warn').length;

  useEffect(() => {
    if (vehicle && settings.notifications) notifyAlerts(alerts, vehicle.name || `${vehicle.brand} ${vehicle.model}`);
  }, [vehicle?.id, urgent, settings.notifications]); // eslint-disable-line

  if (!authReady) return <div className="splash"><img src="/favicon.svg" alt="" /><Loader2 className="spin" /></div>;
  if (!session && mode !== 'local') return <Auth />;

  if (!state.vehicles.length) {
    return (
      <div className="app">
        <div className="welcome">
          <div className="welcome-emoji">🚗🏍️⚡</div>
          <h1>¡Bienvenido!</h1>
          <p>Agrega tu vehículo para controlar combustible, mantenimientos, documentos y más. Puedes escanear la tarjeta de propiedad para llenarlo más rápido.</p>
          <button className="btn btn-primary block" onClick={() => setNewVehicle(true)}><ScanLine size={18} />Agregar mi vehículo</button>
          {syncInfo.syncing && <p className="small muted center"><Loader2 size={14} className="spin" /> Buscando tus datos en la nube…</p>}
        </div>
        {newVehicle && <VehicleSheet firstTime onClose={() => setNewVehicle(false)} />}
      </div>
    );
  }

  const isSub = SUB.includes(path);
  let page;
  switch (path) {
    case '/fuel': page = <ModulePage key="fuel" moduleKey="fuel" autoNew={params.new === '1'} />; break;
    case '/service': page = <Tabs tab={params.tab || 'maintenance'} base="/service" tabs={[['maintenance', 'Mantenimientos'], ['checks', 'Revisiones'], ['washes', 'Lavadas']]} />; break;
    case '/papers': page = <Tabs tab={params.tab || 'documents'} base="/papers" tabs={[['documents', 'Documentos'], ['fines', 'Comparendos']]} />; break;
    case '/expenses': page = <ModulePage key="expenses" moduleKey="expenses" />; break;
    case '/more': page = <More />; break;
    case '/map': page = <Suspense fallback={<div className="center muted"><Loader2 className="spin" /></div>}><MapView /></Suspense>; break;
    case '/alerts': page = <Alerts />; break;
    case '/vehicles': page = <Vehicles />; break;
    case '/settings': page = <Settings />; break;
    default: page = <Dashboard />;
  }

  return (
    <div className="app">
      <header className="topbar">
        {isSub ? (
          <button className="icon-btn" onClick={() => history.length > 1 ? history.back() : go('/more')} aria-label="Atrás"><ArrowLeft size={22} /></button>
        ) : (
          <button className="veh-switch" onClick={() => setPicker(!picker)}>
            <span className="veh-emoji">{vehicle.photo ? <img src={vehicle.photo} alt="" /> : vehicleType(vehicle.type).emoji}</span>
            <span className="veh-switch-txt">
              <b>{path === '/' ? vehicle.name || `${vehicle.brand} ${vehicle.model}` : TITLES[path]}</b>
              <small>{path === '/' ? vehicle.plate || vehicle.model : vehicle.name || `${vehicle.brand} ${vehicle.model}`}</small>
            </span>
            <ChevronDown size={16} className={picker ? 'rot' : ''} />
          </button>
        )}
        {isSub && <h1 className="topbar-title">{TITLES[path]}</h1>}
        <div className="topbar-actions">
          <span className="sync-dot" title={session ? (syncInfo.pending ? 'Cambios pendientes por subir' : 'Sincronizado') : 'Sin cuenta'}>
            {!session ? <CloudOff size={18} /> : syncInfo.syncing ? <Loader2 size={18} className="spin" /> : <Cloud size={18} className={syncInfo.pending ? 'warn-text' : 'ok-text'} />}
          </span>
          <button className="icon-btn bell" onClick={() => go('/alerts')} aria-label="Alertas">
            <Bell size={20} />{urgent > 0 && <span className="bell-n">{urgent}</span>}
          </button>
        </div>
      </header>

      {picker && (
        <div className="picker-backdrop" onClick={() => setPicker(false)}>
          <div className="picker" onClick={(e) => e.stopPropagation()}>
            {state.vehicles.map((v) => (
              <button key={v.id} className={`picker-item ${v.id === vehicle.id ? 'on' : ''}`} onClick={() => { setActive(v.id); setPicker(false); }}>
                <span className="veh-emoji">{v.photo ? <img src={v.photo} alt="" /> : vehicleType(v.type).emoji}</span>
                <span className="grow"><b>{v.name || `${v.brand} ${v.model}`}</b><small>{v.brand} {v.model} {v.year}</small></span>
                <Plate plate={v.plate} small />
              </button>
            ))}
            <button className="picker-item add" onClick={() => { setPicker(false); setNewVehicle(true); }}><Plus size={18} />Agregar vehículo</button>
          </div>
        </div>
      )}

      <main className="page" key={path + (params.tab || '')}>{page}</main>

      <nav className="bottom-nav">
        {NAV.map((n) => {
          const active = path === n.to || (n.to === '/more' && isSub);
          return (
            <button key={n.to} className={`nav-item ${active ? 'active' : ''}`} onClick={() => go(n.to)}>
              <n.icon size={22} /><span>{n.label}</span>
            </button>
          );
        })}
      </nav>
      {newVehicle && <VehicleSheet onClose={() => setNewVehicle(false)} />}
    </div>
  );
}

function Tabs({ tab, base, tabs }) {
  return (
    <>
      <div className="tabs-wrap">
        <Segmented small options={tabs.map(([value, label]) => ({ value, label }))} value={tab} onChange={(t) => go(`${base}?tab=${t}`)} />
      </div>
      <ModulePage key={tab} moduleKey={tab} />
    </>
  );
}
