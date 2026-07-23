const LOCK_KEY = 'cipher:lock'

export async function setLockPassword(pass: string): Promise<void> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const enc = new TextEncoder()
  const passKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(pass),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    passKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const payload = enc.encode('locked')
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload)
  localStorage.setItem(
    LOCK_KEY,
    JSON.stringify({
      salt: toB64(salt),
      iv: toB64(iv),
      ct: toB64(ct),
    }),
  )
}

export async function checkLockPassword(pass: string): Promise<boolean> {
  const stored = localStorage.getItem(LOCK_KEY)
  if (!stored) return true
  try {
    const { salt, iv, ct } = JSON.parse(stored)
    const enc = new TextEncoder()
    const passKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(pass),
      'PBKDF2',
      false,
      ['deriveKey'],
    )
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: fromB64(salt), iterations: 250000, hash: 'SHA-256' },
      passKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(ct))
    return new TextDecoder().decode(plain) === 'locked'
  } catch {
    return false
  }
}

export function hasLock(): boolean {
  return !!localStorage.getItem(LOCK_KEY)
}

export function removeLock(): void {
  localStorage.removeItem(LOCK_KEY)
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
