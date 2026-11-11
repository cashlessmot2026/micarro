import { MODULES, isOpenFine, latestByType, checkLabel } from './modules';
import { MODULE_KEYS, CHECK_GROUPS, isElectric } from './constants';
import { num, daysUntil, daysSince, addMonths, sortRecords, fmtNum, fmtMoney, relDays, parseDate } from './utils';

export function spendByMonth(data, months = 6) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, label: m.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''), values: {}, total: 0 });
  }
  const idx = Object.fromEntries(out.map((o, i) => [o.key, i]));
  for (const m of MODULE_KEYS) {
    for (const r of data[m]) {
      const i = idx[(r.date || '').slice(0, 7)];
      if (i == null) continue;
      const a = MODULES[m].amount(r);
      if (!a) continue;
      out[i].values[m] = (out[i].values[m] || 0) + a;
      out[i].total += a;
    }
  }
  return out;
}

export function spendByCategory(data) {
  return MODULE_KEYS.map((m) => ({
    key: m, label: MODULES[m].label, color: MODULES[m].color,
    value: data[m].reduce((a, r) => a + MODULES[m].amount(r), 0)
  })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
}

export function totalSpend(data) {
  return MODULE_KEYS.reduce((a, m) => a + data[m].reduce((b, r) => b + MODULES[m].amount(r), 0), 0);
}

export function costPerKm(vehicle, data, odo) {
  const kms = MODULE_KEYS.flatMap((m) => data[m].map((r) => num(r.km))).filter((x) => x != null);
  const start = Math.min(...kms, num(vehicle?.initialKm) ?? Infinity);
  const dist = odo - (isFinite(start) ? start : odo);
  return dist > 0 ? totalSpend(data) / dist : null;
}

/** Promedio de km por día (para estimar fechas de próximos servicios). */
export function kmPerDay(data) {
  const pts = MODULE_KEYS.flatMap((m) => data[m]).filter((r) => num(r.km) != null && r.date)
    .map((r) => ({ t: parseDate(r.date).getTime(), km: num(r.km) })).sort((a, b) => a.t - b.t);
  if (pts.length < 2) return null;
  const days = (pts.at(-1).t - pts[0].t) / 86400000;
  const dist = pts.at(-1).km - pts[0].km;
  return days >= 7 && dist > 0 ? dist / days : null;
}

const LEVEL = { danger: 0, warn: 1, info: 2, ok: 3 };

/**
 * Alertas: cambio de aceite, servicios programados, documentos por vencer,
 * revisión de líquidos / frenos / llantas, comparendos pendientes y lavado.
 */
export function computeAlerts(vehicle, data, settings, odo) {
  if (!vehicle) return [];
  const A = [];
  const cur = settings.currency;
  const electric = isElectric(vehicle.powertrain);
  const maint = sortRecords(data.maintenance);

  // 1. Cambio de aceite
  if (!electric) {
    const oil = maint.find((r) => r.type === 'Cambio de aceite');
    const interval = num(vehicle.oilKm) || settings.oilKm;
    if (oil) {
      const nextKm = num(oil.nextKm) || num(oil.km) + interval;
      const nextDate = oil.nextDate || addMonths(oil.date, settings.oilMonths);
      const left = nextKm - odo;
      const days = daysUntil(nextDate);
      const used = Math.min(1, Math.max(0, (odo - num(oil.km)) / (nextKm - num(oil.km) || interval)));
      const level = left <= 0 || days < 0 ? 'danger' : left <= 500 || days <= 15 ? 'warn' : 'ok';
      A.push({
        id: 'oil', level, module: 'maintenance', kind: 'oil', progress: used,
        title: left <= 0 ? 'Cambio de aceite vencido' : 'Próximo cambio de aceite',
        detail: left <= 0 ? `Te pasaste ${fmtNum(-left)} km (tocaba a los ${fmtNum(nextKm)} km)` : `Faltan ${fmtNum(left)} km · a los ${fmtNum(nextKm)} km o ${relDays(days)}`,
        nextKm, left
      });
    } else {
      A.push({ id: 'oil', level: 'info', module: 'maintenance', kind: 'oil', title: 'Registra tu último cambio de aceite', detail: 'Así calculamos cuándo toca el próximo.' });
    }
  }

  // 2. Servicios programados (último de cada tipo con próximo km/fecha)
  for (const r of latestByType(maint)) {
    if (r.type === 'Cambio de aceite') continue;
    const left = num(r.nextKm) != null ? num(r.nextKm) - odo : null;
    const days = daysUntil(r.nextDate);
    if (left == null && days == null) continue;
    const level = (left != null && left <= 0) || (days != null && days < 0) ? 'danger'
      : (left != null && left <= 1000) || (days != null && days <= 20) ? 'warn' : 'ok';
    const name = r.type === 'Otro' ? r.typeOther : r.type;
    A.push({
      id: `m-${name}`, level, module: 'maintenance', title: `${name}`,
      detail: [left != null ? (left <= 0 ? `vencido hace ${fmtNum(-left)} km` : `faltan ${fmtNum(left)} km`) : null, days != null ? relDays(days) : null].filter(Boolean).join(' · ')
    });
  }

  // 3. Documentos
  for (const r of latestByType(data.documents)) {
    const d = daysUntil(r.expiry);
    if (d == null) continue;
    const name = r.type === 'Otro' ? r.typeOther : r.type;
    const level = d < 0 ? 'danger' : d <= settings.docWarnDays ? 'warn' : 'ok';
    A.push({
      id: `d-${name}`, level, module: 'documents', kind: 'doc', days: d, title: d < 0 ? `${name} vencido` : `${name}`,
      detail: d < 0 ? `Venció ${relDays(d)} (${r.expiry}). ¡No circules sin él!` : `Vence ${relDays(d)} · ${r.expiry}`
    });
  }
  const docTypes = new Set(data.documents.map((r) => r.type));
  for (const t of ['SOAT', 'Revisión técnico-mecánica']) {
    if (!docTypes.has(t)) A.push({ id: `d-${t}`, level: 'info', module: 'documents', title: `Registra tu ${t}`, detail: 'Te avisaremos antes de que venza.' });
  }

  // 4. Revisiones preventivas (líquidos, frenos, llantas)
  const checks = sortRecords(data.checks);
  const lastWith = (group) => checks.find((c) => CHECK_GROUPS.find((g) => g.id === group).items.some((i) => c.items?.[i.id]));
  const fluid = lastWith('fluids');
  const fd = fluid ? daysSince(fluid.date) : null;
  A.push({
    id: 'fluids', module: 'checks', level: fluid == null ? 'warn' : fd >= settings.fluidDays ? 'warn' : 'ok',
    title: 'Revisión de líquidos', detail: fluid == null ? 'Nunca registrada: aceite, refrigerante, frenos, limpiaparabrisas.' : fd >= settings.fluidDays ? `Última hace ${fd} días (cada ${settings.fluidDays} días)` : `Revisados ${relDays(-fd)}`
  });

  const brakeCheck = lastWith('brakes');
  const brakeMaint = maint.find((r) => ['Pastillas de freno', 'Discos de freno', 'Líquido de frenos'].includes(r.type));
  const brake = [brakeCheck, brakeMaint].filter(Boolean).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  if (brake) {
    const kmSince = num(brake.km) != null ? odo - num(brake.km) : null;
    const bd = daysSince(brake.date);
    const due = (kmSince != null && kmSince >= settings.brakeKm) || bd >= settings.brakeDays;
    A.push({ id: 'brakes', module: 'checks', level: due ? 'warn' : 'ok', title: 'Revisión de frenos', detail: due ? `Última hace ${bd} días${kmSince != null ? ` / ${fmtNum(kmSince)} km` : ''}` : `Revisados ${relDays(-bd)}` });
  } else {
    A.push({ id: 'brakes', module: 'checks', level: 'warn', title: 'Revisión de frenos', detail: 'Sin registro. Revisa pastillas, discos y líquido.' });
  }

  const tires = lastWith('tires');
  const td = tires ? daysSince(tires.date) : null;
  if (tires == null || td >= settings.tireDays) {
    A.push({ id: 'tires', module: 'checks', level: 'info', title: 'Presión de llantas', detail: tires ? `Última revisión hace ${td} días` : 'Revisa la presión cada 15 días.' });
  }

  // Ítems marcados mal en la última revisión
  if (checks[0]) {
    const issues = Object.entries(checks[0].items || {}).filter(([, s]) => s !== 'ok');
    if (issues.length) {
      A.push({
        id: 'issues', module: 'checks', level: issues.some(([, s]) => s === 'bad') ? 'danger' : 'warn',
        title: 'Puntos por atender', detail: issues.map(([k, s]) => `${checkLabel(k)} (${s === 'bad' ? 'mal' : 'regular'})`).join(', ')
      });
    }
  }

  // 5. Comparendos pendientes
  const open = data.fines.filter(isOpenFine);
  if (open.length) {
    const total = open.reduce((a, r) => a + (num(r.amount) || 0), 0);
    const soon = open.map((r) => daysUntil(r.dueDate)).filter((d) => d != null).sort((a, b) => a - b)[0];
    A.push({
      id: 'fines', module: 'fines', level: 'danger', title: `${open.length} comparendo${open.length > 1 ? 's' : ''} pendiente${open.length > 1 ? 's' : ''}`,
      detail: `${fmtMoney(total, cur)}${soon != null ? ` · plazo ${relDays(soon)}` : ''}`
    });
  }

  // 6. Lavado
  const wash = sortRecords(data.washes)[0];
  if (wash && daysSince(wash.date) >= settings.washDays) {
    A.push({ id: 'wash', module: 'washes', level: 'info', title: 'Hora de lavar el vehículo', detail: `Última lavada hace ${daysSince(wash.date)} días` });
  }

  return A.sort((a, b) => LEVEL[a.level] - LEVEL[b.level]);
}
