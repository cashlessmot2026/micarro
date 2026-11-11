import { useEffect, useState } from 'react';
import { MapPin, Loader2, Trash2, CheckCheck, Navigation, XCircle } from 'lucide-react';
import { MODULES } from '../modules';
import { CHECK_GROUPS } from '../constants';
import { useStore, useActive } from '../store';
import { getPosition, mapsUrl, num, fmtNum, sortRecords } from '../utils';
import { Sheet, Toggle, Rating, Segmented, useToast } from './ui';

export default function RecordSheet({ moduleKey, record, onClose }) {
  const { saveRecord, deleteRecord } = useStore();
  const { vehicle, odo, data, settings } = useActive();
  const toast = useToast();
  const mod = MODULES[moduleKey];
  const isNew = !record;
  const [draft, setDraft] = useState(() => (record ? structuredClone(record) : mod.defaults(vehicle, settings)));
  const [tried, setTried] = useState(false);
  const [gps, setGps] = useState({ state: 'idle', msg: '' });
  const [confirmDel, setConfirmDel] = useState(false);

  const capture = async () => {
    setGps({ state: 'loading', msg: '' });
    try {
      const g = await getPosition();
      setDraft((d) => ({ ...d, gps: g }));
      setGps({ state: 'ok', msg: '' });
    } catch (e) {
      setGps({ state: 'error', msg: e.message });
    }
  };
  useEffect(() => { if (isNew && mod.gps && settings.autoGps) capture(); }, []); // eslint-disable-line

  const set = (name, val) => setDraft((d) => {
    let n = { ...d, [name]: val };
    if (mod.derive) n = mod.derive(n, name, { settings, vehicle });
    return n;
  });

  const visible = mod.fields.filter((f) => !f.show || f.show(draft));
  const missing = visible.filter((f) => f.required && (draft[f.name] === '' || draft[f.name] == null));

  const lastFuel = moduleKey === 'fuel' ? sortRecords(data.fuel.filter((r) => r.id !== draft.id && num(r.km) != null && num(r.km) <= (num(draft.km) ?? Infinity)))[0] : null;

  const save = () => {
    setTried(true);
    if (missing.length) return;
    const clean = { ...draft };
    for (const f of mod.fields) {
      if ((f.type === 'number' || f.type === 'money') && clean[f.name] !== '' && clean[f.name] != null) clean[f.name] = Number(clean[f.name]);
      if (f.show && !f.show(clean)) delete clean[f.name];
    }
    saveRecord(moduleKey, clean);
    toast(isNew ? `${cap(mod.singular)} guardado` : 'Cambios guardados');
    onClose();
  };

  const remove = () => {
    if (!confirmDel) return setConfirmDel(true);
    deleteRecord(moduleKey, record.id);
    toast('Registro eliminado', 'info');
    onClose();
  };

  return (
    <Sheet
      title={`${isNew ? 'Nuevo' : 'Editar'}: ${mod.singular}`}
      onClose={onClose} icon={mod.icon} color={mod.color}
      footer={
        <>
          {!isNew && (
            <button className={`btn btn-danger ${confirmDel ? 'pulse' : ''}`} onClick={remove}>
              <Trash2 size={18} />{confirmDel ? '¿Seguro?' : ''}
            </button>
          )}
          <button className="btn btn-primary grow" style={{ '--c': mod.color }} onClick={save}>Guardar</button>
        </>
      }
    >
      {tried && missing.length > 0 && (
        <div className="form-error">Completa: {missing.map((f) => f.label).join(', ')}</div>
      )}
      <div className="form-grid">
        {visible.map((f) => (
          <Field key={f.name} f={f} value={draft[f.name]} draft={draft} onChange={(v) => set(f.name, v)}
            invalid={tried && missing.includes(f)} odo={odo} lastFuel={lastFuel} />
        ))}
      </div>

      {mod.gps && (
        <div className="gps-box">
          <span className="icon-bubble" style={{ '--c': '#22c55e' }}><MapPin size={18} /></span>
          <div className="grow">
            <b>Ubicación GPS</b>
            {draft.gps ? (
              <a href={mapsUrl(draft.gps)} target="_blank" rel="noreferrer" className="small">
                {draft.gps.lat}, {draft.gps.lng} · ±{draft.gps.acc} m
              </a>
            ) : (
              <small className="muted">{gps.state === 'loading' ? 'Obteniendo ubicación…' : gps.msg || 'Sin ubicación'}</small>
            )}
          </div>
          {draft.gps && <button type="button" className="icon-btn" onClick={() => setDraft((d) => ({ ...d, gps: null }))} aria-label="Quitar ubicación"><XCircle size={18} /></button>}
          <button type="button" className="btn btn-sm btn-soft" onClick={capture} disabled={gps.state === 'loading'}>
            {gps.state === 'loading' ? <Loader2 size={16} className="spin" /> : <Navigation size={16} />}
            {draft.gps ? 'Actualizar' : 'Capturar'}
          </button>
        </div>
      )}
    </Sheet>
  );
}

function Field({ f, value, onChange, draft, invalid, odo, lastFuel }) {
  const cls = `field ${f.half ? 'half' : ''} ${invalid ? 'invalid' : ''}`;
  const suffix = typeof f.suffix === 'function' ? f.suffix(draft) : f.suffix;
  const options = typeof f.options === 'function' ? f.options(draft) : f.options;

  if (f.type === 'toggle') return <div className="field"><Toggle checked={!!value} onChange={onChange} label={f.label} hint={f.hint} /></div>;
  if (f.type === 'checklist') return <Checklist value={value || {}} onChange={onChange} />;
  if (f.type === 'segmented') return <div className="field"><Segmented options={options} value={value} onChange={onChange} /></div>;
  if (f.type === 'rating') return <div className="field"><span className="label">{f.label}</span><Rating value={value || 0} onChange={onChange} /></div>;

  let input;
  if (f.type === 'select') {
    input = (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Selecciona…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  } else if (f.type === 'textarea') {
    input = <textarea rows={2} value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
  } else {
    const isNum = f.type === 'number' || f.type === 'money';
    input = (
      <div className="input-wrap">
        {f.type === 'money' && <span className="prefix">$</span>}
        <input
          type={f.type === 'date' ? 'date' : isNum ? 'number' : 'text'}
          inputMode={isNum ? 'decimal' : undefined}
          step={f.step || (f.type === 'money' ? 'any' : '1')}
          value={value ?? ''} placeholder={f.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
    );
  }

  let help = f.hint;
  if (f.odometer) {
    const k = num(value);
    help = `Odómetro actual: ${fmtNum(odo)} km`;
    if (lastFuel && k != null) help = `Recorriste ${fmtNum(k - num(lastFuel.km))} km desde la última tanqueada`;
    if (k != null && k < odo && !lastFuel) help += ' · (menor al actual)';
  }

  return (
    <label className={cls}>
      <span className="label">{f.label}{f.required && <em>*</em>}</span>
      {input}
      {help && <small className="hint">{help}</small>}
    </label>
  );
}

const STATES = [
  { v: 'ok', label: 'OK' },
  { v: 'warn', label: 'Regular' },
  { v: 'bad', label: 'Mal' }
];

function Checklist({ value, onChange }) {
  const setItem = (id, s) => {
    const next = { ...value };
    if (next[id] === s) delete next[id]; else next[id] = s;
    onChange(next);
  };
  const allOk = () => onChange(Object.fromEntries(CHECK_GROUPS.flatMap((g) => g.items.map((i) => [i.id, 'ok']))));
  return (
    <div className="field checklist">
      <div className="row-between">
        <span className="label">Lista de chequeo</span>
        <button type="button" className="btn btn-sm btn-soft" onClick={allOk}><CheckCheck size={16} />Todo OK</button>
      </div>
      {CHECK_GROUPS.map((g) => (
        <div key={g.id} className="check-group">
          <h4>{g.label}</h4>
          {g.items.map((it) => (
            <div key={it.id} className="check-row">
              <span>{it.label}</span>
              <div className="tri">
                {STATES.map((s) => (
                  <button type="button" key={s.v} className={`tri-${s.v} ${value[it.id] === s.v ? 'on' : ''}`} onClick={() => setItem(it.id, s.v)}>{s.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
