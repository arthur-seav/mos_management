import { act, screen } from '@testing-library/react'

import OverviewPage, { inProgressCount } from '@/pages/overview/OverviewPage'
import { fakeApi, renderPage, STAFF } from '@/test/render'
import type { Overview } from '@/lib/types'

const busy: Overview = {
  ordersToday: 18,
  revenueToday: 128.4,
  placed: 3,
  confirmed: 2,
  preparing: 4,
  ready: 1,
  refundsPending: 2,
  soldOut: 5,
  onlineOrderingOpen: true
}

const quiet: Overview = {
  ordersToday: 0,
  revenueToday: 0,
  placed: 0,
  confirmed: 0,
  preparing: 0,
  ready: 0,
  refundsPending: 0,
  soldOut: 0,
  onlineOrderingOpen: false
}

/** The tile that holds a number and its label. */
function card(label: string): HTMLElement {
  return screen.getByText(label).closest('[data-slot="card"]')!
}

/** AdminCN's caramel tile is the SA "needs attention" tone. */
function needsAttention(label: string): boolean {
  return card(label).querySelector('.bg-caramel\\/15') !== null
}

// The page prints "today", so the clock is fixed to a Thursday morning in the store's zone.
beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-29T03:00:00Z') }))

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('OverviewPage (FR-42, SA 7.4)', () => {
  it('shows the store-local day and today’s numbers to an admin', async () => {
    fakeApi({ 'GET /api/admin/overview': busy })
    renderPage(<OverviewPage />, { path: '/' })

    expect(await screen.findByText('Orders today')).toBeInTheDocument()
    expect(screen.getByText('Thu, Oct 29, 2026')).toBeInTheDocument()
    expect(card('Orders today')).toHaveTextContent('18')
    expect(card('Revenue today')).toHaveTextContent('$128.40')
    expect(card('Waiting')).toHaveTextContent('3')
    expect(card('Refunds pending')).toHaveTextContent('2')
  })

  it('hides revenue from staff', async () => {
    fakeApi({ 'GET /api/admin/overview': { ...busy, revenueToday: null } })
    renderPage(<OverviewPage />, { path: '/', user: STAFF })

    expect(await screen.findByText('Orders today')).toBeInTheDocument()
    expect(screen.queryByText('Revenue today')).not.toBeInTheDocument()
    expect(screen.queryByText('$128.40')).not.toBeInTheDocument()
  })

  it('adds up the orders being worked on and breaks them down', async () => {
    fakeApi({ 'GET /api/admin/overview': busy })
    renderPage(<OverviewPage />, { path: '/' })
    await screen.findByText('Orders today')

    // 2 confirmed + 4 preparing + 1 ready = 7
    expect(card('In progress')).toHaveTextContent('7')
    expect(card('In progress')).toHaveTextContent('2 confirmed · 4 preparing · 1 ready')
  })

  it('marks waiting orders and pending refunds as needing attention', async () => {
    fakeApi({ 'GET /api/admin/overview': busy })
    renderPage(<OverviewPage />, { path: '/' })
    await screen.findByText('Orders today')

    expect(needsAttention('Waiting')).toBe(true)
    expect(needsAttention('Refunds pending')).toBe(true)
  })

  it('a quiet day is left plain', async () => {
    fakeApi({ 'GET /api/admin/overview': quiet })
    renderPage(<OverviewPage />, { path: '/' })
    await screen.findByText('Orders today')

    expect(card('Waiting')).toHaveTextContent('0')
    expect(needsAttention('Waiting')).toBe(false)
    expect(needsAttention('Refunds pending')).toBe(false)
    expect(needsAttention('Sold-out drinks')).toBe(false)
  })

  it('sold-out drinks open the drinks list', async () => {
    fakeApi({ 'GET /api/admin/overview': busy })
    renderPage(<OverviewPage />, { path: '/' })

    const link = await screen.findByRole('link', { name: /Sold-out drinks/ })
    expect(link).toHaveAttribute('href', '/menu/products')
    expect(link).toHaveTextContent('5')
    expect(needsAttention('Sold-out drinks')).toBe(true)
  })

  it('says the app is taking orders when online ordering is open', async () => {
    fakeApi({ 'GET /api/admin/overview': busy })
    renderPage(<OverviewPage />, { path: '/' })

    expect(await screen.findByText('Open')).toBeInTheDocument()
    expect(needsAttention('Online ordering')).toBe(false)
  })

  it('calls out paused online ordering', async () => {
    fakeApi({ 'GET /api/admin/overview': quiet })
    renderPage(<OverviewPage />, { path: '/' })

    expect(await screen.findByText('Paused')).toBeInTheDocument()
    expect(needsAttention('Online ordering')).toBe(true)
  })

  it('links to the queue and to a new walk-in order', async () => {
    fakeApi({ 'GET /api/admin/overview': busy })
    renderPage(<OverviewPage />, { path: '/' })
    await screen.findByText('Orders today')

    expect(screen.getByRole('link', { name: 'Open order queue' })).toHaveAttribute('href', '/orders/queue')
    expect(screen.getByRole('link', { name: 'New walk-in order' })).toHaveAttribute('href', '/orders/new')
  })

  it('asks the server again every 10 seconds', async () => {
    // Swap the Date-only clock of beforeEach for one that drives timers too.
    vi.useRealTimers()
    vi.useFakeTimers({ now: new Date('2026-10-29T03:00:00Z') })
    const calls = fakeApi({ 'GET /api/admin/overview': busy })
    renderPage(<OverviewPage />, { path: '/' })

    await act(async () => void (await vi.advanceTimersByTimeAsync(10)))
    expect(calls.filter(c => c.path === '/api/admin/overview')).toHaveLength(1)

    await act(async () => void (await vi.advanceTimersByTimeAsync(10_000)))
    expect(calls.filter(c => c.path === '/api/admin/overview')).toHaveLength(2)
  })

  it('in progress is confirmed + preparing + ready', () => {
    expect(inProgressCount(busy)).toBe(7)
    expect(inProgressCount(quiet)).toBe(0)
  })
})
