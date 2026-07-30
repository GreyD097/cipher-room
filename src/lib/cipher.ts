/**
 * 端到端加密：PBKDF2 + AES-GCM
 * 所有运算在浏览器 WebCrypto 中完成
 */

const PBKDF2_ITER = 250_000
const KEY_LEN = 256
const SALT_LEN = 16
const IV_LEN = 12

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

export function randomSaltB64(): string {
  const salt = new Uint8Array(SALT_LEN)
  crypto.getRandomValues(salt)
  return toB64(salt)
}

export function randomRoomId(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return toB64(bytes).replace(/[+/=]/g, '').slice(0, 8)
}

async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const passKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromB64(saltB64),
      iterations: PBKDF2_ITER,
      hash: 'SHA-256',
    },
    passKey,
    { name: 'AES-GCM', length: KEY_LEN },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface CipherRoom {
  key: CryptoKey
  /** 会话盐，用于密钥派生 */
  saltB64: string
  /** 密钥指纹（SHA-256 前 6 字节的 hex），用于双方核对 */
  fingerprint: string
}

export async function createCipher(passphrase: string, roomId: string): Promise<CipherRoom> {
  // salt 由房间号确定性派生，确保同房间双方得到相同密钥
  const roomIdBytes = new TextEncoder().encode(roomId)
  const digest = await crypto.subtle.digest('SHA-256', roomIdBytes)
  const hashBytes = new Uint8Array(digest)
  const salt = hashBytes.subarray(0, SALT_LEN)
  const saltB64 = toB64(salt)
  const key = await deriveKey(passphrase, saltB64)
  const fingerprint = await fingerprintOf(saltB64)
  return { key, saltB64, fingerprint }
}

async function fingerprintOf(saltB64: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', fromB64(saltB64))
  return toB64(digest).replace(/[^A-Za-z0-9]/g, '').slice(0, 8)
}

export interface EnvMsg {
  k: 'msg'
  id: string
  sid: string
  iv: string
  ct: string
  ttl: number
  ts: number
  ty?: 'text' | 'image'
}

export interface EnvTyping {
  k: 'typing'
  on: boolean
}

export interface EnvRead {
  k: 'read'
  id: string
}

export type Envelope = EnvMsg | EnvTyping | EnvRead

export async function encryptText(
  key: CryptoKey,
  text: string,
  sid: string,
  ttl = 60,
  ty: 'text' | 'image' = 'text',
): Promise<EnvMsg> {
  const iv = new Uint8Array(IV_LEN)
  crypto.getRandomValues(iv)
  const enc = new TextEncoder()
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text))
  return {
    k: 'msg',
    id: makeId(),
    sid,
    iv: toB64(iv),
    ct: toB64(ct),
    ttl,
    ts: Date.now(),
    ty,
  }
}

export async function decryptText(key: CryptoKey, env: EnvMsg): Promise<string> {
  const dec = new TextDecoder()
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(env.iv) },
    key,
    fromB64(env.ct),
  )
  return dec.decode(plain)
}

export function makeId(): string {
  const a = new Uint8Array(8)
  crypto.getRandomValues(a)
  return toB64(a).replace(/[^A-Za-z0-9]/g, '').slice(0, 10)
}

export function envToB64(env: Envelope): string {
  return toB64(new TextEncoder().encode(JSON.stringify(env)))
}

export function envFromB64(b64: string): Envelope {
  const text = new TextDecoder().decode(fromB64(b64))
  return JSON.parse(text) as Envelope
}
