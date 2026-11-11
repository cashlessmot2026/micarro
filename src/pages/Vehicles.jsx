import { useRef, useState } from 'react';
import { Plus, ScanLine, Camera, Loader2, Trash2, Check, ChevronDown, Pencil, ImagePlus } from 'lucide-react';
import { useStore, odometer } from '../store';
import { VEHICLE_TYPES, POWERTRAINS, COLORS, catalogFor, vehicleType, MODULE_KEYS, isMotoType } from '../constants';
import { scanPropertyCard } from '../ocr';
import { resizeImage, fmtNum } from '../utils';
import { Sheet, Plate, Empty, useToast } from '../components/ui';

export default function Vehicles() {
  const { state, setActive } = useStore();
  const [editing, setEditing] = useState(null);

  return (
    <div>
      {state.vehicles.length === 0 ? (
        <Empty icon={Plus} title="Sin vehículos" text="Agrega tu primer vehículo para empezar." />
      ) : (
        <div className="veh-list">
          {state.vehicles.map((v, i) => {
            const data = Object.fromEntries(MODULE_KEYS.map((m) => [m, state.records[m].filter((r) => r.vehicleId === v.id)]));
            const active = v.id === state.activeId;
            return (
              <div key={v.id} className={`veh-card ${active ? 'active' : ''}`} style={{ '--d': `${i * 60}ms` }} onClick={() => setActive(v.id)}>
                <div className="veh-photo">{v.photo ? <img src={v.photo} alt="" /> : <span>{vehicleType(v.type).emoji}</span>}</div>
                <div className="grow">
                  <b>{v.name || `${v.brand} ${v.model}`}</b>
                  <small>{[v.brand, v.model, v.year].filter(Boolean).join(' · ')}</small>
                  <div className="row gap-s"><Plate plate={v.plate} small /><small className="muted">{fmtNum(odometer(v, data))} km</small></div>
                </div>
                {active && <span className="active-dot"><Check size={14} /></span>}
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEditing(v); }} aria-label="Editar"><Pencil size={18} /></button>
              </div>
            );
          })}
        </div>
      )}
      <button className="btn btn-primary block mt" onClick={() => setEditing('new')}><Plus size={18} />Agregar vehículo</button>
      {editing && <VehicleSheet vehicle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

const BLANK = { type: 'auto', powertrain: 'Gasolina', service: 'Particular', fuelUnit: 'gal' };

export function VehicleSheet({ vehicle, onClose, firstTime }) {
  const { saveVehicle, deleteVehicle } = useStore();
  const toast = useToast();
  const [v, setV] = useState(() => vehicle ? { ...vehicle } : { ...BLANK });
  const [scan, setScan] = useState({ state: 'idle', p: 0, msg: '', text: '', found: [] });
  const [more, setMore] = useState(!!vehicle);
  const [confirmDel, setConfirmDel] = useState(false);
  const [tried, setTried] = useState(false);
  const fileRef = useRef();
  const photoRef = useRef();

  const set = (k, val) => setV((x) => {
    const n = { ...x, [k]: val };
    if (k === 'type' && !x.oilKm) n.oilKmSuggest = isMotoType(val) ? 3000 : 5000;
    return n;
  });
  const catalog = catalogFor(v.type);
  const models = catalog[v.brand] || [];

  const onScan = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScan({ state: 'loading', p: 0.05, msg: 'Cargando motor OCR…', text: '', found: [] });
    try {
      const { text, fields } = await scanPropertyCard(file, (p, msg) => setScan((s) => ({ ...s, p, msg })));
      const found = Object.keys(fields);
      setV((x) => ({ ...x, ...fields }));
      setMore(true);
      setScan({ state: found.length ? 'ok' : 'empty', p: 1, msg: '', text, found });
    } catch (err) {
      setScan({ state: 'error', p: 0, msg: err.message || 'No se pudo leer la imagen', text: '', found: [] });
    }
  };

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) set('photo', await resizeImage(f, 480, 0.72));
  };

  const valid = v.brand && v.model && v.type;
  const save = () => {
    setTried(true);
    if (!valid) return;
    const clean = { ...v };
    delete clean.oilKmSuggest;
    ['year', 'initialKm', 'tankCapacity', 'oilKm', 'cc'].forEach((k) => { if (clean[k] !== '' && clean[k] != null) clean[k] = Number(clean[k]); });
    if (clean.plate) clean.plate = clean.plate.toUpperCase().replace(/\s|-/g, '');
    saveVehicle(clean);
    toast(vehicle ? 'Vehículo actualizado' : 'Vehículo agregado');
    onClose();
  };

  const LABELS = { plate: 'Placa', brand: 'Marca', model: 'Modelo', version: 'Línea', year: 'Año', color: 'Color', vin: 'VIN', engine: 'Motor', cc: 'Cilindraje', powertrain: 'Combustible', type: 'Clase', service: 'Servicio', registrationDate: 'Matrícula' };

  return (
    <Sheet title={vehicle ? 'Editar vehículo' : firstTime ? 'Tu primer vehículo' : 'Nuevo vehículo'} onClose={onClose}
      footer={<>
        {vehicle && <button className={`btn btn-danger ${confirmDel ? 'pulse' : ''}`} onClick={() => { if (!confirmDel) return setConfirmDel(true); deleteVehicle(vehicle.id); toast('Vehículo eliminado', 'info'); onClose(); }}><Trash2 size={18} />{confirmDel ? '¿Borrar todo?' : ''}</button>}
        <button className="btn btn-primary grow" onClick={save}>Guardar vehículo</button>
      </>}>

      <div className="ocr-box">
        <div className="row gap">
          <span className="icon-bubble" style={{ '--c': '#8b5cf6' }}><ScanLine size={20} /></span>
          <div className="grow">
            <b>Escanear tarjeta de propiedad</b>
            <small className="muted">Toma una foto nítida de la licencia de tránsito y llenamos los datos por ti.</small>
          </div>
        </div>
        {scan.state === 'loading' ? (
          <div className="progress-wrap">
            <div className="progress"><span style={{ width: `${Math.round(scan.p * 100)}%` }} /></div>
            <small className="muted"><Loader2 size={14} className="spin" /> {scan.msg} {Math.round(scan.p * 100)}%</small>
          </div>
        ) : (
          <button className="btn btn-soft block" style={{ '--c': '#8b5cf6' }} onClick={() => fileRef.current.click()}><Camera size={18} />Tomar o subir foto</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onScan} />
        {scan.state === 'ok' && (
          <div className="ocr-result">
            <small>Detectamos {scan.found.length} datos. Verifícalos abajo:</small>
            <div className="chips">{scan.found.map((k) => <span key={k} className="chip on"><Check size={12} />{LABELS[k] || k}</span>)}</div>
          </div>
        )}
        {scan.state === 'empty' && <small className="warn-text">No reconocimos datos. Intenta con mejor luz y la tarjeta derecha, o llénalo a mano.</small>}
        {scan.state === 'error' && <small className="warn-text">{scan.msg} (el OCR necesita internet la primera vez).</small>}
        {scan.text && <details className="raw"><summary>Ver texto leído</summary><pre>{scan.text}</pre></details>}
      </div>

      <span className="label mt">Tipo de vehículo</span>
      <div className="type-grid">
        {VEHICLE_TYPES.map((t) => (
          <button key={t.id} type="button" className={`type-chip ${v.type === t.id ? 'on' : ''}`} onClick={() => set('type', t.id)}>
            <span>{t.emoji}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label className={`field half ${tried && !v.brand ? 'invalid' : ''}`}>
          <span className="label">Marca<em>*</em></span>
          <input list="brands" value={v.brand || ''} onChange={(e) => set('brand', e.target.value)} placeholder="Ej: Mazda" />
          <datalist id="brands">{Object.keys(catalog).map((b) => <option key={b} value={b} />)}</datalist>
        </label>
        <label className={`field half ${tried && !v.model ? 'invalid' : ''}`}>
          <span className="label">Modelo<em>*</em></span>
          <input list="models" value={v.model || ''} onChange={(e) => set('model', e.target.value)} placeholder="Ej: CX-30" />
          <datalist id="models">{models.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <label className="field half"><span className="label">Año (modelo)</span>
          <input type="number" inputMode="numeric" value={v.year || ''} onChange={(e) => set('year', e.target.value)} placeholder="2022" /></label>
        <label className="field half"><span className="label">Placa</span>
          <input value={v.plate || ''} onChange={(e) => set('plate', e.target.value.toUpperCase())} placeholder="ABC123" maxLength={7} className="upper" /></label>
        <label className="field"><span className="label">Combustible / motorización</span>
          <select value={v.powertrain} onChange={(e) => set('powertrain', e.target.value)}>
            {POWERTRAINS.map((p) => <option key={p}>{p}</option>)}
          </select></label>
        <label className="field half"><span className="label">Kilometraje actual</span>
          <div className="input-wrap"><input type="number" inputMode="numeric" value={v.initialKm ?? ''} onChange={(e) => set('initialKm', e.target.value)} placeholder="0" /><span className="suffix">km</span></div></label>
        <label className="field half"><span className="label">Apodo</span>
          <input value={v.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Ej: La Negra" /></label>
      </div>

      <button type="button" className="more-toggle" onClick={() => setMore(!more)}>
        Más datos (tarjeta de propiedad, tanque, intervalos) <ChevronDown size={18} className={more ? 'rot' : ''} />
      </button>

      {more && (
        <div className="form-grid fade-in">
          <label className="field half"><span className="label">Línea / versión</span>
            <input value={v.version || ''} onChange={(e) => set('version', e.target.value)} /></label>
          <label className="field half"><span className="label">Color</span>
            <input list="colors" value={v.color || ''} onChange={(e) => set('color', e.target.value)} />
            <datalist id="colors">{COLORS.map((c) => <option key={c} value={c} />)}</datalist></label>
          <label className="field half"><span className="label">Cilindraje</span>
            <div className="input-wrap"><input type="number" value={v.cc || ''} onChange={(e) => set('cc', e.target.value)} /><span className="suffix">cc</span></div></label>
          <label className="field half"><span className="label">Servicio</span>
            <select value={v.service || 'Particular'} onChange={(e) => set('service', e.target.value)}>
              {['Particular', 'Público', 'Oficial', 'Diplomático'].map((s) => <option key={s}>{s}</option>)}
            </select></label>
          <label className="field"><span className="label">VIN / chasis</span>
            <input value={v.vin || ''} onChange={(e) => set('vin', e.target.value.toUpperCase())} className="upper" maxLength={17} /></label>
          <label className="field half"><span className="label">No. motor</span>
            <input value={v.engine || ''} onChange={(e) => set('engine', e.target.value.toUpperCase())} className="upper" /></label>
          <label className="field half"><span className="label">Fecha matrícula</span>
            <input type="date" value={v.registrationDate || ''} onChange={(e) => set('registrationDate', e.target.value)} /></label>
          <label className="field half"><span className="label">Capacidad tanque / batería</span>
            <div className="input-wrap"><input type="number" step="0.1" value={v.tankCapacity || ''} onChange={(e) => set('tankCapacity', e.target.value)} /><span className="suffix">{v.powertrain === 'Eléctrico' ? 'kWh' : 'gal'}</span></div>
            <small className="hint">Para estimar la autonomía</small></label>
          <label className="field half"><span className="label">Cambio de aceite cada</span>
            <div className="input-wrap"><input type="number" value={v.oilKm || ''} placeholder={String(v.oilKmSuggest || (isMotoType(v.type) ? 3000 : 5000))} onChange={(e) => set('oilKm', e.target.value)} /><span className="suffix">km</span></div></label>
          <div className="field">
            <span className="label">Foto del vehículo</span>
            <button type="button" className="photo-pick" onClick={() => photoRef.current.click()}>
              {v.photo ? <img src={v.photo} alt="" /> : <><ImagePlus size={22} /><span>Agregar foto</span></>}
            </button>
            <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhoto} />
          </div>
        </div>
      )}
    </Sheet>
  );
}
