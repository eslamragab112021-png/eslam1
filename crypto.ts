// ============================================================
// CRYPTO UTILITIES — Password hashing & JWT management
// AttendX Enterprise SaaS Platform
// ============================================================

// Browser-native crypto for secure password hashing
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(saltHex),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(bits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith('pbkdf2:')) {
      const parts = stored.split(':');
      if (parts.length !== 3) return false;
      const saltHex = parts[1];
      const storedHash = parts[2];
      
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );

      const bits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: encoder.encode(saltHex),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );

      const hashArray = Array.from(new Uint8Array(bits));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex === storedHash;
    }
    // Legacy plain text check for seeded demo accounts
    return password === stored;
  } catch {
    return false;
  }
}

export function generateToken(payload: Record<string, unknown>, expiresInMs = 3600000): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Date.now() + expiresInMs;
  const body = btoa(JSON.stringify({ ...payload, exp, iat: Date.now() }));
  // In production this would use a real HMAC-SHA256 signature
  const signature = btoa(`${header}.${body}.attendx_secret_2024`);
  return `${header}.${body}.${signature}`;
}

export function decodeToken<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload as T;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string): boolean {
  const payload = decodeToken(token);
  return payload !== null;
}

export function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateUUID(): string {
  return crypto.randomUUID();
}
