import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import OrderCard from '@/components/queue/OrderCard'
import { makeItem, makeLine, makeOrder, SERVER_TIME } from '@/components/queue/test-orders'
import type { QueueItem } from '@/lib/types'

const online = makeItem(
  makeOrder({
    id: 12,
    pickupCode: 'A012',
    placedAt: '2026-10-30T03:26:00Z',
    customer: { id: 5, name: 'Dara Sok', email: null, phone: null },
    items: [makeLine({ productName: 'Mocha', quantity: 2, optionNames: ['Large', 'Iced'], lineTotal: 8.6 })],
    totalAmount: 8.6
  })
)

function card(item: QueueItem, props: { busy?: boolean; onAdvance?: () => void; onReject?: () => void } = {}) {
  return render(
    <OrderCard
      item={item}
      serverTime={SERVER_TIME}
      busy={props.busy}
      onAdvance={props.onAdvance ?? (() => {})}
      onReject={props.onReject ?? (() => {})}
    />
  )
}

describe('OrderCard (FR-21, FR-24)', () => {
  it('shows the pickup code, where it came from, the wait, the drinks and the total', () => {
    card(online)

    const group = screen.getByRole('group', { name: 'Order A012' })
    expect(group).toHaveTextContent('A012')
    expect(group).toHaveTextContent('Online')
    expect(group).toHaveTextContent('ASAP')
    expect(group).toHaveTextContent('placed 4 min ago')
    expect(group).toHaveTextContent('Dara Sok')
    expect(group).toHaveTextContent('2 × Mocha')
    expect(group).toHaveTextContent('Large · Iced')
    expect(group).toHaveTextContent('$8.60')
  })

  it('shows the booked slot for a scheduled order', () => {
    card(
      makeItem(
        makeOrder({
          id: 13,
          pickupCode: 'A013',
          status: 'confirmed',
          pickupType: 'scheduled',
          pickupTime: '2026-10-30T03:40:00Z'
        })
      )
    )

    expect(screen.getByText('Pickup at 10:40 AM')).toBeInTheDocument()
    expect(screen.queryByText('ASAP')).not.toBeInTheDocument()
  })

  it('shows a walk-in order with its note and no reject button (BR-10)', () => {
    card(
      makeItem(makeOrder({ id: 7, pickupCode: 'W001', source: 'walk_in', status: 'preparing', note: 'No sugar' }))
    )

    expect(screen.getByText('Walk-in')).toBeInTheDocument()
    expect(screen.getByText('Note: No sugar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark ready' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
  })

  it('warns about an order left in Ready, with a red border (BR-12)', () => {
    card(
      makeItem(
        makeOrder({ id: 10, pickupCode: 'A010', status: 'ready', readyAt: '2026-10-30T02:55:00Z' }),
        { overdue: true }
      )
    )

    expect(screen.getByText('Waiting over 35 min')).toBeInTheDocument()
    // The red border is the thing staff see from across the counter.
    expect(screen.getByRole('group', { name: 'Order A010' }).className).toContain('border-destructive')
  })

  it('has no warning and no border while the order is on time', () => {
    card(makeItem(makeOrder({ id: 11, pickupCode: 'A011', status: 'ready', readyAt: '2026-10-30T03:25:00Z' })))

    expect(screen.queryByText(/Waiting over/)).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Order A011' }).className).not.toContain('border-destructive')
  })

  it('one tap asks for the next step, and reject asks for the dialog (NFR-04)', async () => {
    const onAdvance = vi.fn()
    const onReject = vi.fn()
    card(online, { onAdvance, onReject })

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(onAdvance).toHaveBeenCalledTimes(1)
    expect(onReject).toHaveBeenCalledTimes(1)
  })

  it('locks the next-step button while the call is in flight', () => {
    card(online, { busy: true })

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
  })
})
