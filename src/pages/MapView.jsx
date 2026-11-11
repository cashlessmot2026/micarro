import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinOff } from 'lucide-react';
import { useActive } from '../store';
import { MODULES } from '../modules';
import { MODULE_KEYS } from '../constants';
import { fmtDate, fmtNum, fmtMoney } from '../utils';
import { Empty } from '../components/ui';

export default function MapView() {
  const { data, settings } = useActive();
  const [filter, setFilter] = useState(() => new Set(MODULE_KEYS));
  const el = useRef();
  const map = useRef();
  const layer = useRef();

  const points = useMemo(
    () => MODULE_KEYS.flatMap((m) => data[m].filter((r) => r.gps).map((r) => ({ r, m }))),
    [data]
  );
  const shown = useMemo(() => points.filter((p) => filter.has(p.m)), [points, filter]);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([4.65, -74.08], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current);
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, [points.length > 0]); // eslint-disable-line

  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    const bounds = [];
    for (const { r, m } of shown) {
      const M = MODULES[m];
      const amt = M.displayAmount ? M.displayAmount(r) : M.amount(r);
      L.circleMarker([r.gps.lat, r.gps.lng], { radius: 9, color: '#fff', weight: 2, fillColor: M.color, fillOpacity: 0.95 })
        .bindPopup(`<b>${esc(M.title(r))}</b><br>${fmtDate(r.date)}${r.km ? ` · ${fmtNum(r.km)} km` : ''}${amt ? `<br>${fmtMoney(Math.abs(amt), settings.currency)}` : ''}`)
        .addTo(layer.current);
      bounds.push([r.gps.lat, r.gps.lng]);
    }
    if (bounds.length) map.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [shown, settings.currency]);

  const toggle = (m) => setFilter((f) => { const n = new Set(f); n.has(m) ? n.delete(m) : n.add(m); return n; });

  if (!points.length) {
    return <Empty icon={MapPinOff} title="Sin ubicaciones aún" text="Cuando registres tanqueadas, mantenimientos o revisiones con GPS aparecerán aquí." />;
  }
  return (
    <div>
      <div className="chips scroll-x">
        {MODULE_KEYS.filter((m) => points.some((p) => p.m === m)).map((m) => (
          <button key={m} className={`chip ${filter.has(m) ? 'on' : ''}`} style={{ '--c': MODULES[m].color }} onClick={() => toggle(m)}>
            <i style={{ background: MODULES[m].color }} />{MODULES[m].label} ({points.filter((p) => p.m === m).length})
          </button>
        ))}
      </div>
      <div ref={el} className="map" />
    </div>
  );
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
