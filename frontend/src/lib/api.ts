export type ApiErrorPayload = {
  ok?: boolean
  message?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export const backendOrigin = import.meta.env.DEV ? 'http://127.0.0.1:8000' : ''

export function appHref(href: string) {
  if (!href || href.startsWith('/') || !backendOrigin || !href.startsWith(backendOrigin)) {
    return href
  }

  const url = new URL(href)
  return `${url.pathname}${url.search}${url.hash}`
}

export function backendHref(href: string) {
  if (
    !href
    || href.startsWith('http://')
    || href.startsWith('https://')
    || href.startsWith('mailto:')
    || href.startsWith('tel:')
    || href.startsWith('#')
  ) {
    return href
  }
  return `${backendOrigin}${href}`
}

let csrfToken = ''
let csrfRequest: Promise<string> | null = null

function cookieValue(name: string) {
  const prefix = `${name}=`
  const match = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : ''
}

async function ensureCsrfToken(forceRefresh = false) {
  if (forceRefresh) csrfToken = ''
  const cookieToken = cookieValue('csrftoken')
  if (cookieToken && !forceRefresh) {
    csrfToken = cookieToken
    return csrfToken
  }
  if (!csrfRequest) {
    csrfRequest = fetch('/api/session/', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const payload = await response.json()
        csrfToken = payload.csrfToken ?? cookieValue('csrftoken')
        return csrfToken
      })
      .finally(() => {
        csrfRequest = null
      })
  }
  return csrfRequest
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await ensureCsrfToken()
    if (token) headers.set('X-CSRFToken', token)
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const request = () => fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  })
  let response = await request()

  // A development server restart or switching between localhost and 127.0.0.1
  // can leave the browser with a stale CSRF token. Refresh it once and retry
  // unsafe requests before showing an authentication error.
  const firstContentType = response.headers.get('content-type') ?? ''
  const isCsrfRejection = response.status === 403 && !firstContentType.includes('application/json')
  if (isCsrfRejection && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await ensureCsrfToken(true)
    if (token) headers.set('X-CSRFToken', token)
    response = await request()
  }
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as ApiErrorPayload & T)
    : null

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      payload?.errors,
    )
  }
  return payload as T
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value)
}

export function queryString(params: Record<string, string | number | undefined | null>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      query.set(key, String(value))
    }
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export function displayError(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}
