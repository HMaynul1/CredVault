'use client';

/* All vault encryption/decryption happens here, in the browser.
   The server never sees the master password or plaintext data. */

export function buf2b64(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
export function b642buf(b64: string) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

export async function deriveKey(password: string, saltB64: string) {
  const enc = new TextEncoder();
  const salt = b642buf(saltB64);
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptJSON(obj: any, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv: buf2b64(iv), data: buf2b64(cipher) };
}

export async function decryptJSON(payload: { iv: string; data: string }, key: CryptoKey) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(b642buf(payload.iv)) },
    key,
    b642buf(payload.data)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

export async function encryptBytes(bytes: ArrayBuffer, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  // prepend iv to ciphertext for storage as one blob
  const out = new Uint8Array(iv.length + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), iv.length);
  return out;
}

export async function decryptBytes(blob: ArrayBuffer, key: CryptoKey) {
  const bytes = new Uint8Array(blob);
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
}

// Derives a separate value from the master password to use for server-side
// login verification, so the raw master password (and encryption key) never
// touch the network.
export async function deriveAuthHash(password: string, saltB64: string) {
  const enc = new TextEncoder();
  const salt = b642buf(saltB64);
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password + ':auth'), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    baseKey,
    256
  );
  return buf2b64(bits);
}

export function randomSaltB64() {
  return buf2b64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export function generatePassword(len = 20) {
  const sets = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    nums: '0123456789',
    sym: '!@#$%^&*()_+-=[]{}'
  };
  const all = sets.lower + sets.upper + sets.nums + sets.sym;
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let pw = [...arr].map(n => all[n % all.length]).join('');
  pw = sets.upper[arr[0] % 26] + sets.lower[arr[1] % 26] + sets.nums[arr[2] % 10] + sets.sym[arr[3] % sets.sym.length] + pw.slice(4);
  return pw;
}

export function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 5);
}
