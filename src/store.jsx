import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MODULE_KEYS } from './constants';
import { uid, num } from './utils';
import { supabase } from './supabase';
import { enqueue, flush, pullAll, onQueueChange } from './sync';
import { flushPhotos } from './photos';

const KEY = 'mi-vehiculo-v1';
const MODE_KEY = 'mi-vehiculo-mode';

export const DEFAULT_SETTINGS = {
  currency: 'COP',
  oilKm: 5000,
  oilMonths: 6,
  fluidDays: 15,
  brakeKm: 10000,
  brakeDays: 180,
  tireDays: 15,
  washDays: 21,
  docWarnDays: 30,
  autoGps: true,
  theme: 'dark',
  notifications: false
};

const emptyRecords = () => Object.fromEntries(MODULE_KEYS.map((m) => [m, []]));
const empty = () => ({ vehicles: [], activeId: null, records: emptyRecords(), settings: { ...DEFAULT_SETTINGS } });

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.records) {
      return { ...empty(), ...s, records: { ...emptyRecords(), ...s.records }, settings: { ...DEFAULT_SETTINGS, ...s.settings } };
    }
  } catch { /* datos corruptos */ }
  return empty();
}

const ts = (x) => Date.parse(x?.updatedAt || 0) || 0;
const now = () => new Date().toISOString();

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [mode, setModeState] = useState(() => localStorage.getItem(MODE_KEY));
  const [syncInfo, setSyncInfo] = useState({ pending: 0, syncing: false, lastSync: null, error: null });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
  }, [state]);

  useEffect(() => onQueueChange((pending) => setSyncInfo((s) => ({ ...s, pending }))), []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', state.settings.theme === 'light' ? '#f3f5fb' : '#0a0e1a');
  }, [state.settings.theme]);

  const setMode = (m) => {
    if (m) localStorage.setItem(MODE_KEY, m); else localStorage.removeItem(MODE_KEY);
    setModeState(m);
  };

  /** Fusiona la nube con lo local (gana el más reciente) y sube lo que solo existe localmente. */
  const syncNow = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s || !navigator.onLine) return;
    setSyncInfo((x) => ({ ...x, syncing: true, error: null }));
    try {
      await flush();
      flushPhotos();
      const remote = await pullAll();
      const cur = stateRef.current;
      const toPush = [];

      const mergeList = (local, remoteList, table) => {
        const localMap = new Map(local.map((x) => [x.id, x]));
        const out = new Map();
        for (const r of remoteList) {
          const l = localMap.get(r.id);
          localMap.delete(r.id);
          if (!l || ts(r) >= ts(l)) {
            if (!r.deleted) { const { deleted, ...clean } = r; out.set(r.id, clean); }
          } else {
            out.set(l.id, l);
            toPush.push([table, l]);
          }
        }
        for (const l of localMap.values()) { out.set(l.id, l); toPush.push([table, l]); }
        return [...out.values()];
      };

      const vehicles = mergeList(cur.vehicles, remote.vehicles, 'vehicles');
      const localRecs = MODULE_KEYS.flatMap((m) => cur.records[m].map((r) => ({ ...r, module: m })));
      const mergedRecs = mergeList(localRecs, remote.records, 'records');
      const records = emptyRecords();
      for (const r of mergedRecs) if (records[r.module]) records[r.module].push(r);

      let settings = cur.settings;
      if (remote.settings && ts(remote.settings) > ts(cur.settings)) settings = { ...DEFAULT_SETTINGS, ...remote.settings };
      else toPush.push(['user_settings', { data: stripMeta(cur.settings), updatedAt: cur.settings.updatedAt || now() }]);

      const activeId = vehicles.some((v) => v.id === cur.activeId) ? cur.activeId : vehicles[0]?.id || null;
      setState({ ...cur, vehicles, records, settings, activeId });
      toPush.forEach(([t, row]) => enqueue(t, row));
      setSyncInfo((x) => ({ ...x, syncing: false, lastSync: new Date() }));
    } catch (e) {
      console.warn('[sync]', e);
      setSyncInfo((x) => ({ ...x, syncing: false, error: e.message || 'Error de sincronización' }));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (data.session) { setMode('cloud'); syncNow(); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN') { setMode('cloud'); syncNow(); }
    });
    const onVisible = () => document.visibilityState === 'visible' && syncNow();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', syncNow);
    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', syncNow);
    };
  }, [syncNow]);

  const api = useMemo(() => ({
    saveVehicle(v) {
      const id = v.id || uid();
      const row = { ...v, id, updatedAt: now() };
      setState((s) => {
        const exists = s.vehicles.some((x) => x.id === id);
        return {
          ...s,
          vehicles: exists ? s.vehicles.map((x) => (x.id === id ? row : x)) : [...s.vehicles, row],
          activeId: exists ? s.activeId : id
        };
      });
      enqueue('vehicles', row);
      return id;
    },
    deleteVehicle(id) {
      const cur = stateRef.current;
      const v = cur.vehicles.find((x) => x.id === id);
      if (v) enqueue('vehicles', { ...v, deleted: true, updatedAt: now() });
      MODULE_KEYS.forEach((m) => cur.records[m].filter((r) => r.vehicleId === id)
        .forEach((r) => enqueue('records', { ...r, module: m, deleted: true, updatedAt: now() })));
      setState((s) => {
        const vehicles = s.vehicles.filter((x) => x.id !== id);
        const records = Object.fromEntries(MODULE_KEYS.map((m) => [m, s.records[m].filter((r) => r.vehicleId !== id)]));
        return { ...s, vehicles, records, activeId: s.activeId === id ? vehicles[0]?.id || null : s.activeId };
      });
    },
    setActive(id) { setState((s) => ({ ...s, activeId: id })); },
    saveRecord(module, r) {
      const cur = stateRef.current;
      const row = { ...r, id: r.id || uid(), vehicleId: r.vehicleId || cur.activeId, module, updatedAt: now() };
      setState((s) => {
        const list = s.records[module];
        const exists = list.some((x) => x.id === row.id);
        return { ...s, records: { ...s.records, [module]: exists ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row] } };
      });
      enqueue('records', row);
      return row;
    },
    deleteRecord(module, id) {
      const r = stateRef.current.records[module].find((x) => x.id === id);
      if (r) enqueue('records', { ...r, module, deleted: true, updatedAt: now() });
      setState((s) => ({ ...s, records: { ...s.records, [module]: s.records[module].filter((x) => x.id !== id) } }));
    },
    setSettings(patch) {
      const settings = { ...stateRef.current.settings, ...patch, updatedAt: now() };
      setState((s) => ({ ...s, settings }));
      enqueue('user_settings', { data: stripMeta(settings), updatedAt: settings.updatedAt });
    },
    importAll(data) {
      if (!data || !Array.isArray(data.vehicles) || !data.records) throw new Error('Archivo no válido');
      const stamp = now();
      const vehicles = data.vehicles.map((v) => ({ ...v, updatedAt: stamp }));
      const records = { ...emptyRecords() };
      MODULE_KEYS.forEach((m) => { records[m] = (data.records[m] || []).map((r) => ({ ...r, module: m, updatedAt: stamp })); });
      setState((s) => ({ ...s, vehicles, records, settings: { ...DEFAULT_SETTINGS, ...data.settings }, activeId: vehicles[0]?.id || null }));
      vehicles.forEach((v) => enqueue('vehicles', v));
      MODULE_KEYS.forEach((m) => records[m].forEach((r) => enqueue('records', r)));
    },
    resetLocal() { setState(empty()); },
    async signOut() {
      await supabase.auth.signOut();
      setState(empty());
      localStorage.removeItem('mi-vehiculo-queue-v1');
      setMode(null);
    }
  }), []);

  const value = { state, session, authReady, mode, setMode, syncInfo, syncNow, ...api };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function stripMeta(s) {
  const { updatedAt, ...rest } = s;
  return rest;
}

export const useStore = () => useContext(Ctx);

export function odometer(vehicle, data) {
  let max = num(vehicle?.initialKm) || 0;
  for (const m of MODULE_KEYS) for (const r of data[m] || []) { const k = num(r.km); if (k != null && k > max) max = k; }
  return max;
}

export function useActive() {
  const { state } = useStore();
  return useMemo(() => {
    const vehicle = state.vehicles.find((v) => v.id === state.activeId) || state.vehicles[0] || null;
    const data = {};
    for (const m of MODULE_KEYS) data[m] = vehicle ? state.records[m].filter((r) => r.vehicleId === vehicle.id) : [];
    return { vehicle, data, odo: odometer(vehicle, data), settings: state.settings };
  }, [state.vehicles, state.activeId, state.records, state.settings]);
}
