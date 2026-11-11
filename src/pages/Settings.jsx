import { useRef } from 'react';
import { Download, Upload, FileSpreadsheet, Bell, Moon, Sun, Smartphone, LogOut, Cloud, CloudOff, RefreshCw, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { MODULE_KEYS } from '../constants';
import { MODULES } from '../modules';
import { download, toCSV, today } from '../utils';
import { useInstall } from '../pwa';
import { InstallButton } from '../components/Install';
import { Toggle, Segmented, useToast } from '../components/ui';

export default function Settings() {
  const { state, setSettings, importAll, session, signOut, syncInfo, syncNow, mode, setMode, resetLocal } = useStore();
  const s = state.settings;
  const toast = useToast();
  const inst = useInstall();
  const fileRef = useRef();

  const num = (k, label, suffix) => (
    <label className="field half"><span className="label">{label}</span>
      <div className="input-wrap"><input type="number" value={s[k]} onChange={(e) => setSettings({ [k]: Number(e.target.value) || 0 })} /><span className="suffix">{suffix}</span></div>
    </label>
  );

  const exportJSON = () => {
    const { vehicles, records, settings } = state;
    download(`mi-vehiculo-${today()}.json`, JSON.stringify({ app: 'mi-vehiculo', version: 1, vehicles, records, settings }, null, 2));
  };
  const exportCSV = () => {
    const names = Object.fromEntries(state.vehicles.map((v) => [v.id, `${v.brand} ${v.model} ${v.plate || ''}`.trim()]));
    const rows = MODULE_KEYS.flatMap((m) => state.records[m].map(({ id, vehicleId, updatedAt, module, gps, items, ...r }) => ({
      modulo: MODULES[m].label, vehiculo: names[vehicleId], ...r,
      lat: gps?.lat, lng: gps?.lng, checklist: items ? JSON.stringify(items) : undefined
    })));
    download(`mi-vehiculo-${today()}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
  };
  const onImport = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { importAll(JSON.parse(await f.text())); toast('Datos importados'); }
    catch (err) { toast(err.message || 'Archivo no válido', 'danger'); }
  };
  const enableNotif = async (on) => {
    if (on && 'Notification' in window) {
      const p = await Notification.requestPermission();
      if (p !== 'granted') return toast('Permiso de notificaciones denegado', 'danger');
    }
    setSettings({ notifications: on });
  };

  return (
    <div className="settings">
      <section className="card">
        <h3 className="card-h">{session ? <Cloud size={18} /> : <CloudOff size={18} />}Cuenta y sincronización</h3>
        {session ? (
          <>
            <p className="small">Sesión: <b>{session.user.email}</b></p>
            <p className="small muted">
              {syncInfo.syncing ? 'Sincronizando…' : syncInfo.pending ? `${syncInfo.pending} cambios por subir` : 'Todo sincronizado con la nube'}
              {syncInfo.lastSync && ` · última: ${syncInfo.lastSync.toLocaleTimeString('es-CO')}`}
            </p>
            {syncInfo.error && <p className="small warn-text">{syncInfo.error}</p>}
            <div className="row gap mt-s">
              <button className="btn btn-soft grow" onClick={syncNow}><RefreshCw size={16} className={syncInfo.syncing ? 'spin' : ''} />Sincronizar</button>
              <button className="btn btn-ghost" onClick={signOut}><LogOut size={16} />Salir</button>
            </div>
          </>
        ) : (
          <>
            <p className="small muted">Usas la app sin cuenta: los datos solo están en este dispositivo.</p>
            <button className="btn btn-primary block mt-s" onClick={() => setMode(null)}><Cloud size={16} />Crear cuenta / iniciar sesión</button>
          </>
        )}
      </section>

      {!inst.installed && (
        <section className="card">
          <h3 className="card-h"><Smartphone size={18} />Instalar la app</h3>
          <p className="small muted">Quedará como una app más en tu celular o computador y funciona sin internet.</p>
          <InstallButton variant="block" label="Instalar en este dispositivo" />
        </section>
      )}

      <section className="card">
        <h3 className="card-h">Apariencia y permisos</h3>
        <Segmented options={[{ value: 'dark', label: 'Oscuro', icon: Moon }, { value: 'light', label: 'Claro', icon: Sun }]} value={s.theme} onChange={(theme) => setSettings({ theme })} />
        <Toggle label="Capturar GPS automáticamente" hint="Al registrar combustible, mantenimientos y revisiones" checked={s.autoGps} onChange={(autoGps) => setSettings({ autoGps })} />
        <Toggle label="Notificaciones de alertas" hint="Aceite, documentos, revisiones, multas" checked={s.notifications} onChange={enableNotif} />
        <label className="field"><span className="label">Moneda</span>
          <select value={s.currency} onChange={(e) => setSettings({ currency: e.target.value })}>
            {['COP', 'USD', 'MXN', 'PEN', 'CLP', 'ARS', 'EUR'].map((c) => <option key={c}>{c}</option>)}
          </select></label>
      </section>

      <section className="card">
        <h3 className="card-h"><Bell size={18} />Intervalos de alertas</h3>
        <div className="form-grid">
          {num('oilKm', 'Aceite cada', 'km')}
          {num('oilMonths', 'o cada', 'meses')}
          {num('fluidDays', 'Revisar líquidos cada', 'días')}
          {num('tireDays', 'Presión llantas cada', 'días')}
          {num('brakeKm', 'Revisar frenos cada', 'km')}
          {num('brakeDays', 'o cada', 'días')}
          {num('docWarnDays', 'Avisar documentos', 'días antes')}
          {num('washDays', 'Recordar lavado cada', 'días')}
        </div>
      </section>

      <section className="card">
        <h3 className="card-h">Tus datos</h3>
        <div className="btn-col">
          <button className="btn btn-soft" onClick={exportCSV}><FileSpreadsheet size={16} />Exportar a Excel (CSV)</button>
          <button className="btn btn-soft" onClick={exportJSON}><Download size={16} />Copia de seguridad (JSON)</button>
          <button className="btn btn-soft" onClick={() => fileRef.current.click()}><Upload size={16} />Restaurar copia</button>
          {!session && mode === 'local' && (
            <button className="btn btn-ghost danger-text" onClick={() => { if (confirm('¿Borrar todos los datos de este dispositivo?')) resetLocal(); }}><Trash2 size={16} />Borrar datos locales</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
      </section>
      <p className="small muted center">Mi Vehículo v1.0 · funciona sin conexión</p>
    </div>
  );
}
