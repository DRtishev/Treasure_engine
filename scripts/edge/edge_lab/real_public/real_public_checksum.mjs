import crypto from 'node:crypto';

export function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function parseChecksumText(text, fileName) {
  const lines = String(text || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (!m) continue;
    const sum = m[1].toLowerCase();
    const name = m[2].trim();
    if (!fileName || name.endsWith(fileName)) return { ok: true, sha256: sum, file: name };
  }
  return { ok: false, sha256: '', file: '' };
}
