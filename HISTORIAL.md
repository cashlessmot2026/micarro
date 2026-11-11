# Historial del proyecto · Mi Vehículo

Registro de lo construido, decisiones y pendientes, para retomar el trabajo.

- **App en línea:** https://cashlessmot2026.github.io/micarro/
- **Repositorio:** https://github.com/cashlessmot2026/micarro
- **Supabase:** https://cpamyrkqvigilyagtfex.supabase.co (llave publishable en `src/supabase.js`)

---

## Sesión 1 · 2026-11-10

### 1. Pedido inicial
PWA descargable en React para controlar el vehículo:
- Mantenimientos.
- Combustible: gasolina, diésel, eléctrica y otros, indicando cuál y los km al tanquear.
- Documentos: SOAT, técnico-mecánica.
- Comparendos y multas.
- Dashboard con analítica: km desde la última tanqueada, cambios de aceite, alertas del próximo cambio y alertas de líquidos y frenos.
- Selección del tipo de vehículo y del modelo.
- Extracción de datos de la tarjeta de propiedad.
- Control de lavadas.
- Ubicación GPS en los registros.
- Botones y tarjetas redondeadas y dinámicas.
- Copiar lo útil de otras apps (Drivvo, Fuelio).

**Construido:**
- React 18 + Vite 5 + `vite-plugin-pwa`: instalable y funciona sin conexión.
- Módulos: combustible, mantenimientos, revisiones (checklist), documentos, comparendos, lavadas, gastos e ingresos.
- OCR de la tarjeta de propiedad con `tesseract.js` (`src/ocr.js`).
- GPS en los formularios y un mapa con Leaflet/OSM (`src/pages/MapView.jsx`).
- Dashboard: odómetro, km desde la última tanqueada, autonomía, rendimiento (tanque lleno a tanque lleno), costo por km y gráficas.
- Motor de alertas en `src/analytics.js`: aceite, servicios, documentos, líquidos, frenos, llantas, multas y lavado. Incluye notificaciones del sistema.
- Exportación a CSV y respaldo/restauración en JSON. Tema claro y oscuro.

### 2. Conexión a Supabase y GitHub
- Autenticación con correo y contraseña, más el modo «usar sin cuenta».
- Sincronización con prioridad offline (`src/sync.js`, `src/store.jsx`): primero localStorage, luego una cola que sube a Supabase. Los borrados son suaves (`deleted`) y en conflictos gana el cambio más reciente (`updated_at`).
- Esquema en `supabase/schema.sql`: `vehicles`, `records` y `user_settings` con RLS por usuario.

### 3. Arreglo de la página en blanco en GitHub Pages
- Causa: Pages publicaba el código fuente y la app no usaba la subruta `/micarro/`.
- Solución: `base` configurable (`BASE_PATH`) y despliegue con GitHub Actions (`.github/workflows/deploy.yml`). Cada push a `main` publica la app.

### 4. Propietarios
- Un propietario puede tener 1 o más vehículos.
- Campos `ownerName` y `ownerId` en el vehículo; también se leen por OCR.
- «Mis vehículos» agrupa por propietario. Al agregar otro vehículo se puede reutilizar un propietario existente.
- En el esquema: índice por propietario y la vista `v_owners`.

### 5. Peajes con foto del ticket y GPS
- Botón rápido «Peaje» en Inicio.
- Campos: nombre del peaje, categoría (I a VII o moto), forma de pago (efectivo, Tag/Flypass, tarjeta), valor, km y GPS.
- Foto opcional (ticket, recibo, factura, comparendo) en gastos, combustible, mantenimientos y comparendos.
- Las fotos se guardan en IndexedDB y se suben a Supabase Storage, bucket privado `tickets`, ruta `{user_id}/{photoId}.jpg` (`src/photos.js`).

### 6. Botón «Instalar app»
- `beforeinstallprompt` se captura desde `index.html`, antes de que cargue React.
- Botón visible en la barra superior, un banner en Inicio, la pantalla de acceso y Ajustes.
- Si el navegador no permite instalar directo, muestra los pasos para iPhone (Safari), Android, PC y apps como WhatsApp o Instagram (`src/components/Install.jsx`).

---

## Pendientes / próximos pasos
- [ ] **Ejecutar `supabase/schema.sql`** en Supabase → SQL Editor. Se puede correr varias veces sin dañar nada.
- [ ] En Supabase → Authentication → URL Configuration: poner Site URL y Redirect URL = `https://cashlessmot2026.github.io/micarro/`.
- [ ] (Opcional) Desactivar «Confirm email» si no se quiere confirmación por correo.
- [ ] Probar de punta a punta: registro, login, sincronización entre 2 dispositivos y subida y descarga de fotos.
- [ ] Probar el OCR con una tarjeta de propiedad real y ajustar `parseCard` según el texto que lea.

## Ideas para después
- Recordatorios por calendario (Google Calendar) para SOAT y técnico-mecánica.
- Reportes en PDF por vehículo o propietario.
- Precios de combustible por estación (estilo Fuelio).
- Viajes y rutas, y registro de ingresos por plataforma.
- Compartir un vehículo con otro usuario (conductor o familiar).

## Notas técnicas
- Compilar localmente con la subruta en Git Bash de Windows: `MSYS_NO_PATHCONV=1 BASE_PATH=/micarro/ npx vite build`.
- El service worker guarda la versión anterior en caché. Al probar cambios, recargar con Ctrl+F5 o borrar los datos del sitio.
- Íconos PNG: `node scripts/make-icons.mjs`, sin dependencias.
- Archivos clave: `src/modules.js` (campos de cada módulo), `src/analytics.js` (alertas y estadísticas), `src/store.jsx` (estado y sincronización), `src/constants.js` (catálogos).
