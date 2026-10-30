import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import WalkInPage from '@/pages/orders/WalkInPage'
import {
  ALL_PRODUCTS,
  COFFEE,
  FRAPPE,
  SEASONAL,
  latteCustomization,
  sizeGroup
} from '@/components/walkin/fixtures'
import { apiError, fakeApi, renderPage, STAFF } from '@/test/render'
import type { Order } from '@/lib/types'

/**
 * The order the server gives back. Its total is $9.25 on purpose, a cent off
 * what this screen adds up ($9.20): the success panel must show the server's
 * total, because the server is the one that prices the order (NFR-07).
 */
const placedOrder: Order = {
  id: 55,
  pickupCode: 'A14',
  source: 'walk_in',
  status: 'confirmed',
  pickupType: 'asap',
  pickupTime: null,
  note: null,
  totalAmount: 9.25,
  rejectReason: null,
  createdAt: '2026-10-30T03:00:00Z',
  placedAt: '2026-10-30T03:00:00Z',
  confirmedAt: '2026-10-30T03:00:00Z',
  preparingAt: null,
  readyAt: null,
  completedAt: null,
  endedAt: null,
  customerId: null,
  customer: null,
  handledBy: { id: 2, name: 'Sophea Lim', email: 'staff@mos.test', phone: null },
  items: [],
  payments: [
    {
      id: 9,
      orderId: 55,
      method: 'cash',
      amount: 9.25,
      status: 'paid',
      transactionRef: null,
      paidAt: '2026-10-30T03:00:00Z',
      createdAt: '2026-10-30T03:00:00Z',
      failureReason: null,
      recordedBy: 'Sophea Lim'
    }
  ],
  drinkCount: 2
}

const menu = {
  'GET /api/admin/categories': [COFFEE, FRAPPE, SEASONAL],
  'GET /api/admin/products': ALL_PRODUCTS,
  'GET /api/admin/products/1/customization': latteCustomization
}

const open = () => renderPage(<WalkInPage />, { path: '/orders/new', user: STAFF })

/** Opens the Latte dialog and returns queries scoped to it. */
async function openLatte() {
  await userEvent.click(await screen.findByRole('button', { name: /Latte/ }))
  return within(await screen.findByRole('dialog'))
}

/** The ticket on the right: a drink name shows both on its card and here. */
const ticket = () => within(screen.getByRole('region', { name: 'Order ticket' }))

afterEach(() => vi.unstubAllGlobals())

describe('WalkInPage (FR-23, FR-39, BR-13)', () => {
  it('lists the drinks on the menu with a from price, and hides deactivated ones', async () => {
    fakeApi(menu)
    open()

    expect(await screen.findByRole('button', { name: /Latte/ })).toHaveTextContent('from $3.00')
    expect(screen.getByRole('button', { name: /Matcha Frappe/ })).toHaveTextContent('from $4.00')
    expect(screen.queryByRole('button', { name: /Old Mocha/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pumpkin Latte/ })).not.toBeInTheDocument()
  })

  it('a category chip narrows the grid', async () => {
    fakeApi(menu)
    open()
    await screen.findByRole('button', { name: /Latte/ })

    await userEvent.click(screen.getByRole('button', { name: 'Frappe' }))

    expect(screen.getByRole('button', { name: /Matcha Frappe/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Americano/ })).not.toBeInTheDocument()
  })

  it('a sold-out drink is greyed out and cannot be opened (BR-05)', async () => {
    const calls = fakeApi(menu)
    open()

    const espresso = await screen.findByRole('button', { name: /Espresso/ })
    expect(espresso).toBeDisabled()
    expect(espresso).toHaveTextContent('Sold out')

    await userEvent.click(espresso)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.filter(c => c.path.includes('/customization'))).toHaveLength(0)
  })

  it('shows the ice group only once the drink is iced (BR-01)', async () => {
    fakeApi(menu)
    open()
    const dialog = await openLatte()

    expect(dialog.getByRole('button', { name: 'Hot' })).toHaveAttribute('aria-pressed', 'true')
    expect(dialog.queryByText('Ice level')).not.toBeInTheDocument()

    await userEvent.click(dialog.getByRole('button', { name: 'Iced' }))
    expect(dialog.getByText('Ice level')).toBeInTheDocument()

    await userEvent.click(dialog.getByRole('button', { name: 'Hot' }))
    expect(dialog.queryByText('Ice level')).not.toBeInTheDocument()
  })

  it('stops at three add-ons and says why (TC-13)', async () => {
    fakeApi(menu)
    open()
    const dialog = await openLatte()

    await userEvent.click(dialog.getByRole('button', { name: /^Oat milk/ }))
    await userEvent.click(dialog.getByRole('button', { name: /^Extra shot/ }))
    await userEvent.click(dialog.getByRole('button', { name: /^Vanilla syrup/ }))

    expect(dialog.getByText('Up to 3 — remove one to change')).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: /^Caramel drizzle/ })).toBeDisabled()
    expect(dialog.getByRole('button', { name: /^Oat milk/ })).toBeEnabled()
  })

  it('will not add a drink while a required group has no choice (TC-12)', async () => {
    fakeApi({
      ...menu,
      'GET /api/admin/products/1/customization': {
        ...latteCustomization,
        groups: [{ ...sizeGroup, defaultOptionId: null }, ...latteCustomization.groups.slice(1)]
      }
    })
    open()
    const dialog = await openLatte()

    expect(dialog.getByText('Choose Size first.')).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Add to order' })).toBeDisabled()

    await userEvent.click(dialog.getByRole('button', { name: /^Small/ }))

    expect(dialog.queryByText('Choose Size first.')).not.toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Add to order' })).toBeEnabled()
  })

  it('prices a customized drink, sends it as chosen and shows the pickup code', async () => {
    const calls = fakeApi({ ...menu, 'POST /api/admin/orders/walk-in': placedOrder })
    open()
    const dialog = await openLatte()

    await userEvent.click(dialog.getByRole('button', { name: 'Iced' }))
    await userEvent.click(dialog.getByRole('button', { name: /^Large/ }))
    await userEvent.click(dialog.getByRole('button', { name: /^Oat milk/ }))
    await userEvent.click(dialog.getByRole('button', { name: 'Increase quantity' }))

    // Latte $3.00 + Large $1.00 + Oat milk $0.60 = $4.60, × 2 = $9.20 (TC-14).
    expect(dialog.getByLabelText('Quantity')).toHaveTextContent('2')
    expect(dialog.getByText('$9.20')).toBeInTheDocument()

    await userEvent.click(dialog.getByRole('button', { name: 'Add to order' }))

    const line = (await ticket().findByText('Latte')).closest('li')!
    expect(line).toHaveTextContent('Large · Iced · Regular ice · Regular sugar · Oat milk')
    expect(line).toHaveTextContent('$9.20')
    expect(ticket().getByText('Total').closest('div')!).toHaveTextContent('$9.20')

    await userEvent.type(screen.getByLabelText('Cash received'), '10')
    expect(screen.getByText('Change $0.80')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true))
    expect(calls.find(c => c.method === 'POST')!.body).toEqual({
      lines: [{ productId: 1, optionIds: [103, 202, 302, 402, 501], quantity: 2 }],
      cashReceived: 10
    })

    expect(await screen.findByText('A14')).toBeInTheDocument()
    expect(screen.getByText('$9.25 · Paid in cash')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to order queue' })).toHaveAttribute('href', '/orders/queue')

    await userEvent.click(screen.getByRole('button', { name: 'New order' }))
    expect(screen.getByText('No drinks yet. Pick one from the menu.')).toBeInTheDocument()
    expect(screen.getByLabelText('Cash received')).toHaveValue(null)
  })

  it('changes the quantity of a line and removes it', async () => {
    fakeApi(menu)
    open()
    const dialog = await openLatte()
    await userEvent.click(dialog.getByRole('button', { name: 'Add to order' }))
    const t = ticket()
    await t.findByText('Latte')

    await userEvent.click(t.getByRole('button', { name: 'Increase quantity of Latte' }))

    // Defaults: Latte $3.00 + Medium $0.50 = $3.50, × 2 = $7.00.
    expect(t.getByLabelText('Quantity of Latte')).toHaveTextContent('2')
    expect(t.getByText('Total').closest('div')!).toHaveTextContent('$7.00')

    await userEvent.click(t.getByRole('button', { name: 'Remove Latte' }))

    expect(t.getByText('No drinks yet. Pick one from the menu.')).toBeInTheDocument()
    expect(t.getByRole('button', { name: 'Place order' })).toBeDisabled()
  })

  it('blocks the order while the cash is under the total', async () => {
    fakeApi(menu)
    open()
    const dialog = await openLatte()
    await userEvent.click(dialog.getByRole('button', { name: 'Add to order' }))
    await ticket().findByText('Latte')

    // Defaults: Latte $3.00 + Medium $0.50 = $3.50.
    await userEvent.type(screen.getByLabelText('Cash received'), '2')

    expect(screen.getByText('Not enough — the total is $3.50.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()
  })

  it('shows the server message when a drink sold out, and reloads the menu (BR-05)', async () => {
    const calls = fakeApi({
      ...menu,
      'POST /api/admin/orders/walk-in': () =>
        apiError(409, 'drink_unavailable', 'Latte is sold out. It was removed from your order.')
    })
    open()
    const dialog = await openLatte()
    await userEvent.click(dialog.getByRole('button', { name: 'Add to order' }))
    await ticket().findByText('Latte')

    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))

    expect(await screen.findByText('Latte is sold out. It was removed from your order.')).toBeInTheDocument()
    await waitFor(() => expect(calls.filter(c => c.path === '/api/admin/products')).toHaveLength(2))
  })
})
