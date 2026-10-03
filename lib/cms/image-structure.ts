import { CmsError } from './http';
function invalid(): never { throw new CmsError(400, 'Use a complete PNG, JPEG, or WebP image.'); }
function uint32(bytes: Uint8Array, offset: number, little = false) {
  if (offset + 4 > bytes.length) invalid();
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, little);
}
function text(bytes: Uint8Array, start: number, end: number) { return new TextDecoder().decode(bytes.subarray(start, end)); }
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(bytes: Uint8Array) {
  let offset = 8; let hasData = false; let hasHeader = false;
  while (offset + 12 <= bytes.length) {
    const size = uint32(bytes, offset);
    const end = offset + 12 + size;
    if (end > bytes.length) invalid();
    const kind = text(bytes, offset + 4, offset + 8);
    if (!hasHeader && (kind !== 'IHDR' || size !== 13)) invalid();
    if (kind === 'IHDR' && hasHeader) invalid();
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== uint32(bytes, end - 4)) invalid();
    hasHeader = true;
    if (kind === 'IDAT' && size > 0) hasData = true;
    if (kind === 'IEND') { if (size !== 0 || end !== bytes.length || !hasData) invalid(); return; }
    offset = end;
  }
  invalid();
}
function jpeg(bytes: Uint8Array) {
  let offset = 2; let hasFrame = false; let hasScan = false; let scanBytes = 0;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 255) invalid();
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 217) { if (!hasFrame || !hasScan || !scanBytes || offset !== bytes.length) invalid(); return; }
    if (offset + 2 > bytes.length || marker === 216 || marker === 0) invalid();
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) invalid();
    if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) hasFrame = length >= 8;
    offset += length;
    if (marker !== 218) continue;
    hasScan = true;
    while (offset < bytes.length) {
      if (bytes[offset] !== 255) { scanBytes++; offset++; continue; }
      const next = bytes[offset + 1];
      if (next === 0 || (next >= 208 && next <= 215)) { offset += 2; scanBytes++; continue; }
      break;
    }
  }
  invalid();
}
function webpChunks(bytes: Uint8Array, start: number, end: number, allowFrames: boolean): boolean {
  let offset = start; let hasImage = false;
  while (offset + 8 <= end) {
    const kind = text(bytes, offset, offset + 4);
    const size = uint32(bytes, offset + 4, true);
    const dataStart = offset + 8; const dataEnd = dataStart + size;
    if (dataEnd + (size % 2) > end) invalid();
    if (kind === 'VP8 ') {
      if (size <= 10 || bytes[dataStart + 3] !== 157 || bytes[dataStart + 4] !== 1 || bytes[dataStart + 5] !== 42) invalid();
      hasImage = true;
    }
    if (kind === 'VP8L') { if (size <= 5 || bytes[dataStart] !== 47) invalid(); hasImage = true; }
    if (kind === 'ANMF') { if (!allowFrames || size <= 16) invalid(); hasImage = webpChunks(bytes, dataStart + 16, dataEnd, false) || hasImage; }
    offset = dataEnd + (size % 2);
  }
  if (offset !== end) invalid();
  return hasImage;
}
export function validateImageStructure(bytes: Uint8Array, extension: string) {
  if (extension === 'png') return png(bytes);
  if (extension === 'jpg') return jpeg(bytes);
  if (uint32(bytes, 4, true) + 8 !== bytes.length || !webpChunks(bytes, 12, bytes.length, true)) invalid();
}
