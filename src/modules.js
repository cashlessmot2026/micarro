import { Fuel, Wrench, ClipboardCheck, FileText, ShieldAlert, Droplets, Wallet } from 'lucide-react';
import {
  FUEL_TYPES, UNITS, fuelInfo, defaultFuel, effUnit, MAINT_TYPES, MAINT_INTERVALS, DOC_TYPES,
  FINE_STATUS, WASH_TYPES, EXPENSE_CATS, INCOME_CATS, CHECK_ITEMS
} from './constants';
import { today, fmtNum, fmtMoney, num, daysUntil, daysSince, relDays, addMonths, sortRecords } from './utils';
import { fuelStats } from './stats';

const opts = (arr) => arr.map((x) => (typeof x === 'string' ? { value: x, label: x } : x));
const dateKm = [
  { name: 'date', label: 'Fecha', type: 'date', required: true, half: true },
  { name: 'km', label: 'Kilometraje', type: 'number', required: true, half: true, suffix: 'km', odometer: true }
];
const gpsNote = { name: 'notes', label: 'Notas', type: 'textarea' };
const photo = (label) => ({ name: 'photo', label, type: 'photo' });
export const TOLL_CATEGORIES = ['Cat. I (auto, campero, camioneta)', 'Cat. II (bus, buseta, camión 2 ejes)', 'Cat. III', 'Cat. IV', 'Cat. V', 'Cat. VI', 'Cat. VII', 'Moto (exenta / especial)'];
export const PAY_METHODS = ['Efectivo', 'Tag / Flypass', 'Tarjeta', 'Transferencia / app'];

export const MODULES = {
  fuel: {
    key: 'fuel', short: 'Tanquear', label: 'Combustible', singular: 'tanqueada / carga', icon: Fuel, color: '#f59e0b', gps: true,
    fields: [
      ...dateKm,
      { name: 'fuelType', label: 'Tipo de combustible / energía', type: 'select', required: true, options: FUEL_TYPES.map((f) => ({ value: f.id, label: f.label })) },
      { name: 'fuelOther', label: '¿Cuál combustible?', type: 'text', placeholder: 'Ej: Gasolina 100 octanos', required: true, show: (r) => r.fuelType === 'otro' },
      { name: 'quantity', label: 'Cantidad', type: 'number', required: true, half: true, step: '0.01', suffix: (r) => r.unit },
      { name: 'unit', label: 'Unidad', type: 'select', half: true, options: opts(UNITS) },
      { name: 'price', label: 'Precio por unidad', type: 'money', half: true },
      { name: 'total', label: 'Total pagado', type: 'money', half: true, required: true },
      { name: 'batteryFrom', label: 'Batería inicial', type: 'number', half: true, suffix: '%', show: (r) => fuelInfo(r.fuelType).electric },
      { name: 'batteryTo', label: 'Batería final', type: 'number', half: true, suffix: '%', show: (r) => fuelInfo(r.fuelType).electric },
      { name: 'full', label: 'Tanque lleno / carga completa', type: 'toggle', hint: 'Necesario para calcular el rendimiento exacto' },
      { name: 'station', label: 'Estación / punto de carga', type: 'text', placeholder: 'Terpel, Primax, Biomax, Celsia, Enel X…' },
      photo('Foto del recibo (opcional)'),
      gpsNote
    ],
    defaults: (v) => { const f = defaultFuel(v); return { date: today(), fuelType: f, unit: fuelInfo(f).unit, full: true }; },
    derive(r, changed) {
      if (changed === 'fuelType') r.unit = fuelInfo(r.fuelType).unit;
      const q = num(r.quantity), p = num(r.price), t = num(r.total);
      if ((changed === 'quantity' || changed === 'price') && q && p) r.total = Math.round(q * p * 100) / 100;
      else if (changed === 'quantity' && q && t && !p) r.price = Math.round(t / q);
      else if (changed === 'total' && q && t) r.price = Math.round(t / q);
      return r;
    },
    title: (r) => (r.fuelType === 'otro' ? r.fuelOther || 'Otro combustible' : fuelInfo(r.fuelType).label),
    subtitle: (r, c) => [`${fmtNum(r.quantity, 2)} ${r.unit}`, r.price ? `${fmtMoney(r.price, c)}/${r.unit}` : null, r.station].filter(Boolean).join(' · '),
    amount: (r) => num(r.total) || 0,
    badge: (r) => (r.full ? { text: 'Lleno', tone: 'ok' } : { text: 'Parcial', tone: 'info' }),
    accent: (r) => fuelInfo(r.fuelType).color,
    summary(recs, { odo, currency }) {
      const s = fuelStats(recs);
      return [
        { label: 'Rendimiento', value: s.avg ? `${fmtNum(s.avg, 1)} ${effUnit(s.unit)}` : '—' },
        { label: 'Km desde última', value: s.lastFill ? `${fmtNum(odo - num(s.lastFill.km))} km` : '—' },
        { label: 'Precio prom.', value: s.avgPrice ? `${fmtMoney(s.avgPrice, currency)}/${s.unit}` : '—' },
        { label: 'Total gastado', value: fmtMoney(s.totalCost, currency) }
      ];
    }
  },

  maintenance: {
    key: 'maintenance', short: 'Taller', label: 'Mantenimientos', singular: 'mantenimiento', icon: Wrench, color: '#6366f1', gps: true,
    fields: [
      ...dateKm,
      { name: 'type', label: 'Tipo de servicio', type: 'select', required: true, options: opts(MAINT_TYPES) },
      { name: 'typeOther', label: '¿Qué servicio?', type: 'text', required: true, show: (r) => r.type === 'Otro' },
      { name: 'oilBrand', label: 'Aceite (marca / viscosidad)', type: 'text', placeholder: 'Ej: Mobil 10W-30 sintético', show: (r) => r.type === 'Cambio de aceite' },
      { name: 'oilFilter', label: 'También cambié filtro de aceite', type: 'toggle', show: (r) => r.type === 'Cambio de aceite' },
      { name: 'parts', label: 'Repuestos / detalle', type: 'textarea', placeholder: 'Lista de repuestos o trabajos realizados' },
      { name: 'cost', label: 'Costo total', type: 'money', half: true },
      { name: 'workshop', label: 'Taller', type: 'text', half: true },
      { name: 'nextKm', label: 'Próximo servicio (km)', type: 'number', half: true, suffix: 'km', hint: 'Genera alerta automática' },
      { name: 'nextDate', label: 'Próximo servicio (fecha)', type: 'date', half: true },
      photo('Foto de la factura (opcional)'),
      gpsNote
    ],
    defaults: () => ({ date: today(), type: 'Cambio de aceite' }),
    derive(r, changed, { settings, vehicle }) {
      if (!['type', 'km', 'date'].includes(changed)) return r;
      const km = num(r.km);
      const iv = r.type === 'Cambio de aceite'
        ? { km: num(vehicle?.oilKm) || settings.oilKm, months: settings.oilMonths }
        : MAINT_INTERVALS[r.type];
      if (iv) {
        r.nextKm = iv.km && km ? km + iv.km : '';
        r.nextDate = iv.months && r.date ? addMonths(r.date, iv.months) : '';
      }
      return r;
    },
    title: (r) => (r.type === 'Otro' ? r.typeOther || 'Servicio' : r.type),
    subtitle: (r) => [r.workshop, r.oilBrand, r.nextKm ? `próximo: ${fmtNum(r.nextKm)} km` : null].filter(Boolean).join(' · '),
    amount: (r) => num(r.cost) || 0,
    summary(recs, { currency }) {
      const total = recs.reduce((a, r) => a + (num(r.cost) || 0), 0);
      const last = sortRecords(recs)[0];
      return [
        { label: 'Servicios', value: recs.length },
        { label: 'Invertido', value: fmtMoney(total, currency) },
        { label: 'Último', value: last ? relDays(-daysSince(last.date)) : '—' }
      ];
    }
  },

  checks: {
    key: 'checks', short: 'Revisión', label: 'Revisiones', singular: 'revisión', icon: ClipboardCheck, color: '#10b981', gps: true,
    fields: [
      ...dateKm,
      { name: 'items', label: 'Lista de chequeo', type: 'checklist' },
      { name: 'tirePsi', label: 'Presión llantas (PSI)', type: 'text', placeholder: 'Ej: 32 / 32 / 30 / 30' },
      gpsNote
    ],
    defaults: () => ({ date: today(), items: {} }),
    title: () => 'Revisión preventiva',
    subtitle: (r) => {
      const v = Object.values(r.items || {});
      const bad = v.filter((x) => x !== 'ok').length;
      return `${v.length} puntos revisados · ${bad ? `${bad} por atender` : 'todo OK'}`;
    },
    amount: () => 0,
    badge: (r) => {
      const v = Object.values(r.items || {});
      if (v.includes('bad')) return { text: 'Atención', tone: 'danger' };
      if (v.includes('warn')) return { text: 'Revisar', tone: 'warn' };
      return { text: 'OK', tone: 'ok' };
    },
    summary(recs) {
      const last = sortRecords(recs)[0];
      const issues = last ? Object.entries(last.items || {}).filter(([, s]) => s !== 'ok').length : 0;
      return [
        { label: 'Revisiones', value: recs.length },
        { label: 'Última', value: last ? relDays(-daysSince(last.date)) : '—' },
        { label: 'Por atender', value: issues }
      ];
    }
  },

  documents: {
    key: 'documents', short: 'Papeles', label: 'Documentos', singular: 'documento', icon: FileText, color: '#0ea5e9', gps: false,
    info: { text: 'Consulta el estado de tu vehículo en el RUNT', url: 'https://www.runt.gov.co/consultaCiudadana/#/consultaVehiculo' },
    fields: [
      { name: 'type', label: 'Documento', type: 'select', required: true, options: opts(DOC_TYPES) },
      { name: 'typeOther', label: '¿Cuál documento?', type: 'text', required: true, show: (r) => r.type === 'Otro' },
      { name: 'number', label: 'Número / póliza', type: 'text', half: true },
      { name: 'issuer', label: 'Entidad (aseguradora, CDA…)', type: 'text', half: true },
      { name: 'date', label: 'Fecha de expedición', type: 'date', required: true, half: true },
      { name: 'expiry', label: 'Fecha de vencimiento', type: 'date', half: true, hint: 'Te avisamos antes de que venza' },
      { name: 'cost', label: 'Valor pagado', type: 'money' },
      gpsNote
    ],
    defaults: () => ({ date: today(), type: 'SOAT' }),
    derive(r, changed) {
      if ((changed === 'date' || changed === 'type') && r.date && ['SOAT', 'Revisión técnico-mecánica', 'Seguro todo riesgo', 'Impuesto vehicular'].includes(r.type)) {
        r.expiry = addMonths(r.date, 12);
      }
      return r;
    },
    title: (r) => (r.type === 'Otro' ? r.typeOther || 'Documento' : r.type),
    subtitle: (r) => [r.issuer, r.number ? `No. ${r.number}` : null, r.expiry ? `vence ${r.expiry}` : null].filter(Boolean).join(' · '),
    amount: (r) => num(r.cost) || 0,
    badge: (r) => {
      const d = daysUntil(r.expiry);
      if (d == null) return null;
      if (d < 0) return { text: 'Vencido', tone: 'danger' };
      if (d <= 30) return { text: `${d} días`, tone: 'warn' };
      return { text: 'Vigente', tone: 'ok' };
    },
    summary(recs) {
      const latest = latestByType(recs);
      const d = latest.map((r) => daysUntil(r.expiry)).filter((x) => x != null);
      return [
        { label: 'Vigentes', value: d.filter((x) => x > 30).length },
        { label: 'Por vencer', value: d.filter((x) => x >= 0 && x <= 30).length },
        { label: 'Vencidos', value: d.filter((x) => x < 0).length }
      ];
    }
  },

  fines: {
    key: 'fines', short: 'Multas', label: 'Comparendos y multas', singular: 'comparendo', icon: ShieldAlert, color: '#ef4444', gps: true,
    info: { text: 'Consulta comparendos a tu nombre en el SIMIT', url: 'https://www.fcm.org.co/simit/#/home-public' },
    fields: [
      { name: 'date', label: 'Fecha de la infracción', type: 'date', required: true, half: true },
      { name: 'number', label: 'No. comparendo', type: 'text', half: true },
      { name: 'code', label: 'Código infracción', type: 'text', half: true, placeholder: 'Ej: C02' },
      { name: 'amount', label: 'Valor', type: 'money', half: true, required: true },
      { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Ej: Estacionar en sitio prohibido' },
      { name: 'place', label: 'Lugar / ciudad', type: 'text' },
      { name: 'status', label: 'Estado', type: 'select', options: opts(FINE_STATUS), half: true },
      { name: 'dueDate', label: 'Fecha límite de pago', type: 'date', half: true, hint: 'Ej: plazo para descuento por curso' },
      { name: 'paidDate', label: 'Fecha de pago', type: 'date', show: (r) => r.status === 'Pagado' },
      photo('Foto del comparendo / recibo (opcional)'),
      gpsNote
    ],
    defaults: () => ({ date: today(), status: 'Pendiente' }),
    title: (r) => (r.code ? `${r.code} · ` : '') + (r.description || 'Comparendo'),
    subtitle: (r) => [r.number ? `No. ${r.number}` : null, r.place, r.dueDate && r.status !== 'Pagado' ? `pagar antes de ${r.dueDate}` : null].filter(Boolean).join(' · '),
    amount: (r) => (r.status === 'Pagado' ? num(r.amount) || 0 : 0),
    displayAmount: (r) => num(r.amount) || 0,
    badge: (r) => ({ text: r.status || 'Pendiente', tone: r.status === 'Pagado' ? 'ok' : isOpenFine(r) ? 'danger' : 'info' }),
    summary(recs, { currency }) {
      const open = recs.filter(isOpenFine);
      return [
        { label: 'Pendientes', value: open.length },
        { label: 'Por pagar', value: fmtMoney(open.reduce((a, r) => a + (num(r.amount) || 0), 0), currency) },
        { label: 'Pagado', value: fmtMoney(recs.filter((r) => r.status === 'Pagado').reduce((a, r) => a + (num(r.amount) || 0), 0), currency) }
      ];
    }
  },

  washes: {
    key: 'washes', short: 'Lavada', label: 'Lavadas', singular: 'lavada', icon: Droplets, color: '#06b6d4', gps: true,
    fields: [
      { name: 'date', label: 'Fecha', type: 'date', required: true, half: true },
      { name: 'km', label: 'Kilometraje', type: 'number', half: true, suffix: 'km', odometer: true },
      { name: 'type', label: 'Tipo de lavado', type: 'select', options: opts(WASH_TYPES) },
      { name: 'place', label: 'Lavadero', type: 'text', half: true },
      { name: 'cost', label: 'Costo', type: 'money', half: true },
      { name: 'rating', label: 'Calificación', type: 'rating' },
      gpsNote
    ],
    defaults: () => ({ date: today(), type: 'Lavado general' }),
    title: (r) => r.type || 'Lavada',
    subtitle: (r) => [r.place, r.rating ? '★'.repeat(r.rating) : null].filter(Boolean).join(' · '),
    amount: (r) => num(r.cost) || 0,
    summary(recs, { currency }) {
      const sorted = sortRecords(recs);
      let avgGap = null;
      if (sorted.length > 1) avgGap = Math.round(daysSince(sorted.at(-1).date) - daysSince(sorted[0].date)) / (sorted.length - 1);
      return [
        { label: 'Lavadas', value: recs.length },
        { label: 'Última', value: sorted[0] ? relDays(-daysSince(sorted[0].date)) : '—' },
        { label: 'Cada', value: avgGap ? `${fmtNum(avgGap)} días` : '—' },
        { label: 'Gasto', value: fmtMoney(recs.reduce((a, r) => a + (num(r.cost) || 0), 0), currency) }
      ];
    }
  },

  expenses: {
    key: 'expenses', short: 'Gastos', label: 'Gastos e ingresos', singular: 'movimiento', icon: Wallet, color: '#a855f7', gps: true,
    fields: [
      { name: 'kind', label: 'Tipo', type: 'segmented', options: opts(['Gasto', 'Ingreso']) },
      { name: 'category', label: 'Categoría', type: 'select', required: true, options: (r) => opts(r.kind === 'Ingreso' ? INCOME_CATS : EXPENSE_CATS) },
      { name: 'tollName', label: 'Nombre del peaje', type: 'text', placeholder: 'Ej: Peaje Andes, Chusacá, Pipiral…', show: (r) => r.category === 'Peaje' },
      { name: 'tollCategory', label: 'Categoría', type: 'select', half: true, options: opts(TOLL_CATEGORIES), show: (r) => r.category === 'Peaje' },
      { name: 'payMethod', label: 'Forma de pago', type: 'select', half: true, options: opts(PAY_METHODS), show: (r) => r.kind !== 'Ingreso' },
      { name: 'description', label: 'Descripción', type: 'text', show: (r) => r.category !== 'Peaje' },
      { name: 'date', label: 'Fecha', type: 'date', required: true, half: true },
      { name: 'km', label: 'Kilometraje', type: 'number', half: true, suffix: 'km', odometer: true },
      { name: 'amount', label: 'Valor', type: 'money', required: true },
      photo('Foto del ticket / recibo (opcional)'),
      gpsNote
    ],
    defaults: () => ({ date: today(), kind: 'Gasto', category: 'Peaje', tollCategory: TOLL_CATEGORIES[0], payMethod: 'Efectivo' }),
    derive(r, changed) {
      if (changed === 'kind') r.category = r.kind === 'Ingreso' ? INCOME_CATS[0] : EXPENSE_CATS[0];
      return r;
    },
    title: (r) => r.category + (r.category === 'Peaje' && r.tollName ? ` ${r.tollName}` : r.description ? ` · ${r.description}` : ''),
    subtitle: (r) => [r.kind, r.category === 'Peaje' ? r.tollCategory?.split(' (')[0] : null, r.payMethod].filter(Boolean).join(' · '),
    amount: (r) => (r.kind === 'Ingreso' ? 0 : num(r.amount) || 0),
    displayAmount: (r) => (r.kind === 'Ingreso' ? num(r.amount) || 0 : -(num(r.amount) || 0)),
    badge: (r) => (r.kind === 'Ingreso' ? { text: 'Ingreso', tone: 'ok' } : null),
    summary(recs, { currency }) {
      const inc = recs.filter((r) => r.kind === 'Ingreso').reduce((a, r) => a + (num(r.amount) || 0), 0);
      const exp = recs.filter((r) => r.kind !== 'Ingreso').reduce((a, r) => a + (num(r.amount) || 0), 0);
      const tolls = recs.filter((r) => r.kind !== 'Ingreso' && r.category === 'Peaje');
      return [
        { label: `Peajes (${tolls.length})`, value: fmtMoney(tolls.reduce((a, r) => a + (num(r.amount) || 0), 0), currency) },
        { label: 'Gastos', value: fmtMoney(exp, currency) },
        { label: 'Ingresos', value: fmtMoney(inc, currency) },
        { label: 'Balance', value: fmtMoney(inc - exp, currency) }
      ];
    }
  }
};

export function isOpenFine(r) {
  return !['Pagado', 'Prescrito / anulado'].includes(r.status);
}
export function latestByType(recs) {
  const map = new Map();
  for (const r of sortRecords(recs)) { const k = r.type === 'Otro' ? r.typeOther : r.type; if (!map.has(k)) map.set(k, r); }
  return [...map.values()];
}
export const checkLabel = (id) => CHECK_ITEMS.find((i) => i.id === id)?.label || id;
