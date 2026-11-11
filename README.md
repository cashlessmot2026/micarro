# 🚗 Mi Vehículo — PWA de control vehicular

App web progresiva (instalable en Android, iPhone y PC) hecha en **React + Vite**, conectada a **Supabase** y con funcionamiento **sin conexión**.

## Funciones
- **Varios vehículos**: tipo (auto, SUV, pickup, moto, scooter, van, camión), motorización (gasolina, diésel, eléctrico, híbrido, GNV, GLP), catálogo de marcas y modelos de Colombia, foto.
- **Escaneo de la tarjeta de propiedad (OCR)**: con una foto se extraen placa, marca, modelo, línea, año, color, cilindraje, VIN, motor, combustible, clase y servicio.
- **Combustible**: gasolina corriente o extra, diésel/ACPM, biodiésel, carga eléctrica (AC, DC o en casa, con % de batería), GNV, GLP, etanol, hidrógeno u **otro (especificando cuál)**. Kilometraje al tanquear, cantidad, precio, total con autocálculo, tanque lleno, estación y **GPS**.
- **Mantenimientos**: más de 25 tipos, con sugerencia automática del próximo servicio por km y por fecha. Incluye cambio de aceite con marca y viscosidad.
- **Revisiones preventivas**: lista de chequeo de líquidos, frenos, llantas y parte eléctrica/seguridad, con estados OK, Regular o Mal.
- **Documentos**: SOAT, técnico-mecánica, licencia, seguro todo riesgo, impuesto, etc., con alerta de vencimiento.
- **Comparendos y multas**: código, valor, estado, plazo de pago, más enlaces al SIMIT y al RUNT.
- **Lavadas**: tipo, lavadero, costo, calificación y frecuencia.
- **Gastos e ingresos**: peajes, parqueaderos, cuotas, ingresos por plataformas.
- **Dashboard**: odómetro, km desde la última tanqueada, autonomía estimada, rendimiento (km/gal, km/kWh…), costo por km, gasto mensual, tendencia de precio, distribución de gastos y actividad reciente.
- **Alertas**: próximo cambio de aceite, servicios programados, documentos por vencer, revisión de líquidos, frenos y presión de llantas, puntos marcados como malos, multas pendientes y lavado. Incluye notificaciones del sistema.
- **Mapa** con todos los registros que tienen GPS.
- Exportación a **CSV (Excel)** y copia de seguridad o restauración en **JSON**.
- Tema oscuro y claro; tarjetas y botones redondeados y animados.

## Configurar Supabase
1. En tu proyecto de Supabase abre **SQL Editor** y ejecuta [`supabase/schema.sql`](supabase/schema.sql).
2. En **Authentication → URL Configuration** agrega la URL donde publiques la app (y `http://localhost:5173` para desarrollo).
3. Si no quieres confirmar el correo al registrarte: **Authentication → Providers → Email → Confirm email** (desactívalo).

La URL y la llave *publishable* ya vienen configuradas en `src/supabase.js`. Se pueden cambiar con variables de entorno (ver `.env.example`). La llave publishable es pública por diseño: la seguridad la dan las políticas **RLS** del esquema, que limitan a cada usuario a sus propios datos.

### Cómo sincroniza
Todo se guarda primero en el dispositivo y se sube a Supabase cuando hay internet y sesión iniciada. Si se edita el mismo registro en dos dispositivos, gana el cambio más reciente. También se puede usar **sin cuenta**: en ese caso los datos quedan solo en el dispositivo.

## Desarrollo
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera /dist con el service worker
npm run preview
```

## Publicar
Es un sitio estático (`dist/`): funciona en Vercel, Netlify, Cloudflare Pages o GitHub Pages. En Vercel: importa el repo, framework **Vite**, comando `npm run build`, carpeta `dist`.
