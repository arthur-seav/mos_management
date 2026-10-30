import type { ReactElement } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/lib/auth'
import { storeSession } from '@/lib/api'
import type { User } from '@/lib/types'

export const ADMIN: User = {
  id: 1,
  firstName: 'Vanna',
  lastName: 'Chea',
  email: 'admin@mos.test',
  phone: null,
  role: 'admin',
  status: 'active',
  dateOfBirth: null,
  createdAt: '2026-10-01T00:00:00Z'
}

export const STAFF: User = { ...ADMIN, id: 2, firstName: 'Sophea', lastName: 'Lim', email: 'staff@mos.test', role: 'staff' }

type Route = { path: string; element: ReactElement }

/**
 * Renders a page signed in as `user`, at `path`, with extra routes so
 * navigation can be asserted (e.g. { path: '/orders', element: <p>records</p> }).
 */
export function renderPage(
  element: ReactElement,
  { path = '/', user = ADMIN, routes = [] as Route[], routePath }: { path?: string; user?: User; routes?: Route[]; routePath?: string } = {}
) {
  storeSession({ token: 'test-token', user })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter([{ path: routePath ?? path, element }, ...routes], { initialEntries: [path] })
  return {
    client,
    router,
    ...render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    )
  }
}

type Handler = (url: URL, init: RequestInit) => unknown | Response

/**
 * Replaces fetch with a tiny fake API: `routes` maps "GET /api/admin/products"
 * (pathname only) to a handler returning a JSON body (or a Response for errors).
 * Unknown calls fail the test. Returns the list of calls for assertions.
 */
export function fakeApi(routes: Record<string, Handler | unknown>) {
  const calls: { method: string; path: string; body: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input, 'http://localhost')
      const method = (init.method ?? 'GET').toUpperCase()
      const key = `${method} ${url.pathname}`
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
      calls.push({ method, path: url.pathname + url.search, body })
      // GET /api/admin/me is asked once by AuthProvider on start.
      if (key === 'GET /api/admin/me' && !(key in routes)) return json(readUser())
      if (!(key in routes)) throw new Error(`Unexpected API call: ${key}`)
      const handler = routes[key]
      const result = typeof handler === 'function' ? (handler as Handler)(url, init) : handler
      if (result instanceof Response) return result
      return result === undefined ? new Response(null, { status: 204 }) : json(result)
    })
  )
  return calls
}

function readUser() {
  return JSON.parse(localStorage.getItem('mos.dashboard.session') ?? '{}').user
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function apiError(status: number, code: string, message: string): Response {
  return json({ code, message }, status)
}
