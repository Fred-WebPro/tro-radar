// Generates the extension icons (radar mark on a paper circle) as PNGs
// with zero dependencies. Run: node scripts/make-icons.mjs

import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const PAPER = [246, 245, 241];
const INK = [22, 21, 18];
const RED = [208, 59, 59];

// Coverage of a circle edge for cheap anti-aliasing: 1 inside, 0 outside,
// linear ramp across one pixel.
const cov = (d, r) => Math.max(0, Math.min(1, r - d + 0.5));

function pixel(x, y, size) {
  const c = size / 2;
  const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
  const R = size * 0.48;

  const alpha = cov(d, R);
  if (alpha <= 0) return [0, 0, 0, 0];

  // Layers, outermost first: ink border ring, paper field, faint middle ring,
  // red center blip.
  let rgb = INK;
  const borderInner = R - Math.max(1.5, size * 0.09);
  const inPaper = cov(d, borderInner);
  if (inPaper > 0) {
    rgb = PAPER;
    const ringR = R * 0.58;
    const ringW = Math.max(0.75, size * 0.045);
    const onRing = Math.max(0, Math.min(1, ringW - Math.abs(d - ringR) + 0.5));
    if (onRing > 0) rgb = mix(PAPER, INK, onRing * 0.55);
    const blip = cov(d, R * 0.26);
    if (blip > 0) rgb = mix(rgb, RED, blip);
  } else {
    rgb = INK;
  }
  return [rgb[0], rgb[1], rgb[2], Math.round(alpha * 255)];
}

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

function makePng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size);
      const o = row + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(process.cwd(), "extension", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), makePng(size));
  console.log(`icon${size}.png written`);
}

// Site favicon via the Next.js app-dir file convention.
const appDir = path.join(process.cwd(), "src", "app");
fs.writeFileSync(path.join(appDir, "icon.png"), makePng(64));
fs.writeFileSync(path.join(appDir, "apple-icon.png"), makePng(180));
console.log("src/app/icon.png + apple-icon.png written");
