/**
 * VIP 令牌：HMAC-SHA256 签名，无状态、零存储
 * 格式：base64url(payload).base64url(signature)
 */
import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.ADMIN_SECRET || '3068986342'

export interface VipPayload {
  /** vip 等级 */
  level: 'vip'
  /** 过期时间戳（秒） */
  exp: number
  /** 自定义房间号权限 */
  customRoom?: boolean
  /** 更长保存时长（秒） */
  ttl?: number
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, 'base64url')
}

function sign(payload: object): string {
  const p = b64url(Buffer.from(JSON.stringify(payload)))
  const sig = createHmac('sha256', SECRET).update(p).digest('base64url')
  return `${p}.${sig}`
}

export function verifyToken(token: string): VipPayload | null {
  try {
    const [p, sig] = token.split('.')
    if (!p || !sig) return null
    const expected = createHmac('sha256', SECRET).update(p).digest()
    const actual = b64urlDecode(sig)
    if (!timingSafeEqual(expected, actual)) return null
    const payload = JSON.parse(b64urlDecode(p).toString()) as VipPayload
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function issueVipToken(days = 30, customRoom = true, ttl = 300): string {
  const payload: VipPayload = {
    level: 'vip',
    exp: Math.floor(Date.now() / 1000) + days * 86400,
    customRoom,
    ttl,
  }
  return sign(payload)
}

export function isAdminSecret(secret: string): boolean {
  return secret === SECRET
}
