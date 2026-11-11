export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISO(new Date());
export const parseDate = (s) => (s ? new Date(`${String(s).slice(0, 10)}T00:00:00`) : null);

export function daysUntil(s) {
  if (!s) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((parseDate(s) - t) / 86400000);
}
export const daysSince = (s) => (s ? -daysUntil(s) : null);

export function addMonths(s, m) {
  const d = parseDate(s) || new Date();
  d.setMonth(d.getMonth() + m);
  return toISO(d);
}
export function addDays(s, n) {
  const d = parseDate(s) || new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));

export function fmtNum(n, d = 0) {
  if (n == null || n === '' || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: 0 });
}
export function fmtMoney(n, cur = 'COP') {
  if (n == null || n === '' || isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: cur, maximumFractionDigits: cur === 'COP' ? 0 : 2 }).format(n);
  } catch {
    return `$${fmtNum(n)}`;
  }
}
export function fmtCompact(n) {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e6) return `${fmtNum(n / 1e6, 1)}M`;
  if (a >= 1e3) return `${fmtNum(n / 1e3, 0)}k`;
  return fmtNum(n);
}
export function fmtDate(s, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString('es-CO', opts) : '—';
}
export function relDays(days) {
  if (days == null) return '';
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days === -1) return 'ayer';
  return days > 0 ? `en ${days} días` : `hace ${-days} días`;
}

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS no disponible en este dispositivo'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy) }),
      (e) => reject(new Error(e.code === 1 ? 'Permiso de ubicación denegado' : 'No se pudo obtener la ubicación')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}
export const mapsUrl = (g) => `https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}`;

export function resizeImage(file, max = 640, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function download(name, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function toCSV(rows) {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export const sortRecords = (list) =>
  [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (num(b.km) || 0) - (num(a.km) || 0));
