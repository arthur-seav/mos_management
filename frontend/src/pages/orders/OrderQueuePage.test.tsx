import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

import { makeItem, makeLine, makeOrder, SERVER_TIME } from '@/components/queue/test-orders'
import OrderQueuePage from '@/pages/orders/OrderQueuePage'
import { fakeApi, renderPage } from '@/test/render'
import type { Queue, StoreInfo } from '@/lib/types'

// The dashboard's <Toaster /> lives in App, so toasts are checked on the sonner API.
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const QUEUE_PATH = '/api/admin/orders/queue'

// A013 is a scheduled order due at 10:35, so the server puts it before A012 even
// though it was placed later (BR-11).
const a013 = makeItem(
  makeOrder({
    id: 13,
    pickupCode: 'A013',
    status: 'placed',
    pickupType: 'scheduled',
    pickupTime: '2026-10-30T03:35:00Z',
    placedAt: '2026-10-30T03:28:00Z'
  })
)
const a012 = makeItem(
  makeOrder({
    id: 12,
    pickupCode: 'A012',
    status: 'placed',
    placedAt: '2026-10-30T03:26:00Z',
    items: [makeLine({ productName: 'Mocha', quantity: 2, optionNames: ['Large', 'Iced'], lineTotal: 8.6 })],
    totalAmount: 8.6
  })
)
const a011 = makeItem(makeOrder({ id: 11, pickupCode: 'A011', status: 'confirmed' }))
const w001 = makeItem(makeOrder({ id: 7, pickupCode: 'W001', source: 'walk_in', status: 'preparing' }))
const a010 = makeItem(makeOrder({ id: 10, pickupCode: 'A010', status: 'ready', readyAt: '2026-10-30T02:55:00Z' }), {
  overdue: true
})

const queue: Queue = {
  orders: [a013, a012, a011, w001, a010],
  serverTime: SERVER_TIME,
  onlineOrderingOpen: true
}

const storeInfo = (open: boolean) =>
  ({
    settings: {
      storeName: 'MOS Coffee',
      address: 'Phnom Penh',
      phone: '012 345 678',
      slotIntervalMin: 15,
      minPrepMin: 10,
      pickupTimeoutMin: 30,
      asapPrepMin: 15,
      onlineOrderingOpen: open
    },
    hours: [],
    timeZone: 'Asia/Phnom_Penh',
    isOpenNow: true
  }) satisfies StoreInfo

const column = (name: string) => screen.getByRole('region', { name })

// base-ui's radio dispatches a PointerEvent on click; jsdom 26 has no such constructor.
// A shared polyfill in src/test/setup.ts would be better (see report).
beforeAll(() => {
  if (!('PointerEvent' in window)) {
    Object.defineProperty(window, 'PointerEvent', { value: class extends MouseEvent {}, configurable: true })
  }
})

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('OrderQueuePage (FR-19..FR-21)', () => {
  it('puts every order in its column, in the order the server sent (BR-11)', async () => {
    fakeApi({ [`GET ${QUEUE_PATH}`]: queue })
    renderPage(<OrderQueuePage />, { path: '/orders/queue' })
    await screen.findByText('A012')

    const newCol = column('New')
    // Order matters here: the server already sorted the queue, so the board must not re-sort.
    expect(within(newCol).getAllByRole('group').map(c => c.getAttribute('aria-label'))).toEqual([
      'Order A013',
      'Order A012'
    ])
    expect(newCol).toHaveTextContent('2')
    expect(within(column('Confirmed')).getByText('A011')).toBeInTheDocument()
    expect(within(column('Preparing')).getByText('W001')).toBeInTheDocument()
    expect(within(column('Ready for pickup')).getByText('A010')).toBeInTheDocument()
    expect(within(newCol).queryByText('A011')).not.toBeInTheDocument()
  })

  it('gives each card one button for its next step and posts it for that order (NFR-04)', async () => {
    const calls = fakeApi({
      [`GET ${QUEUE_PATH}`]: queue,
      'POST /api/admin/orders/12/advance': { ...a012.order, status: 'confirmed' }
    })
    renderPage(<OrderQueuePage />)
    await screen.findByText('A012')

    const card = screen.getByRole('group', { name: 'Order A012' })
    expect(within(screen.getByRole('group', { name: 'Order A011' })).getByRole('button', { name: 'Start preparing' })
    ).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Order W001' })).getByRole('button', { name: 'Mark ready' })
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('group', { name: 'Order A010' })).getByRole('button', { name: 'Picked up' })
    ).toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true))
    const post = calls.find(c => c.method === 'POST')!
    expect(post.path).toBe('/api/admin/orders/12/advance')
    expect(post.body).toEqual({})
    expect(toast.success).toHaveBeenCalledWith('A012 is Confirmed.')
  })

  it('warns about an order stuck in Ready for pickup (BR-12)', async () => {
    fakeApi({ [`GET ${QUEUE_PATH}`]: queue })
    renderPage(<OrderQueuePage />)
    await screen.findByText('A010')

    // 02:55 ready, server clock 03:30.
    expect(within(column('Ready for pickup')).getByText('Waiting over 35 min')).toBeInTheDocument()
  })

  it('offers Reject only on new orders, and sends the reason staff picked (BR-10, FR-38)', async () => {
    const calls = fakeApi({
      [`GET ${QUEUE_PATH}`]: queue,
      'POST /api/admin/orders/12/reject': { ...a012.order, status: 'rejected', rejectReason: 'Sold out' }
    })
    renderPage(<OrderQueuePage />)
    await screen.findByText('A012')

    expect(within(column('Confirmed')).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    expect(within(column('Preparing')).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()

    await userEvent.click(within(screen.getByRole('group', { name: 'Order A012' })).getByRole('button', { name: 'Reject' }))

    expect(screen.getByText('The customer will see this reason. Paid orders are refunded.')).toBeInTheDocument()
    const send = screen.getByRole('button', { name: 'Reject order' })
    expect(send).toBeDisabled()

    await userEvent.click(screen.getByRole('radio', { name: 'Sold out' }))
    expect(send).toBeEnabled()
    await userEvent.click(send)

    await waitFor(() => expect(calls.some(c => c.path.endsWith('/reject'))).toBe(true))
    const post = calls.find(c => c.path.endsWith('/reject'))!
    expect(post.path).toBe('/api/admin/orders/12/reject')
    expect(post.body).toEqual({ reason: 'Sold out' })
  })

  it('"Other" needs the staff to type the reason before it can be sent', async () => {
    const calls = fakeApi({
      [`GET ${QUEUE_PATH}`]: queue,
      'POST /api/admin/orders/12/reject': { ...a012.order, status: 'rejected' }
    })
    renderPage(<OrderQueuePage />)
    await screen.findByText('A012')

    await userEvent.click(within(screen.getByRole('group', { name: 'Order A012' })).getByRole('button', { name: 'Reject' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Other' }))

    const send = screen.getByRole('button', { name: 'Reject order' })
    expect(send).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Other reason'), '   ')
    expect(send).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Other reason'), 'Machine is broken')
    await userEvent.click(send)

    await waitFor(() => expect(calls.some(c => c.path.endsWith('/reject'))).toBe(true))
    expect(calls.find(c => c.path.endsWith('/reject'))!.body).toEqual({ reason: 'Machine is broken' })
  })

  it('pauses online ordering only after the warning is confirmed (FR-41, BR-14)', async () => {
    const calls = fakeApi({
      [`GET ${QUEUE_PATH}`]: queue,
      'PUT /api/admin/store/online-ordering': storeInfo(false)
    })
    renderPage(<OrderQueuePage />)
    await screen.findByText('A012')
    expect(screen.getByText('Online ordering is open')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Pause online orders' }))

    expect(
      screen.getByText("Customers can't place orders in the app until you resume. Orders already placed carry on.")
    ).toBeInTheDocument()
    expect(calls.some(c => c.method === 'PUT')).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Pause ordering' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    const put = calls.find(c => c.method === 'PUT')!
    expect(put.path).toBe('/api/admin/store/online-ordering')
    expect(put.body).toEqual({ open: false })
  })

  it('offers Resume while online ordering is paused', async () => {
    const calls = fakeApi({
      [`GET ${QUEUE_PATH}`]: { ...queue, onlineOrderingOpen: false },
      'PUT /api/admin/store/online-ordering': storeInfo(true)
    })
    renderPage(<OrderQueuePage />)
    await screen.findByText('Online ordering is paused')

    await userEvent.click(screen.getByRole('button', { name: 'Resume online orders' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')!.body).toEqual({ open: true })
  })

  it('alerts staff about an online order that was not in the previous poll (FR-34)', async () => {
    const a015 = makeItem(makeOrder({ id: 15, pickupCode: 'A015', status: 'placed' }))
    let polls = 0
    fakeApi({
      [`GET ${QUEUE_PATH}`]: () => {
        polls += 1
        return polls === 1 ? queue : { ...queue, orders: [a015, ...queue.orders] }
      }
    })
    const { client } = renderPage(<OrderQueuePage />)
    await screen.findByText('A012')

    // First load: A012 and A013 were already on the board, so nothing is announced.
    expect(toast.info).not.toHaveBeenCalled()

    await act(async () => {
      await client.invalidateQueries({ queryKey: ['order-queue'] })
    })
    await screen.findByText('A015')

    expect(toast.info).toHaveBeenCalledTimes(1)
    expect(toast.info).toHaveBeenCalledWith('New order A015')
  })

  it('polls the queue every 3 seconds so a new order shows within 5 (NFR-02)', async () => {
    vi.useFakeTimers()
    try {
      const calls = fakeApi({ [`GET ${QUEUE_PATH}`]: queue })
      renderPage(<OrderQueuePage />)
      const polls = () => calls.filter(c => c.path === QUEUE_PATH).length
      await vi.waitFor(() => expect(polls()).toBe(1))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3100)
      })

      expect(polls()).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows a loading note while the first poll is in flight, then empty columns', async () => {
    fakeApi({ [`GET ${QUEUE_PATH}`]: { orders: [], serverTime: SERVER_TIME, onlineOrderingOpen: true } })
    renderPage(<OrderQueuePage />)

    expect(screen.getByText('Loading orders')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByText('Loading orders')).not.toBeInTheDocument())
    expect(within(column('New')).getByText('No orders here.')).toBeInTheDocument()
    expect(within(column('Ready for pickup')).getByText('No orders here.')).toBeInTheDocument()
    expect(column('New')).toHaveTextContent('0')
  })
})
