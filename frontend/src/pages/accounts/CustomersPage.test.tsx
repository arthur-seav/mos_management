import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import CustomersPage from '@/pages/accounts/CustomersPage'
import { ADMIN, apiError, fakeApi, renderPage } from '@/test/render'
import type { User } from '@/lib/types'

const dara: User = { ...ADMIN, id: 9, role: 'customer', firstName: 'Dara', lastName: 'Kim', email: 'dara@mos.test' }
const page = { items: [dara], page: 0, size: 20, total: 21 }
afterEach(() => vi.unstubAllGlobals())

it('shows customer contact and status but offers no create/edit controls', async () => {
  fakeApi({ 'GET /api/admin/customers': page })
  renderPage(<CustomersPage />)
  expect((await screen.findByText('Dara Kim')).closest('tr')).toHaveTextContent('dara@mos.test')
  expect(screen.queryAllByRole('button', { name: /Add|Edit/ })).toHaveLength(0)
})

it('deactivates only after confirmation and displays the refreshed status', async () => {
  let active = true
  const calls = fakeApi({
    'GET /api/admin/customers': () => ({ ...page, items: [{ ...dara, status: active ? 'active' : 'inactive' }] }),
    'PATCH /api/admin/customers/9/status': () => { active = false; return { ...dara, status: 'inactive' } }
  })
  renderPage(<CustomersPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Dara Kim' }))
  expect(calls.filter(c => c.method === 'PATCH')).toHaveLength(0)
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }))
  await waitFor(() => expect(calls.find(c => c.method === 'PATCH')).toMatchObject({ path: '/api/admin/customers/9/status', body: { status: 'inactive' } }))
  expect(await screen.findByRole('button', { name: 'Reactivate Dara Kim' })).toBeInTheDocument()
  expect(screen.getByText('Dara Kim').closest('tr')).toHaveTextContent('Inactive')
})

it('reactivates an inactive customer', async () => {
  const calls = fakeApi({ 'GET /api/admin/customers': { ...page, items: [{ ...dara, status: 'inactive' }] }, 'PATCH /api/admin/customers/9/status': dara })
  renderPage(<CustomersPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Reactivate Dara Kim' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reactivate' }))
  await waitFor(() => expect(calls.find(c => c.method === 'PATCH')?.body).toEqual({ status: 'active' }))
})

it('requests page 1 then resets to page 0 after a debounced search', async () => {
  const calls = fakeApi({ 'GET /api/admin/customers': (url: URL) => ({ ...page, page: Number(url.searchParams.get('page')) }) })
  renderPage(<CustomersPage />)
  await screen.findByText('Dara Kim')
  await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
  await waitFor(() => expect(calls.some(c => c.path === '/api/admin/customers?page=1&size=20')).toBe(true))
  await userEvent.type(screen.getByPlaceholderText('Search name, email or phone'), 'Dara')
  await waitFor(() => expect(calls.some(c => c.path === '/api/admin/customers?q=Dara&page=0&size=20')).toBe(true))
})

it('shows a failed list request', async () => {
  fakeApi({ 'GET /api/admin/customers': () => apiError(503, 'unavailable', 'Customers unavailable.') })
  renderPage(<CustomersPage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Customers unavailable.')
})
