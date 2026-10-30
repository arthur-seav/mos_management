import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import OrderRecordsPage from '@/pages/orders/OrderRecordsPage'
import { fakeApi, renderPage } from '@/test/render'
import type { Order, Page, Payment } from '@/lib/types'

/**
 * React Router builds a Request per navigation and jsdom's AbortSignal is not the
 * one Node's Request accepts, so every in-app navigation (here: the filters that
 * live in the URL) would be swallowed. This belongs in src/test/setup.ts.
 */
const NativeRequest = globalThis.Request
class RequestWithoutSignal extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init?.signal ? { ...init, signal: undefined } : init)
  }
}
globalThis.Request = RequestWithoutSignal as typeof Request

const paid: Payment = {
  id: 51,
  orderId: 7,
  method: 'khqr',
  amount: 9,
  status: 'paid',
  transactionRef: 'TX-1',
  paidAt: '2026-10-29T03:05:00Z',
  createdAt: '2026-10-29T03:04:00Z',
  failureReason: null,
  recordedBy: null
}

const refundPending: Payment = { ...paid, id: 55, orderId: 8, method: 'cash', amount: 4.5, status: 'refund_pending' }

const online: Order = {
  id: 7,
  pickupCode: 'A12',
  source: 'online',
  status: 'completed',
  pickupType: 'scheduled',
  pickupTime: '2026-10-29T04:00:00Z',
  note: null,
  totalAmount: 9,
  rejectReason: null,
  createdAt: '2026-10-29T03:00:00Z',
  placedAt: '2026-10-29T03:02:00Z',
  confirmedAt: '2026-10-29T03:05:00Z',
  preparingAt: null,
  readyAt: null,
  completedAt: '2026-10-29T03:10:00Z',
  endedAt: null,
  customerId: 3,
  customer: { id: 3, name: 'Dara Kim', email: 'dara@mos.test', phone: '012 345 678' },
  handledBy: { id: 2, name: 'Sophea Lim', email: null, phone: null },
  items: [
    {
      productId: 1,
      productName: 'Iced Latte',
      optionIds: [10],
      optionNames: ['Large'],
      unitPrice: 4.5,
      quantity: 2,
      lineTotal: 9
    }
  ],
  payments: [paid],
  drinkCount: 2
}

/** A walk-in that was cancelled and still owes the customer money back. */
const walkIn: Order = {
  ...online,
  id: 8,
  pickupCode: 'W03',
  source: 'walk_in',
  status: 'cancelled',
  totalAmount: 4.5,
  placedAt: null,
  createdAt: '2026-10-28T02:30:00Z',
  customerId: null,
  customer: null,
  items: [
    {
      productId: 1,
      productName: 'Iced Latte',
      optionIds: [10],
      optionNames: ['Large'],
      unitPrice: 4.5,
      quantity: 1,
      lineTotal: 4.5
    }
  ],
  payments: [refundPending],
  drinkCount: 1
}

const page = (items: Order[], total = items.length, pageIndex = 0): Page<Order> => ({
  items,
  page: pageIndex,
  size: 20,
  total
})

/** The order list calls, newest last. */
function listPaths(calls: { method: string; path: string }[]): string[] {
  return calls.filter(c => c.method === 'GET' && c.path.startsWith('/api/admin/orders?')).map(c => c.path)
}

afterEach(() => vi.unstubAllGlobals())

describe('OrderRecordsPage (FR-32, FR-33)', () => {
  it('shows a row per order with code, time, source, customer, drinks, total and status', async () => {
    fakeApi({ 'GET /api/admin/orders': page([online, walkIn]) })
    renderPage(<OrderRecordsPage />, { path: '/orders' })

    const onlineRow = (await screen.findByText('A12')).closest('tr')!
    expect(onlineRow).toHaveTextContent('Thu, Oct 29, 2026 · 10:02 AM')
    expect(onlineRow).toHaveTextContent('Online')
    expect(onlineRow).toHaveTextContent('Dara Kim')
    expect(onlineRow).toHaveTextContent('2')
    expect(onlineRow).toHaveTextContent('$9.00')
    expect(onlineRow).toHaveTextContent('Completed')

    const walkInRow = screen.getByText('W03').closest('tr')!
    // No placedAt: the row falls back to createdAt, 02:30 UTC = 9:30 AM store time.
    expect(walkInRow).toHaveTextContent('Wed, Oct 28, 2026 · 9:30 AM')
    expect(walkInRow).toHaveTextContent('Walk-in')
    expect(walkInRow).toHaveTextContent('$4.50')
    expect(walkInRow).toHaveTextContent('Cancelled')
    // FR-33: the refund flag sits on the order that owes money back, not on the other one.
    expect(walkInRow).toHaveTextContent('Refund pending')
    expect(onlineRow).not.toHaveTextContent('Refund pending')
  })

  it('asks for page 0 with no filter at all on a plain visit', async () => {
    const calls = fakeApi({ 'GET /api/admin/orders': page([online]) })
    renderPage(<OrderRecordsPage />, { path: '/orders' })
    await screen.findByText('A12')

    expect(listPaths(calls)).toEqual(['/api/admin/orders?page=0&size=20'])
  })

  it('the dates, status and source chosen all end up in the query string', async () => {
    const calls = fakeApi({ 'GET /api/admin/orders': page([online]) })
    renderPage(<OrderRecordsPage />, { path: '/orders' })
    await screen.findByText('A12')

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-29' } })
    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }))
    await userEvent.click(screen.getByRole('option', { name: 'Pending payment' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }))
    await userEvent.click(screen.getByRole('option', { name: 'Walk-in' }))

    await waitFor(() =>
      expect(listPaths(calls).at(-1)).toBe(
        '/api/admin/orders?from=2026-10-01&to=2026-10-29&status=pending_payment&source=walk_in&page=0&size=20'
      )
    )
  })

  it('changing a filter goes back to the first page', async () => {
    const calls = fakeApi({ 'GET /api/admin/orders': page([online], 40, 1) })
    renderPage(<OrderRecordsPage />, { path: '/orders?page=1&status=completed', routePath: '/orders' })
    await screen.findByText('A12')
    expect(listPaths(calls).at(-1)).toBe('/api/admin/orders?status=completed&page=1&size=20')

    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }))
    await userEvent.click(screen.getByRole('option', { name: 'Online' }))

    await waitFor(() =>
      expect(listPaths(calls).at(-1)).toBe('/api/admin/orders?status=completed&source=online&page=0&size=20')
    )
  })

  it('Next asks the server for page 1 (the second page)', async () => {
    const calls = fakeApi({ 'GET /api/admin/orders': page([online], 25) })
    renderPage(<OrderRecordsPage />, { path: '/orders' })
    await screen.findByText('A12')
    expect(screen.getByText('Showing 1 to 20 of 25 entries')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    await waitFor(() => expect(listPaths(calls).at(-1)).toBe('/api/admin/orders?page=1&size=20'))
  })

  it('the search box waits before asking the server, then sends what was typed', async () => {
    const calls = fakeApi({ 'GET /api/admin/orders': page([online]) })
    renderPage(<OrderRecordsPage />, { path: '/orders' })
    await screen.findByText('A12')

    await userEvent.type(screen.getByPlaceholderText('Search code, customer or phone'), 'A12')

    // Still only the first, unfiltered call: each keystroke must not be a request.
    expect(listPaths(calls)).toEqual(['/api/admin/orders?page=0&size=20'])

    await waitFor(() => expect(listPaths(calls).at(-1)).toBe('/api/admin/orders?q=A12&page=0&size=20'))
    expect(listPaths(calls)).toHaveLength(2)
  })

  it('reads the filters back out of the URL after a reload', async () => {
    const calls = fakeApi({ 'GET /api/admin/orders': page([online], 40, 1) })
    renderPage(<OrderRecordsPage />, {
      path: '/orders?from=2026-10-01&to=2026-10-29&status=completed&source=online&q=A12&page=1',
      routePath: '/orders'
    })
    await screen.findByText('A12')

    expect(listPaths(calls)).toEqual([
      '/api/admin/orders?from=2026-10-01&to=2026-10-29&status=completed&source=online&q=A12&page=1&size=20'
    ])
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-01')
    expect(screen.getByLabelText('To')).toHaveValue('2026-10-29')
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Completed')
    expect(screen.getByRole('combobox', { name: 'Source' })).toHaveTextContent('Online')
    expect(screen.getByPlaceholderText('Search code, customer or phone')).toHaveValue('A12')
    expect(screen.getByText('Showing 21 to 40 of 40 entries')).toBeInTheDocument()
  })

  it('a click on a row opens that order in the sheet', async () => {
    fakeApi({
      'GET /api/admin/orders': page([online, walkIn]),
      'GET /api/admin/orders/8': walkIn
    })
    renderPage(<OrderRecordsPage />, { path: '/orders' })

    await userEvent.click(await screen.findByText('W03'))

    const sheet = await screen.findByRole('dialog')
    expect(sheet).toHaveTextContent('Walk-in customer')
    expect(sheet).toHaveTextContent('1 × Iced Latte')
    expect(sheet).toHaveTextContent('Cash $4.50')
  })

  it('marks a refund returned from the sheet, only after confirming, and reloads the list', async () => {
    const calls = fakeApi({
      'GET /api/admin/orders': page([walkIn]),
      'GET /api/admin/orders/8': walkIn,
      'POST /api/admin/payments/55/refunded': { ...walkIn, payments: [{ ...refundPending, status: 'refunded' }] }
    })
    renderPage(<OrderRecordsPage />, { path: '/orders' })

    await userEvent.click(await screen.findByText('W03'))
    await userEvent.click(await screen.findByRole('button', { name: 'Mark refunded' }))
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Mark refunded' }))

    await waitFor(() => expect(calls.filter(c => c.method === 'POST')).toHaveLength(1))
    expect(calls.find(c => c.method === 'POST')!.path).toBe('/api/admin/payments/55/refunded')
    // The list and the sheet are asked again so the badge stops saying "Refund pending".
    await waitFor(() => expect(listPaths(calls)).toHaveLength(2))
    expect(calls.filter(c => c.path === '/api/admin/orders/8')).toHaveLength(2)
  })

  it('says so when nothing matches the filters', async () => {
    fakeApi({ 'GET /api/admin/orders': page([]) })
    renderPage(<OrderRecordsPage />, { path: '/orders' })

    expect(await screen.findByText('No orders match these filters.')).toBeInTheDocument()
  })
})
