import { num } from './utils';

/** Rendimiento por método "tanque lleno a tanque lleno" (como Fuelio / Drivvo). */
export function fuelStats(recs) {
  const list = recs.filter((r) => num(r.km) != null).sort((a, b) => num(a.km) - num(b.km) || (a.date || '').localeCompare(b.date || ''));
  const points = [];
  let lastFull = -1;
  list.forEach((r, i) => {
    if (!r.full) return;
    if (lastFull >= 0) {
      const dist = num(r.km) - num(list[lastFull].km);
      let qty = 0, cost = 0;
      for (let j = lastFull + 1; j <= i; j++) { qty += num(list[j].quantity) || 0; cost += num(list[j].total) || 0; }
      if (dist > 0 && qty > 0) points.push({ date: r.date, km: num(r.km), eff: dist / qty, unit: r.unit, costKm: cost / dist, dist });
    }
    lastFull = i;
  });
  const lastFill = list.at(-1) || null;
  const unit = lastFill?.unit || 'gal';
  const same = points.filter((p) => p.unit === unit);
  let avg = null;
  if (same.length) {
    const d = same.reduce((a, p) => a + p.dist, 0);
    const q = same.reduce((a, p) => a + p.dist / p.eff, 0);
    avg = d / q;
  } else if (list.length >= 2) {
    const dist = num(list.at(-1).km) - num(list[0].km);
    const qty = list.slice(1).reduce((a, r) => a + (num(r.quantity) || 0), 0);
    avg = dist > 0 && qty > 0 ? dist / qty : null;
  }
  const totalCost = recs.reduce((a, r) => a + (num(r.total) || 0), 0);
  const totalQty = recs.filter((r) => r.unit === unit).reduce((a, r) => a + (num(r.quantity) || 0), 0);
  const priced = recs.filter((r) => r.unit === unit && num(r.price));
  const avgPrice = priced.length ? priced.reduce((a, r) => a + num(r.price), 0) / priced.length : null;
  return { avg, last: same.at(-1)?.eff ?? null, unit, points: same, totalCost, totalQty, avgPrice, lastFill, count: recs.length };
}
