import { supabase } from './supabase';

/**
 * Sincronización offline-first:
 *  - Todo se guarda primero en el dispositivo (localStorage).
 *  - Cada cambio entra a una cola que se envía a Supabase cuando hay sesión e internet.
 *  - Los borrados son "suaves" (deleted = true) para que los otros dispositivos se enteren.
 */
const QKEY = 'mi-vehiculo-queue-v1';
let queue = [];
try { queue = JSON.parse(localStorage.getItem(QKEY)) || []; } catch { queue = []; }
let flushing = false;
const listeners = new Set();

const persist = () => {
  try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch { /* sin espacio */ }
  listeners.forEach((l) => l(queue.length));
};
export const onQueueChange = (fn) => { listeners.add(fn); fn(queue.length); return () => listeners.delete(fn); };
export const pendingCount = () => queue.length;

/** table: 'vehicles' | 'records' | 'user_settings' */
export function enqueue(table, row) {
  const key = table === 'user_settings' ? 'settings' : row.id;
  queue = queue.filter((q) => !(q.table === table && q.key === key));
  queue.push({ table, key, row });
  persist();
  flush();
}

export async function flush() {
  if (flushing || !navigator.onLine || !queue.length) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  flushing = true;
  const userId = session.user.id;
  try {
    for (const table of ['user_settings', 'vehicles', 'records']) {
      const items = queue.filter((q) => q.table === table);
      if (!items.length) continue;
      const rows = items.map(({ row }) => toRemote(table, row, userId));
      const { error } = await supabase.from(table).upsert(rows, { onConflict: table === 'user_settings' ? 'user_id' : 'id' });
      if (error) { console.warn('[sync]', table, error.message); continue; }
      const sent = new Set(items);
      queue = queue.filter((q) => !sent.has(q));
      persist();
    }
  } finally {
    flushing = false;
  }
}

function toRemote(table, row, userId) {
  const updated_at = row.updatedAt || new Date().toISOString();
  if (table === 'user_settings') return { user_id: userId, data: row.data, updated_at };
  const { id, deleted, updatedAt, ...data } = row;
  if (table === 'vehicles') return { id, user_id: userId, data, deleted: !!deleted, updated_at };
  return { id, user_id: userId, vehicle_id: row.vehicleId, module: row.module, data, deleted: !!deleted, updated_at };
}

/** Descarga todo lo del usuario. */
export async function pullAll() {
  const [v, r, s] = await Promise.all([
    supabase.from('vehicles').select('*'),
    supabase.from('records').select('*'),
    supabase.from('user_settings').select('*').maybeSingle()
  ]);
  const err = v.error || r.error || s.error;
  if (err) throw err;
  return {
    vehicles: v.data.map((x) => ({ ...x.data, id: x.id, deleted: x.deleted, updatedAt: x.updated_at })),
    records: r.data.map((x) => ({ ...x.data, id: x.id, vehicleId: x.vehicle_id, module: x.module, deleted: x.deleted, updatedAt: x.updated_at })),
    settings: s.data ? { ...s.data.data, updatedAt: s.data.updated_at } : null
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flush());
  setInterval(() => flush(), 30000);
}
