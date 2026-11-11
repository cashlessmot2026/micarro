import { useEffect, useState } from 'react';

let deferred = null;
const subs = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()); });
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => subs.delete(f); }, []);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    canInstall: !!deferred,
    installed: standalone,
    ios,
    async install() {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      subs.forEach((f) => f());
      return outcome === 'accepted';
    }
  };
}

/** Muestra notificaciones locales de alertas urgentes (máximo una vez al día por alerta). */
export async function notifyAlerts(alerts, vehicleName) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const key = 'mi-vehiculo-notified';
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem(key)) || {}; } catch { /* vacío */ }
  const day = new Date().toISOString().slice(0, 10);
  const reg = await navigator.serviceWorker?.getRegistration();
  for (const a of alerts.filter((x) => x.level === 'danger' || x.level === 'warn')) {
    const id = `${vehicleName}:${a.id}`;
    if (sent[id] === day) continue;
    sent[id] = day;
    const opts = { body: a.detail, icon: `${import.meta.env.BASE_URL}pwa-192.png`, badge: `${import.meta.env.BASE_URL}pwa-192.png`, tag: id };
    try {
      if (reg) await reg.showNotification(`${vehicleName}: ${a.title}`, opts);
      else new Notification(`${vehicleName}: ${a.title}`, opts);
    } catch { /* algunos navegadores no permiten */ }
  }
  localStorage.setItem(key, JSON.stringify(sent));
}
