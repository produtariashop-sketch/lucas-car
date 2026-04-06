const TOKEN_KEY = 'lucas_car_auth'

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function setAuthToken(): void {
  localStorage.setItem(TOKEN_KEY, '1')
  document.cookie = `${TOKEN_KEY}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Strict`
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(TOKEN_KEY) === '1'
}
