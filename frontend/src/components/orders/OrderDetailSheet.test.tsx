import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import OrderDetailSheet from '@/components/orders/OrderDetailSheet'
import { apiError, fakeApi, renderPage } from '@/test/render'
import type { Order, Payment } from '@/lib/types'

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

const refundPending: Payment = {
  ...paid,
  id: 55,
  method: 'card',
  amount: 4.5,
  status: 'refund_pending',
  paidAt: null,
  failureReason: null,
  recordedBy: 'Sophea Lim'
}

const order: Order = {
  id: 7,
  pickupCode: 'A12',
  source: 'online',
  status: 'completed',
  pickupType: 'scheduled',
  pickupTime: '2026-10-29T04:00:00Z',
  note: 'No sugar please',
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
      optionIds: [10, 11],
      optionNames: ['Large', 'Less ice'],
      unitPrice: 4.5,
      quantity: 2,
      lineTotal: 9
    }
  ],
  payments: [paid],
  drinkCount: 2
}

afterEach(() => vi.unstubAllGlobals())

/** The badges next to the pickup code, as opposed to the same words further down the sheet. */
function header(): HTMLElement {
  return screen.getByText('A12').closest('[data-slot="sheet-header"]')!
}

/** One block of the sheet, by its heading, so "Completed" the status and "Completed" the step never mix up. */
function section(title: string): HTMLElement {
  return screen.getByRole('heading', { name: title }).closest('section')!
}

describe('OrderDetailSheet (FR-32, FR-33)', () => {
  it('shows the order, its drinks, its total and its payment', async () => {
    fakeApi({ 'GET /api/admin/orders/7': order })
    renderPage(<OrderDetailSheet orderId={7} onClose={() => {}} />)

    expect(await screen.findByText('A12')).toBeInTheDocument()
    expect(within(header()).getByText('Completed')).toBeInTheDocument()
    expect(within(header()).getByText('Online')).toBeInTheDocument()
    expect(within(header()).getByText('Placed Thu, Oct 29, 2026 · 10:02 AM')).toBeInTheDocument()
    expect(screen.getByText('2 × Iced Latte')).toBeInTheDocument()
    expect(screen.getByText('Large · Less ice')).toBeInTheDocument()
    // 2 × $4.50 = $9.00, shown as the line total and again as the order total.
    expect(screen.getAllByText('$9.00')).toHaveLength(2)
    expect(screen.getByText('Scheduled 11:00 AM')).toBeInTheDocument()
    expect(screen.getByText('Dara Kim')).toBeInTheDocument()
    expect(screen.getByText('dara@mos.test')).toBeInTheDocument()
    expect(screen.getByText('012 345 678')).toBeInTheDocument()
    expect(screen.getByText('Sophea Lim')).toBeInTheDocument()
    expect(screen.getByText('No sugar please')).toBeInTheDocument()
    expect(screen.getByText('KHQR $9.00')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Paid Thu, Oct 29, 2026 · 10:05 AM')).toBeInTheDocument()
  })

  it('lists only the timestamps the order has', async () => {
    fakeApi({ 'GET /api/admin/orders/7': order })
    renderPage(<OrderDetailSheet orderId={7} onClose={() => {}} />)
    await screen.findByText('A12')

    const timeline = within(section('Timeline'))
    expect(timeline.getByText('Created')).toBeInTheDocument()
    expect(timeline.getByText('Confirmed')).toBeInTheDocument()
    expect(timeline.getByText('Completed')).toBeInTheDocument()
    // preparingAt, readyAt and endedAt are null for this order.
    expect(timeline.queryByText('Preparing')).not.toBeInTheDocument()
    expect(timeline.queryByText('Ready')).not.toBeInTheDocument()
    expect(timeline.queryByText('Ended')).not.toBeInTheDocument()
    // completedAt 03:10 UTC is 10:10 AM in the store's zone.
    expect(timeline.getByText('10:10 AM')).toBeInTheDocument()
  })

  it('a walk-in order with no customer says so, and shows the reject reason', async () => {
    fakeApi({
      'GET /api/admin/orders/8': {
        ...order,
        id: 8,
        pickupCode: 'W03',
        source: 'walk_in',
        status: 'rejected',
        customer: null,
        rejectReason: 'Out of oat milk'
      }
    })
    renderPage(<OrderDetailSheet orderId={8} onClose={() => {}} />)

    expect(await screen.findByText('Walk-in customer')).toBeInTheDocument()
    expect(screen.getByText('Out of oat milk')).toBeInTheDocument()
    expect(screen.getByText('W03').closest('[data-slot="sheet-header"]')).toHaveTextContent('Walk-in')
  })

  it('a refund waiting is marked returned only after the question is answered, on the right payment', async () => {
    const calls = fakeApi({
      'GET /api/admin/orders/7': { ...order, payments: [paid, refundPending] },
      'POST /api/admin/payments/55/refunded': { ...order, payments: [paid, { ...refundPending, status: 'refunded' }] }
    })
    renderPage(<OrderDetailSheet orderId={7} onClose={() => {}} />)

    expect(await screen.findByText('Refund pending')).toBeInTheDocument()
    expect(screen.getByText('Card $4.50')).toBeInTheDocument()
    expect(screen.getByText('Recorded by Sophea Lim')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mark refunded' }))
    expect(screen.getByText('Confirm the money has been returned to the customer.')).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Mark refunded' }))

    await waitFor(() => expect(calls.filter(c => c.method === 'POST')).toHaveLength(1))
    expect(calls.find(c => c.method === 'POST')!.path).toBe('/api/admin/payments/55/refunded')
  })

  it('a payment already handled keeps the refund button away', async () => {
    fakeApi({ 'GET /api/admin/orders/7': { ...order, payments: [{ ...refundPending, status: 'refunded' }] } })
    renderPage(<OrderDetailSheet orderId={7} onClose={() => {}} />)

    expect(await screen.findByText('Refunded')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark refunded' })).not.toBeInTheDocument()
  })

  it('shows the failure reason of a failed payment', async () => {
    fakeApi({
      'GET /api/admin/orders/7': {
        ...order,
        status: 'pending_payment',
        payments: [{ ...paid, status: 'failed', paidAt: null, failureReason: 'Card declined' }]
      }
    })
    renderPage(<OrderDetailSheet orderId={7} onClose={() => {}} />)

    expect(await screen.findByText('Card declined')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('a refund the server refuses leaves the payment as it was', async () => {
    const calls = fakeApi({
      'GET /api/admin/orders/7': { ...order, payments: [refundPending] },
      'POST /api/admin/payments/55/refunded': () => apiError(409, 'not_refund_pending', 'This payment is not waiting for a refund.')
    })
    renderPage(<OrderDetailSheet orderId={7} onClose={() => {}} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Mark refunded' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mark refunded' }))

    await waitFor(() => expect(calls.filter(c => c.method === 'POST')).toHaveLength(1))
    expect(await screen.findByText('Refund pending')).toBeInTheDocument()
  })
})
