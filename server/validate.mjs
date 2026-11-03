export function isValidAppId(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  if (parts.length < 2) return false;
  return parts.every(part => /^[A-Za-z][A-Za-z0-9_]*$/.test(part));
}

export function isValidVersion(value) {
  return typeof value === 'string' && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value);
}

export function sanitizeFileName(value) {
  const cleaned = String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'alkalmazas';
}

export function isSafeZipEntry(name) {
  if (typeof name !== 'string' || name.length === 0) return false;
  if (name.includes('\\')) return false;
  if (name.startsWith('/')) return false;
  if (/^[A-Za-z]:/.test(name)) return false;
  const parts = name.split('/');
  return parts.every(part => part !== '..');
}
