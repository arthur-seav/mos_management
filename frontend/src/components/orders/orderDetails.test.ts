import { optionSummary, orderTimeline, pickupLabel } from '@/components/orders/orderDetails'
import type { Order } from '@/lib/types'

const order: Order = {
  id: 7,
  pickupCode: 'A12',
  source: 'online',
  status: 'ready',
  pickupType: 'scheduled',
  pickupTime: '2026-10-29T04:00:00Z',
  note: null,
  totalAmount: 9,
  rejectReason: null,
  createdAt: '2026-10-29T03:00:00Z',
  placedAt: '2026-10-29T03:02:00Z',
  confirmedAt: null,
  preparingAt: '2026-10-29T03:05:00Z',
  readyAt: '2026-10-29T03:10:00Z',
  completedAt: null,
  endedAt: null,
  customerId: 3,
  customer: null,
  handledBy: null,
  items: [],
  payments: [],
  drinkCount: 2
}

describe('order detail helpers (FR-32)', () => {
  it('the timeline keeps only the steps that happened, oldest first', () => {
    expect(orderTimeline(order)).toEqual([
      { label: 'Created', at: '2026-10-29T03:00:00Z' },
      { label: 'Placed', at: '2026-10-29T03:02:00Z' },
      { label: 'Preparing', at: '2026-10-29T03:05:00Z' },
      { label: 'Ready', at: '2026-10-29T03:10:00Z' }
    ])
  })

  it('a scheduled pickup shows its store-local time; ASAP shows no time', () => {
    expect(pickupLabel(order)).toBe('Scheduled 11:00 AM')
    expect(pickupLabel({ ...order, pickupType: 'asap' })).toBe('ASAP')
    // A scheduled order with no time left (bad data) must not print "Scheduled undefined".
    expect(pickupLabel({ ...order, pickupTime: null })).toBe('ASAP')
  })

  it('options are joined for one line under the drink', () => {
    expect(optionSummary(['Large', 'Iced'])).toBe('Large · Iced')
    expect(optionSummary([])).toBe('')
  })
})
