import { CATALOG, COLORS } from './constants';

/** Lee la foto de la Licencia de Tránsito (tarjeta de propiedad) con OCR en el dispositivo. */
export async function scanPropertyCard(file, onProgress) {
  const { default: Tesseract } = await import('tesseract.js');
  const { data } = await Tesseract.recognize(file, 'spa', {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(0.3 + m.progress * 0.7, 'Leyendo texto…');
      else onProgress?.(0.15, 'Preparando motor OCR…');
    }
  });
  return { text: data.text, fields: parseCard(data.text) };
}

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const LABELS = /\b(PLACA|MARCA|LINEA|MODELO|CILINDRADA|COLOR|SERVICIO|CLASE|VEHICULO|CARROCERIA|COMBUSTIBLE|CAPACIDAD|MOTOR|CHASIS|SERIE|VIN|PROPIETARIO|IDENTIFICACION|POTENCIA|PUERTAS|FECHA|MATRICULA|LICENCIA|TRANSITO|NUMERO|NRO|NO\.?|TIPO|DE|DEL)\b/g;

export function parseCard(raw) {
  const text = norm(raw || '');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const out = {};

  // Valor que aparece en la misma línea tras la etiqueta, o en la línea siguiente.
  const near = (label) => {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(label);
      if (!m) continue;
      const same = lines[i].slice(m.index + m[0].length).replace(LABELS, ' ').replace(/[:.|_-]+/g, ' ').trim();
      if (same.length > 1) return same;
      const next = (lines[i + 1] || '').replace(LABELS, ' ').replace(/[:|_]+/g, ' ').trim();
      if (next) return next;
    }
    return '';
  };

  const plate = text.match(/\b([A-Z]{3})\s?-?\s?(\d{3}|\d{2}[A-Z])\b/);
  if (plate) out.plate = `${plate[1]}${plate[2]}`;

  const vin = text.replace(/\s/g, ' ').match(/\b(?=[A-HJ-NPR-Z0-9]*\d)(?=[A-HJ-NPR-Z0-9]*[A-Z])[A-HJ-NPR-Z0-9]{17}\b/);
  if (vin) out.vin = vin[0];

  const modelLine = near(/MODELO/);
  const year = (modelLine.match(/\b(19[5-9]\d|20[0-4]\d)\b/) || text.match(/\b(19[89]\d|20[0-4]\d)\b/) || [])[1];
  if (year) out.year = year;

  const cc = text.match(/CILINDRA\w*\D{0,12}(\d{2,5})/) || text.match(/\b(\d{2,4})\s?C\.?C\b/);
  if (cc) out.cc = cc[1];

  // Marca y modelo según catálogo
  let found = null;
  for (const [kind, brands] of Object.entries(CATALOG)) {
    for (const b of Object.keys(brands)) {
      const nb = norm(b);
      if (new RegExp(`\\b${nb.replace(/[-]/g, '.?')}\\b`).test(text) && (!found || nb.length > norm(found.brand).length)) found = { brand: b, kind };
    }
  }
  if (found) {
    out.brand = found.brand;
    const models = CATALOG[found.kind][found.brand];
    const m = models.find((x) => text.includes(norm(x)));
    if (m) out.model = m;
    if (found.kind === 'moto') out.type = 'moto';
  } else {
    const b = near(/MARCA/).split(/\s+/)[0];
    if (b && b.length > 2) out.brand = cap(b);
  }
  const line = near(/LINEA/);
  if (line) out.version = cap(line.split(/\s{2,}/)[0]).slice(0, 40);
  if (!out.model && line) out.model = cap(line.split(/\s+/).slice(0, 2).join(' '));

  const color = COLORS.find((c) => new RegExp(`\\b${norm(c)}`).test(near(/COLOR/) || text));
  if (color) out.color = color;

  if (/ELECTRIC/.test(text)) out.powertrain = 'Eléctrico';
  else if (/HIBRID/.test(text)) out.powertrain = 'Híbrido (HEV)';
  else if (/DIESEL|ACPM/.test(text)) out.powertrain = 'Diésel';
  else if (/GAS\s?NAT|GNV/.test(text)) out.powertrain = 'Gas natural (GNV)';
  else if (/GASOLINA/.test(text)) out.powertrain = 'Gasolina';

  if (/MOTOCICLETA|MOTOCARRO|CICLOMOTOR/.test(text)) out.type = 'moto';
  else if (/CAMIONETA|CAMPERO/.test(text)) out.type = 'suv';
  else if (/CAMION\b|TRACTOCAMION|VOLQUETA/.test(text)) out.type = 'camion';
  else if (/MICROBUS|\bBUS\b|BUSETA/.test(text)) out.type = 'van';
  else if (/AUTOMOVIL/.test(text)) out.type = 'auto';

  const svc = text.match(/\b(PARTICULAR|PUBLICO|OFICIAL|DIPLOMATICO)\b/);
  if (svc) out.service = cap(svc[1]);

  const motor = near(/MOTOR/).match(/\b[A-Z0-9]{6,}\b/);
  if (motor) out.engine = motor[0];

  const owner = near(/PROPIETARIO/).replace(/\b(APELLIDO|APELLIDOS|NOMBRE|NOMBRES|S|Y)\b/g, ' ').replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (owner.split(' ').length >= 2) out.ownerName = cap(owner).slice(0, 60);
  const ownerId = text.match(/\b(C\.?\s?C|NIT|C\.?\s?E|PASAPORTE)\.?\s*(?:NO\.?)?\s*[:.]?\s*(\d[\d.\s-]{5,14}\d)/);
  if (ownerId) out.ownerId = `${ownerId[1].replace(/[.\s]/g, '')} ${ownerId[2].replace(/[.\s]/g, '')}`;

  const reg = near(/MATRICULA/).match(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/);
  if (reg) out.registrationDate = `${reg[3]}-${reg[2]}-${reg[1]}`;

  return out;
}

const cap = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
