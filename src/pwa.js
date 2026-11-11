import { useEffect, useState } from 'react';

const subs = new Set();
const notify = () => subs.forEach((f) => f());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__bip = e; notify(); });
  window.addEventListener('bip-ready', notify);
  window.addEventListener('appinstalled', () => { window.__bip = null; localStorage.setItem('mi-vehiculo-installed', '1'); notify(); });
}

export function platform() {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|TikTok|Snapchat|; wv\)/i.test(ua);
  const iosNotSafari = ios && /CriOS|FxiOS|EdgiOS/i.test(ua);
  const samsung = /SamsungBrowser/i.test(ua);
  const firefox = /Firefox|FxiOS/i.test(ua);
  return { ios, android, inApp, iosNotSafari, samsung, firefox, desktop: !ios && !android };
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => subs.delete(f); }, []);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  return {
    canInstall: !!window.__bip,
    installed: standalone,
    async install() {
      const p = window.__bip;
      if (!p) return false;
      window.__bip = null;
      notify();
      await p.prompt();
      const { outcome } = await p.userChoice;
      window.__bip = null;
      notify();
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
