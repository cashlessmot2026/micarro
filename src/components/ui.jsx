import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, Check } from 'lucide-react';

export function Sheet({ title, onClose, children, footer, color, icon: Icon }) {
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => { setClosing(true); setTimeout(onClose, 220); }, [onClose]);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [close]);
  return createPortal(
    <div className={`sheet-backdrop ${closing ? 'closing' : ''}`} onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          {Icon && <span className="icon-bubble" style={{ '--c': color }}><Icon size={20} /></span>}
          <h2>{title}</h2>
          <button className="icon-btn" onClick={close} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Segmented({ options, value, onChange, small }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`seg ${small ? 'seg-sm' : ''}`} style={{ '--n': options.length, '--i': idx }}>
      <span className="seg-pill" />
      {options.map((o) => (
        <button key={o.value} type="button" className={`seg-btn ${o.value === value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.icon && <o.icon size={16} />}{o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle-row">
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <button type="button" role="switch" aria-checked={!!checked} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  );
}

export function Rating({ value, onChange }) {
  return (
    <div className="rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} onClick={() => onChange(n === value ? 0 : n)} className={n <= value ? 'on' : ''} aria-label={`${n} estrellas`}>
          <Star size={26} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export function Ring({ value = 0, size = 64, stroke = 7, color = 'var(--primary)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--track)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} className="ring-val" />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action, color }) {
  return (
    <div className="empty">
      {Icon && <span className="icon-bubble lg" style={{ '--c': color || 'var(--primary)' }}><Icon size={30} /></span>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Plate({ plate, small }) {
  if (!plate) return null;
  const p = plate.toUpperCase().replace(/\s|-/g, '');
  return <span className={`plate ${small ? 'sm' : ''}`}>{p.slice(0, 3)}<i>·</i>{p.slice(3)}</span>;
}

export function Badge({ tone = 'info', children }) {
  return <span className={`badge b-${tone}`}>{children}</span>;
}

const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((text, tone = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className={`toast t-${t.tone}`}><Check size={16} />{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
