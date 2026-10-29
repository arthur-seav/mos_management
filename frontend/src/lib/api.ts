/**
 * Calls the Spring Boot API. Every error comes back as {code, message}
 * (ApiExceptionHandler), turned into an ApiError here.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message)
  }
}

const SESSION_KEY = 'mos.dashboard.session'

let onUnauthorized: () => void = () => {}

/** Called by the auth provider: a 401 means the session is over. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export function storedToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw).token as string) : null
  } catch {
    return null
  }
}

export function storeSession(session: unknown | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

export function readSession<T>(): T | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

type Query = Record<string, string | number | boolean | null | undefined>

export function withQuery(path: string, query?: Query): string {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = storedToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  const res = await fetch(withQuery(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body)
  })

  if (res.status === 401 && token) onUnauthorized()
  if (!res.ok) {
    let code = 'error'
    let message = 'Something went wrong. Try again.'
    let fields: Record<string, string> | undefined
    try {
      const data = await res.json()
      code = data.code ?? code
      message = data.message ?? message
      fields = data.fields ?? undefined
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, code, message, fields)
  }
  if (res.status === 204) return undefined as T
  const type = res.headers.get('Content-Type') ?? ''
  return (type.includes('json') ? res.json() : res.blob()) as Promise<T>
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path)
}

/** For mutation onError: the server's message, or a generic one. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Try again.'
}
