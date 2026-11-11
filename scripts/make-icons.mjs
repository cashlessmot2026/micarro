// Genera los íconos PNG de la PWA sin dependencias (rasterizado simple + zlib).
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };

function render(S, { full = false } = {}) {
  const px = Buffer.alloc(S * S * 4);
  const s = S / 512;
  const inRR = (x, y, x0, y0, x1, y1, r) => { const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r); return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= x0 && x <= x1 && y >= y0 && y <= y1; };
  const shapes = (x, y) => {
    // coordenadas en espacio 512
    if (!full && !inRR(x, y, 0, 0, 512, 512, 112)) return null;
    const t = (x + y) / 1024;
    let c = [99 + (168 - 99) * t, 102 + (85 - 102) * t, 241 + (247 - 241) * t];
    // carrocería
    const body = inRR(x, y, 100, 290, 412, 380, 26);
    const roof = y >= 190 && y <= 300 && x >= 150 - (300 - y) * 0.0 + (300 - y) * 0.27 && x <= 362 - (300 - y) * 0.27;
    const wheelL = inRR(x, y, 130, 360, 182, 416, 16), wheelR = inRR(x, y, 330, 360, 382, 416, 16);
    if (body || roof || wheelL || wheelR) c = [255, 255, 255];
    const win = y >= 220 && y <= 292 && x >= 165 + (292 - y) * 0.27 && x <= 347 - (292 - y) * 0.27;
    if (win) c = [124, 108, 245];
    if ((x - 158) ** 2 + (y - 336) ** 2 <= 400 || (x - 354) ** 2 + (y - 336) ** 2 <= 400) c = [124, 108, 245];
    // badge check
    const d = (x - 400) ** 2 + (y - 120) ** 2;
    if (d <= 56 * 56) c = d <= 44 * 44 ? [34, 197, 94] : [255, 255, 255];
    return c;
  };
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    // supersampling 3x3
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
      const c = shapes((i + (sx + 0.5) / 3) / s, (j + (sy + 0.5) / 3) / s);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
    }
    const o = (j * S + i) * 4;
    if (a) { px[o] = r / a; px[o + 1] = g / a; px[o + 2] = b / a; }
    px[o + 3] = Math.round((a / 9) * 255);
  }
  const raw = Buffer.alloc((S * 4 + 1) * S);
  for (let j = 0; j < S; j++) { raw[j * (S * 4 + 1)] = 0; px.copy(raw, j * (S * 4 + 1) + 1, j * S * 4, (j + 1) * S * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('public/pwa-192.png', render(192, { full: true }));
writeFileSync('public/pwa-512.png', render(512, { full: true }));
writeFileSync('public/apple-touch-icon.png', render(180, { full: true }));
console.log('Íconos generados');
