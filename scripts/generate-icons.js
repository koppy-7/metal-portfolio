const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const chunk = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(chunk), 0);
  return Buffer.concat([len, chunk, crc]);
}

function buildPng(width, height, pixels) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idatData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    idatData[rowStart] = 0;
    pixels.copy(idatData, rowStart + 1, y * width * 4, y * width * 4 + width * 4);
  }
  const compressed = zlib.deflateSync(idatData);
  return Buffer.concat([header, writeChunk('IHDR', ihdr), writeChunk('IDAT', compressed), writeChunk('IEND', Buffer.alloc(0))]);
}

function createIcon(size, filename) {
  const width = size;
  const height = size;
  const bg = [216, 119, 6, 255];
  const fg = [255, 243, 224, 255];
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = bg[0];
    pixels[i * 4 + 1] = bg[1];
    pixels[i * 4 + 2] = bg[2];
    pixels[i * 4 + 3] = bg[3];
  }

  function fillRect(x, y, w, h, color) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || xx >= width || yy < 0 || yy >= height) continue;
        const idx = (yy * width + xx) * 4;
        pixels[idx] = color[0];
        pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2];
        pixels[idx + 3] = color[3];
      }
    }
  }

  const margin = Math.round(size * 0.14);
  const barWidth = Math.round(size * 0.18);
  const mid = Math.round(size / 2);
  fillRect(margin, margin, size - margin * 2, size - margin * 2, [255, 239, 176, 255]);
  const top = margin + Math.round(size * 0.06);
  fillRect(margin + barWidth, top, barWidth, size - margin * 2 - top - Math.round(size * 0.06), fg);
  fillRect(size - margin - barWidth * 2, top, barWidth, size - margin * 2 - top - Math.round(size * 0.06), fg);
  for (let i = 0; i < size * 0.4; i++) {
    const x = margin + barWidth + i;
    const y = top + i;
    fillRect(x, y, 2, 2, fg);
    const x2 = size - margin - barWidth - i - 1;
    fillRect(x2, y, 2, 2, fg);
  }
  const circleRadius = Math.round(size * 0.14);
  const cx = mid;
  const cy = size - margin - circleRadius - Math.round(size * 0.02);
  for (let y = -circleRadius; y <= circleRadius; y++) {
    for (let x = -circleRadius; x <= circleRadius; x++) {
      if (x * x + y * y <= circleRadius * circleRadius) {
        fillRect(cx + x, cy + y, 1, 1, [230, 196, 68, 255]);
      }
    }
  }

  const data = buildPng(width, height, pixels);
  fs.writeFileSync(filename, data);
}

createIcon(192, 'public/icons/icon-192.png');
createIcon(512, 'public/icons/icon-512.png');
console.log('icons generated');
