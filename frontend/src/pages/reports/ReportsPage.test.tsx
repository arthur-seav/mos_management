import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ReportsPage from '@/pages/reports/ReportsPage'
import { apiError, fakeApi, renderPage } from '@/test/render'
import type { SalesReport } from '@/lib/types'

const report: SalesReport = {
  from: '2026-02-27', to: '2026-03-05', orders: 4, drinks: 5, revenue: 12.55, averageOrder: 3.14,
  cancelledOrRejected: 2, byDay: [],
  bySource: [{ source: 'online', orders: 3, revenue: 9.55 }, { source: 'walk_in', orders: 1, revenue: 3 }]
}
const best = [
  { productId: 8, productName: 'Mocha', quantity: 3, revenue: 9.55 },
  { productId: 2, productName: 'Espresso', quantity: 2, revenue: 3 }
]
const routes = { 'GET /api/admin/reports/sales': report, 'GET /api/admin/reports/best-sellers': best }

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-03-05T03:00:00Z') }))
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('shows server figures, source split and server-ranked best sellers', async () => {
  fakeApi(routes)
  renderPage(<ReportsPage />)
  const revenue = (await screen.findByText('Revenue')).closest('[data-slot="card"]')!
  expect(revenue).toHaveTextContent('$12.55')
  expect(screen.getByText('Orders').closest('[data-slot="card"]')).toHaveTextContent('4')
  expect(screen.getByText('Drinks sold').closest('[data-slot="card"]')).toHaveTextContent('5')
  expect(screen.getByText('Average order').closest('[data-slot="card"]')).toHaveTextContent('$3.14')
  expect(screen.getByText('Online').closest('[data-slot="card"]')).toHaveTextContent('$9.55')
  const table = await screen.findByRole('table', { name: 'Best sellers' })
  expect(within(table).getAllByRole('row').slice(1).map(row => row.textContent)).toEqual(['1Mocha3$9.55', '2Espresso2$3.00'])
})

it.each([
  ['Today', '2026-03-05', '2026-03-05'],
  ['Last 7 days', '2026-02-27', '2026-03-05'],
  ['Last 30 days', '2026-02-04', '2026-03-05'],
  ['This month', '2026-03-01', '2026-03-05']
])('%s uses the same dates for sales and best sellers', async (label, from, to) => {
  const calls = fakeApi(routes)
  const { router } = renderPage(<ReportsPage />)
  await screen.findByText('$12.55')
  await userEvent.click(screen.getByRole('button', { name: label }))
  await waitFor(() => expect(calls.some(c => c.path === `/api/admin/reports/sales?from=${from}&to=${to}`)).toBe(true))
  expect(calls.some(c => c.path === `/api/admin/reports/best-sellers?from=${from}&to=${to}&limit=10`)).toBe(true)
  expect(router.state.location.search).toBe(`?from=${from}&to=${to}`)
})

it('reads custom dates from URL and changes them through date inputs', async () => {
  const calls = fakeApi(routes)
  renderPage(<ReportsPage />, { path: '/reports?from=2026-01-01&to=2026-01-31', routePath: '/reports' })
  await screen.findByText('$12.55')
  expect(screen.getByLabelText('From')).toHaveValue('2026-01-01')
  fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-02-01' } })
  await waitFor(() => expect(calls.some(c => c.path === '/api/admin/reports/sales?from=2026-01-01&to=2026-02-01')).toBe(true))
})

it('exports the currently selected dates as an Excel download', async () => {
  const create = vi.fn(() => 'blob:mos-report')
  Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
  const downloads: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function(this: HTMLAnchorElement) { downloads.push(this.download) })
  const calls = fakeApi({ ...routes, 'GET /api/admin/reports/export': () => new Response(new Blob(['xlsx']), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }) })
  renderPage(<ReportsPage />, { path: '/reports?from=2026-01-01&to=2026-01-31', routePath: '/reports' })
  await screen.findByText('$12.55')
  await userEvent.click(screen.getByRole('button', { name: 'Export to Excel' }))
  await waitFor(() => expect(downloads).toEqual(['MOS-sales-2026-01-01-to-2026-01-31.xlsx']))
  expect(calls.some(c => c.path === '/api/admin/reports/export?from=2026-01-01&to=2026-01-31')).toBe(true)
  expect(create).toHaveBeenCalledTimes(1)
})

it('shows bad_period instead of a blank report and disables export', async () => {
  fakeApi({ ...routes, 'GET /api/admin/reports/sales': () => apiError(400, 'bad_period', 'The start date is after the end date.') })
  renderPage(<ReportsPage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('The start date is after the end date.')
  expect(screen.getByRole('button', { name: 'Export to Excel' })).toBeDisabled()
})
