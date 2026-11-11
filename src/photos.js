import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Fotos (tickets de peaje, recibos, facturas):
 *  - Se guardan en IndexedDB del dispositivo (no llenan el localStorage).
 *  - Se suben a Supabase Storage, bucket privado "tickets", ruta {user_id}/{photoId}.jpg
 *  - En otro dispositivo se descargan bajo demanda con URL firmada.
 */
const DB = 'mi-vehiculo-photos';
const STORE = 'photos';
const BUCKET = 'tickets';
const QKEY = 'mi-vehiculo-photo-queue';

let dbp;
function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  });
}
export const getLocalPhoto = (id) => tx('readonly', (s) => s.get(id)).catch(() => null);
const putLocal = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
const delLocal = (id) => tx('readwrite', (s) => s.delete(id)).catch(() => {});

const readQ = () => { try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch { return []; } };
const writeQ = (q) => localStorage.setItem(QKEY, JSON.stringify(q));

export async function savePhoto(id, blob) {
  await putLocal(id, blob);
  writeQ([...readQ().filter((x) => x.id !== id), { id, op: 'up' }]);
  flushPhotos();
}

export async function removePhoto(id) {
  if (!id) return;
  await delLocal(id);
  writeQ([...readQ().filter((x) => x.id !== id), { id, op: 'del' }]);
  flushPhotos();
}

let flushing = false;
export async function flushPhotos() {
  if (flushing || !navigator.onLine) return;
  const q = readQ();
  if (!q.length) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  flushing = true;
  try {
    const done = new Set();
    for (const item of q) {
      const path = `${session.user.id}/${item.id}.jpg`;
      if (item.op === 'up') {
        const blob = await getLocalPhoto(item.id);
        if (!blob) { done.add(item.id); continue; }
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (!error) done.add(item.id); else console.warn('[fotos]', error.message);
      } else {
        const { error } = await supabase.storage.from(BUCKET).remove([path]);
        if (!error) done.add(item.id);
      }
    }
    writeQ(readQ().filter((x) => !done.has(x.id)));
  } finally {
    flushing = false;
  }
}

/** Devuelve una URL para mostrar la foto (local o descargada de la nube). */
export function usePhotoUrl(id) {
  const [url, setUrl] = useState(null);
  const [state, setState] = useState(id ? 'loading' : 'none');
  useEffect(() => {
    if (!id) { setUrl(null); setState('none'); return undefined; }
    let objUrl, alive = true;
    (async () => {
      let blob = await getLocalPhoto(id);
      if (!blob) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data } = await supabase.storage.from(BUCKET).download(`${session.user.id}/${id}.jpg`);
          if (data) { blob = data; putLocal(id, data).catch(() => {}); }
        }
      }
      if (!alive) return;
      if (blob) { objUrl = URL.createObjectURL(blob); setUrl(objUrl); setState('ok'); }
      else setState('missing');
    })();
    return () => { alive = false; if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [id]);
  return { url, state };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushPhotos);
  setInterval(flushPhotos, 45000);
  setTimeout(flushPhotos, 3000);
}
