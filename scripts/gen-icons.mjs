/*
 * Generates the PWA icons (192, 512, maskable 512) as real PNG files with zero
 * external dependencies — a tiny hand-rolled PNG encoder (zlib is built in).
 * Re-run with: node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// --- Minimal PNG encoder (RGBA, no filtering) -------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- Artwork: purple disc + neon ring + play glyph on the app background -----
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

const BG_C = hex('#12162e');
const BG_E = hex('#0b0d16');
const P_C = hex('#a24bff');
const P_E = hex('#5f1ba6');
const NEON = hex('#00f5d4');
const GLYPH = hex('#eafffb');

function sign(px, py, x1, y1, x2, y2) {
  return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  // Play triangle (points right), centered.
  const ax = size * 0.44;
  const ay = size * 0.35;
  const bx = size * 0.44;
  const by = size * 0.65;
  const tx = size * 0.67;
  const ty = size * 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / (size * 0.5); // 0 (center) .. ~1.41 (corner)

      const d1 = sign(x, y, ax, ay, bx, by);
      const d2 = sign(x, y, bx, by, tx, ty);
      const d3 = sign(x, y, tx, ty, ax, ay);
      const inGlyph = !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));

      let col;
      if (inGlyph) col = GLYPH;
      else if (d < 0.6) col = mix(P_C, P_E, Math.min(d / 0.6, 1));
      else if (d < 0.68) col = NEON;
      else col = mix(BG_C, BG_E, Math.min((d - 0.68) / 0.7, 1));

      const i = (y * size + x) * 4;
      buf[i] = Math.round(col[0]);
      buf[i + 1] = Math.round(col[1]);
      buf[i + 2] = Math.round(col[2]);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

for (const [name, size] of [
  ['icon-192', 192],
  ['icon-512', 512],
  ['icon-maskable-512', 512],
]) {
  writeFileSync(resolve(OUT, `${name}.png`), encodePNG(size, render(size)));
  console.log(`✓ ${name}.png`);
}
console.log('Icons generated in public/icons/');
