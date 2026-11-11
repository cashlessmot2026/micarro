export const VEHICLE_TYPES = [
  { id: 'auto', label: 'Automóvil', emoji: '🚗' },
  { id: 'suv', label: 'Camioneta / SUV', emoji: '🚙' },
  { id: 'pickup', label: 'Pickup', emoji: '🛻' },
  { id: 'moto', label: 'Motocicleta', emoji: '🏍️' },
  { id: 'scooter', label: 'Scooter / patineta', emoji: '🛵' },
  { id: 'van', label: 'Van / Bus', emoji: '🚐' },
  { id: 'camion', label: 'Camión', emoji: '🚚' },
  { id: 'otro', label: 'Otro', emoji: '🚘' }
];
export const vehicleType = (id) => VEHICLE_TYPES.find((t) => t.id === id) || VEHICLE_TYPES[0];
export const isMotoType = (id) => id === 'moto' || id === 'scooter';

export const POWERTRAINS = [
  'Gasolina', 'Diésel', 'Eléctrico', 'Híbrido (HEV)', 'Híbrido enchufable (PHEV)',
  'Gas natural (GNV)', 'Gasolina + GNV', 'GLP'
];
export const isElectric = (p) => p === 'Eléctrico';

export const FUEL_TYPES = [
  { id: 'corriente', label: 'Gasolina corriente', unit: 'gal', color: '#f59e0b' },
  { id: 'extra', label: 'Gasolina extra', unit: 'gal', color: '#f97316' },
  { id: 'diesel', label: 'Diésel / ACPM', unit: 'gal', color: '#eab308' },
  { id: 'biodiesel', label: 'Biodiésel', unit: 'gal', color: '#84cc16' },
  { id: 'electrica_ac', label: 'Carga eléctrica AC (lenta)', unit: 'kWh', electric: true, color: '#22c55e' },
  { id: 'electrica_dc', label: 'Carga eléctrica DC (rápida)', unit: 'kWh', electric: true, color: '#10b981' },
  { id: 'electrica_casa', label: 'Carga eléctrica en casa', unit: 'kWh', electric: true, color: '#14b8a6' },
  { id: 'gnv', label: 'Gas natural vehicular (GNV)', unit: 'm³', color: '#0ea5e9' },
  { id: 'glp', label: 'GLP', unit: 'L', color: '#3b82f6' },
  { id: 'etanol', label: 'Etanol (E85)', unit: 'L', color: '#a3e635' },
  { id: 'hidrogeno', label: 'Hidrógeno', unit: 'kg', color: '#06b6d4' },
  { id: 'otro', label: 'Otro (especificar cuál)', unit: 'L', color: '#a855f7' }
];
export const fuelInfo = (id) => FUEL_TYPES.find((f) => f.id === id) || FUEL_TYPES[0];
export const UNITS = ['gal', 'L', 'kWh', 'm³', 'kg'];
export const effUnit = (u) => `km/${u || 'gal'}`;

export function defaultFuel(vehicle) {
  const p = vehicle?.powertrain || 'Gasolina';
  if (p === 'Diésel') return 'diesel';
  if (p === 'Eléctrico') return 'electrica_ac';
  if (p === 'Gas natural (GNV)') return 'gnv';
  if (p === 'GLP') return 'glp';
  return 'corriente';
}

export const MAINT_TYPES = [
  'Cambio de aceite', 'Filtro de aceite', 'Filtro de aire', 'Filtro de combustible', 'Filtro de cabina (polen)',
  'Pastillas de freno', 'Discos de freno', 'Líquido de frenos', 'Refrigerante', 'Bujías',
  'Correa de distribución', 'Kit de arrastre (moto)', 'Batería', 'Llantas', 'Rotación de llantas',
  'Alineación y balanceo', 'Suspensión / amortiguadores', 'Embrague', 'Transmisión / caja',
  'Aire acondicionado', 'Sincronización', 'Escáner / diagnóstico', 'Revisión general',
  'Latonería y pintura', 'Sistema eléctrico', 'Otro'
];

/** Intervalos sugeridos (se usan para proponer el próximo servicio). */
export const MAINT_INTERVALS = {
  'Filtro de aire': { km: 10000, months: 12 },
  'Filtro de combustible': { km: 20000 },
  'Filtro de cabina (polen)': { km: 15000, months: 12 },
  'Pastillas de freno': { km: 30000 },
  'Líquido de frenos': { months: 24 },
  'Refrigerante': { km: 40000, months: 24 },
  'Bujías': { km: 30000 },
  'Correa de distribución': { km: 60000 },
  'Kit de arrastre (moto)': { km: 15000 },
  'Batería': { months: 36 },
  'Rotación de llantas': { km: 10000 },
  'Alineación y balanceo': { km: 10000, months: 6 },
  'Aire acondicionado': { months: 12 },
  'Sincronización': { km: 20000 },
  'Revisión general': { km: 10000, months: 6 }
};

export const CHECK_GROUPS = [
  {
    id: 'fluids', label: 'Líquidos', items: [
      { id: 'aceite', label: 'Aceite de motor' },
      { id: 'refrigerante', label: 'Refrigerante' },
      { id: 'liq_frenos', label: 'Líquido de frenos' },
      { id: 'direccion', label: 'Dirección hidráulica' },
      { id: 'limpiaparabrisas', label: 'Agua limpiaparabrisas' },
      { id: 'transmision', label: 'Aceite de transmisión' }
    ]
  },
  {
    id: 'brakes', label: 'Frenos', items: [
      { id: 'pastillas', label: 'Pastillas / bandas' },
      { id: 'discos', label: 'Discos' },
      { id: 'freno_mano', label: 'Freno de mano' }
    ]
  },
  {
    id: 'tires', label: 'Llantas', items: [
      { id: 'presion', label: 'Presión de aire' },
      { id: 'labrado', label: 'Desgaste / labrado' },
      { id: 'repuesto', label: 'Llanta de repuesto' }
    ]
  },
  {
    id: 'other', label: 'Eléctrico y seguridad', items: [
      { id: 'bateria', label: 'Batería / bornes' },
      { id: 'luces', label: 'Luces y direccionales' },
      { id: 'plumillas', label: 'Plumillas' },
      { id: 'cinturones', label: 'Cinturones' },
      { id: 'kit', label: 'Kit de carretera / extintor' },
      { id: 'cadena', label: 'Cadena (moto)' }
    ]
  }
];
export const CHECK_ITEMS = CHECK_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.id })));

export const DOC_TYPES = [
  'SOAT', 'Revisión técnico-mecánica', 'Licencia de conducción', 'Seguro todo riesgo',
  'Impuesto vehicular', 'Tarjeta de propiedad', 'Tarjeta de operación', 'Garantía', 'Otro'
];
export const FINE_STATUS = ['Pendiente', 'Pagado', 'Con descuento (curso)', 'Acuerdo de pago', 'Impugnado', 'Prescrito / anulado'];
export const WASH_TYPES = ['Lavado básico', 'Lavado general', 'Lavado full + motor', 'Polichado / encerado', 'Cojinería', 'Desinfección', 'Lavado en casa', 'Cerámico / detailing'];
export const EXPENSE_CATS = ['Peaje', 'Parqueadero', 'Seguro', 'Cuota / financiación', 'Accesorios', 'Llantas', 'Grúa / asistencia', 'Repuesto', 'Impuestos', 'Trámite', 'Otro'];
export const INCOME_CATS = ['Viaje / plataforma', 'Flete', 'Alquiler', 'Reembolso', 'Otro'];

export const COLORS = ['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja', 'Beige', 'Café', 'Vinotinto', 'Dorado', 'Morado'];

export const CATALOG = {
  car: {
    Chevrolet: ['Spark GT', 'Onix', 'Joy', 'Sail', 'Beat', 'Tracker', 'Captiva', 'Equinox', 'Colorado', 'D-Max', 'N300', 'Aveo'],
    Renault: ['Kwid', 'Sandero', 'Stepway', 'Logan', 'Duster', 'Oroch', 'Koleos', 'Captur', 'Arkana', 'Alaskan'],
    Mazda: ['Mazda 2', 'Mazda 3', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-90', 'BT-50'],
    Kia: ['Picanto', 'Soluto', 'Rio', 'Stonic', 'Sonet', 'Seltos', 'Sportage', 'Sorento', 'EV6', 'Niro'],
    Toyota: ['Yaris', 'Corolla', 'Corolla Cross', 'RAV4', 'Fortuner', 'Hilux', 'Prado', 'Land Cruiser', 'C-HR'],
    Nissan: ['March', 'Versa', 'Sentra', 'Kicks', 'Qashqai', 'X-Trail', 'Frontier', 'Leaf'],
    Hyundai: ['Grand i10', 'Accent', 'Venue', 'Creta', 'Tucson', 'Santa Fe', 'Kona', 'Ioniq 5'],
    Volkswagen: ['Gol', 'Voyage', 'Polo', 'Virtus', 'Nivus', 'T-Cross', 'Taos', 'Tiguan', 'Amarok', 'Jetta'],
    Ford: ['Fiesta', 'EcoSport', 'Escape', 'Territory', 'Bronco', 'Explorer', 'Ranger', 'F-150'],
    Suzuki: ['Swift', 'Baleno', 'Dzire', 'Vitara', 'Grand Vitara', 'S-Cross', 'Jimny', 'Ertiga'],
    BYD: ['Dolphin', 'Dolphin Mini', 'Seagull', 'Seal', 'Yuan Plus', 'Song Plus', 'Han', 'Tang', 'Shark'],
    Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
    Mitsubishi: ['Mirage', 'ASX', 'Outlander', 'Montero Sport', 'L200'],
    Jeep: ['Renegade', 'Compass', 'Wrangler', 'Grand Cherokee'],
    Peugeot: ['208', '2008', '3008', '5008', 'Partner'],
    Volvo: ['EX30', 'XC40', 'XC60', 'XC90'],
    BMW: ['Serie 1', 'Serie 3', 'X1', 'X3', 'X5', 'iX'],
    'Mercedes-Benz': ['Clase A', 'Clase C', 'GLA', 'GLC', 'GLE'],
    Audi: ['A3', 'A4', 'Q3', 'Q5', 'e-tron'],
    Honda: ['City', 'Civic', 'HR-V', 'CR-V', 'WR-V'],
    Subaru: ['XV', 'Forester', 'Outback'],
    JAC: ['JS2', 'JS4', 'E10X', 'T8'],
    Chery: ['Tiggo 2', 'Tiggo 4', 'Tiggo 7', 'Tiggo 8'],
    'Great Wall': ['Poer', 'Wingle'],
    Fiat: ['Mobi', 'Argo', 'Cronos', 'Pulse', 'Strada'],
    Citroën: ['C3', 'C4 Cactus', 'C5 Aircross']
  },
  moto: {
    Yamaha: ['NMAX', 'XMAX', 'Crypton', 'BWS', 'FZ 2.0', 'FZ 25', 'MT-03', 'MT-09', 'XTZ 125', 'XTZ 150', 'XTZ 250', 'YBR 125', 'R15', 'R3'],
    Honda: ['CB 125F', 'CB 160F', 'CB 190R', 'XR 150L', 'XR 190L', 'Navi', 'PCX', 'Wave 110', 'Dio', 'CB 500', 'Africa Twin'],
    Suzuki: ['GN 125', 'Gixxer 150', 'Gixxer 250', 'DR 150', 'DR 650', 'Viva R', 'AX4', 'V-Strom 250', 'Burgman'],
    Bajaj: ['Boxer CT 100', 'Boxer S', 'Pulsar NS 125', 'Pulsar NS 160', 'Pulsar NS 200', 'Pulsar 180', 'Discover 125', 'Dominar 400'],
    AKT: ['NKD 125', 'Special 110', 'TT 125', 'TT 200', 'CR4 125', 'CR5 180', 'Dynamic', 'Jet 5'],
    TVS: ['Sport 100', 'Raider 125', 'Apache RTR 160', 'Apache RTR 200', 'Ntorq 125', 'Neo NX'],
    'Hero': ['Eco Deluxe', 'Splendor', 'Hunk 160R', 'Xpulse 200', 'Ignitor'],
    KTM: ['Duke 200', 'Duke 390', 'RC 200', 'Adventure 390'],
    Kawasaki: ['Z400', 'Ninja 400', 'Versys 650', 'KLR 650'],
    Victory: ['MRX 150', 'Bomber 125', 'One', 'Black'],
    'Royal Enfield': ['Classic 350', 'Hunter 350', 'Himalayan', 'Meteor 350'],
    BMW: ['G 310 R', 'G 310 GS', 'F 900 GS', 'R 1300 GS'],
    'Super Soco': ['CUx', 'TC Max'],
    Starker: ['Andes', 'Kuva', 'Fuzz']
  }
};
export const catalogFor = (type) => (isMotoType(type) ? CATALOG.moto : CATALOG.car);

export const MODULE_KEYS = ['fuel', 'maintenance', 'checks', 'documents', 'fines', 'washes', 'expenses'];
