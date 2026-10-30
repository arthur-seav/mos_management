import {
  itemsFor,
  minutesWaiting,
  newOnlineOrderIds,
  pickupLabel,
  placedLabel,
  placedOnlineIds
} from '@/components/queue/queue-logic'
import { makeItem, makeOrder, SERVER_TIME } from '@/components/queue/test-orders'

const placedOnline = makeItem(makeOrder({ id: 12, status: 'placed', source: 'online' }))
const placedWalkIn = makeItem(makeOrder({ id: 13, status: 'placed', source: 'walk_in' }))
const confirmedOnline = makeItem(makeOrder({ id: 14, status: 'confirmed', source: 'online' }))

describe('queue columns (BR-11)', () => {
  it('keeps the server order inside a column instead of re-sorting', () => {
    // The server sent the later order first (its scheduled slot is sooner).
    const late = makeItem(makeOrder({ id: 20, status: 'placed', placedAt: '2026-10-30T03:28:00Z' }))
    const early = makeItem(makeOrder({ id: 21, status: 'placed', placedAt: '2026-10-30T03:26:00Z' }))

    expect(itemsFor([late, early, confirmedOnline], 'placed').map(i => i.order.id)).toEqual([20, 21])
  })

  it('only takes the orders of that column', () => {
    expect(itemsFor([placedOnline, confirmedOnline], 'confirmed').map(i => i.order.id)).toEqual([14])
    expect(itemsFor([placedOnline, confirmedOnline], 'ready')).toEqual([])
  })
})

describe('new online orders (FR-34)', () => {
  it('alerts for nothing on the very first load', () => {
    expect(newOnlineOrderIds(null, [placedOnline, placedWalkIn])).toEqual([])
  })

  it('alerts for an online order that was not in the previous poll', () => {
    expect(newOnlineOrderIds(new Set([99]), [placedOnline])).toEqual([12])
  })

  it('does not alert twice for an order already seen', () => {
    expect(newOnlineOrderIds(new Set([12]), [placedOnline])).toEqual([])
  })

  it('does not alert for a walk-in order, which staff typed in themselves', () => {
    expect(newOnlineOrderIds(new Set([99]), [placedWalkIn])).toEqual([])
  })

  it('does not alert for an online order that is already past New', () => {
    expect(newOnlineOrderIds(new Set([99]), [confirmedOnline])).toEqual([])
  })

  it('lists the online orders waiting to be confirmed', () => {
    expect(placedOnlineIds([placedOnline, placedWalkIn, confirmedOnline])).toEqual([12])
  })
})

describe('waiting time (BR-12)', () => {
  it('counts whole minutes since the order became ready, on the server clock', () => {
    // 02:55 to 03:30 is 35 minutes.
    expect(minutesWaiting('2026-10-30T02:55:00Z', SERVER_TIME)).toBe(35)
  })

  it('is 0 when the order never became ready', () => {
    expect(minutesWaiting(null, SERVER_TIME)).toBe(0)
  })

  it('never goes negative when the clocks disagree', () => {
    expect(minutesWaiting('2026-10-30T03:40:00Z', SERVER_TIME)).toBe(0)
  })
})

describe('card lines', () => {
  it('shows the booked slot in store time, or ASAP', () => {
    expect(pickupLabel({ pickupType: 'scheduled', pickupTime: '2026-10-30T03:40:00Z' })).toBe('Pickup at 10:40 AM')
    expect(pickupLabel({ pickupType: 'asap', pickupTime: null })).toBe('ASAP')
    expect(pickupLabel({ pickupType: 'scheduled', pickupTime: null })).toBe('ASAP')
  })

  it('counts the wait from the server clock, falling back to when the order was created', () => {
    expect(placedLabel({ placedAt: '2026-10-30T03:26:00Z', createdAt: SERVER_TIME }, SERVER_TIME)).toBe(
      'placed 4 min ago'
    )
    expect(placedLabel({ placedAt: null, createdAt: '2026-10-30T02:30:00Z' }, SERVER_TIME)).toBe('placed 1 h ago')
  })
})
