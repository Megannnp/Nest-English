/**
 * Magic-byte validator for uploaded files.
 * Validates actual file content rather than trusting the client-supplied
 * Content-Type header, which can be trivially forged.
 */

const SIGNATURES = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],                      // %PDF
  'image/jpeg':      [[0xFF, 0xD8, 0xFF]],
  'image/png':       [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0]],                    // OLE2
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]],             // ZIP/PK
};

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function matchesSig(buf, sig) {
  if (buf.length < sig.length) return false;
  return sig.every((byte, i) => buf[i] === byte);
}

function isWebp(buf) {
  // RIFF????WEBP (12 bytes minimum)
  if (buf.length < 12) return false;
  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  return riff.every((b, i) => buf[i] === b) && webp.every((b, i) => buf[i + 8] === b);
}

function hasZipEntry(buf, entryName) {
  const needle = Buffer.from(entryName);
  for (let i = 0; i <= buf.length - 46; i += 1) {
    if (buf[i] !== 0x50 || buf[i + 1] !== 0x4B || buf[i + 2] !== 0x01 || buf[i + 3] !== 0x02) {
      continue;
    }
    const nameLength = buf.readUInt16LE(i + 28);
    const extraLength = buf.readUInt16LE(i + 30);
    const commentLength = buf.readUInt16LE(i + 32);
    const nameStart = i + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > buf.length) return false;
    if (buf.subarray(nameStart, nameEnd).equals(needle)) return true;
    i = nameEnd + extraLength + commentLength - 1;
  }
  return false;
}

function isDocx(buf) {
  return SIGNATURES[DOCX_MIME].some((sig) => matchesSig(buf, sig))
    && hasZipEntry(buf, '[Content_Types].xml')
    && hasZipEntry(buf, 'word/document.xml');
}

export function validateFileMagicBytes(buffer, mimetype) {
  if (mimetype === 'image/webp') return isWebp(buffer);
  if (mimetype === DOCX_MIME) return isDocx(buffer);
  const sigs = SIGNATURES[mimetype];
  if (!sigs) return true;
  return sigs.some((sig) => matchesSig(buffer, sig));
}

export function sanitizeFilename(name) {
  return String(name || '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .slice(0, 128)
    .trim() || 'file';
}
