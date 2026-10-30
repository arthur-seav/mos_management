import {
  filtersToParams,
  NO_FILTERS,
  ORDER_STATUSES,
  ordersQuery,
  readFilters,
  refundPendingPayment
} from '@/components/orders/orderFilters'
import type { Payment } from '@/lib/types'

const payment = (id: number, status: Payment['status']): Payment => ({
  id,
  orderId: 7,
  method: 'khqr',
  amount: 9,
  status,
  transactionRef: null,
  paidAt: null,
  createdAt: '2026-10-29T03:00:00Z',
  failureReason: null,
  recordedBy: null
})

describe('order filters (FR-32)', () => {
  it('reads every filter back out of the URL', () => {
    const filters = readFilters(new URLSearchParams('from=2026-10-01&to=2026-10-29&status=completed&source=walk_in&q=A12&page=2'))

    expect(filters).toEqual({
      from: '2026-10-01',
      to: '2026-10-29',
      status: 'completed',
      source: 'walk_in',
      q: 'A12',
      page: 2
    })
  })

  it('an empty URL means no filter at all', () => {
    expect(readFilters(new URLSearchParams(''))).toEqual(NO_FILTERS)
  })

  it('a hand-typed value that is not a status, source, day or page is ignored', () => {
    const filters = readFilters(new URLSearchParams('from=yesterday&status=sleeping&source=telepathy&page=-3'))

    expect(filters.from).toBe('')
    expect(filters.status).toBe('all')
    expect(filters.source).toBe('all')
    expect(filters.page).toBe(0)
  })

  it('only the filters that are set go in the address bar', () => {
    expect(filtersToParams({ from: '', to: '', status: 'placed', source: 'all', q: '  A12 ', page: 0 })).toEqual({
      status: 'placed',
      q: 'A12'
    })
  })

  it('page 0 is left out of the address bar but page 3 is kept', () => {
    expect(filtersToParams({ ...NO_FILTERS, page: 0 }).page).toBeUndefined()
    expect(filtersToParams({ ...NO_FILTERS, page: 3 }).page).toBe('3')
  })

  it('"all" is never sent to the server, and the page size is always asked for', () => {
    expect(ordersQuery({ from: '2026-10-01', to: '', status: 'all', source: 'online', q: ' A12 ', page: 1 })).toEqual({
      from: '2026-10-01',
      to: '',
      status: '',
      source: 'online',
      q: 'A12',
      page: 1,
      size: 20
    })
  })

  it('the status list offers all nine statuses, pending payment included', () => {
    expect(ORDER_STATUSES).toHaveLength(9)
    expect(ORDER_STATUSES).toContain('pending_payment')
  })

  it('finds the payment waiting to be refunded, and nothing when there is none (FR-33)', () => {
    expect(refundPendingPayment([payment(1, 'paid'), payment(2, 'refund_pending')])?.id).toBe(2)
    expect(refundPendingPayment([payment(1, 'paid'), payment(3, 'refunded')])).toBeUndefined()
  })
})
