import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

import ProductsPage from '@/pages/menu/ProductsPage'
import { apiError, fakeApi, renderPage, STAFF } from '@/test/render'
import type { Category, Product } from '@/lib/types'


const coffee: Category = { id: 1, name: 'Coffee', sortOrder: 1, active: true, productCount: 2 }
const tea: Category = { id: 2, name: 'Tea', sortOrder: 2, active: true, productCount: 1 }

const base: Product = {
  id: 0,
  categoryId: 1,
  categoryName: 'Coffee',
  name: '',
  description: null,
  imageUrl: '',
  basePrice: 3,
  isAvailable: true,
  isActive: true,
  createdAt: '2026-10-01T00:00:00Z'
}

const mocha: Product = {
  ...base,
  id: 4,
  name: 'Mocha',
  description: 'Dark and rich',
  imageUrl: '/uploads/product-4-ab12cd34.png',
  basePrice: 4.6
}
const latte: Product = { ...base, id: 5, name: 'Latte', basePrice: 3, isAvailable: false }
const matcha: Product = {
  ...base,
  id: 6,
  categoryId: 2,
  categoryName: 'Tea',
  name: 'Matcha Latte',
  basePrice: 4,
  isActive: false
}

const list = { 'GET /api/admin/products': [mocha, latte, matcha], 'GET /api/admin/categories': [coffee, tea] }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Picks a value in one of the filter selects. */
async function choose(filter: 'Category' | 'Status', option: string) {
  await userEvent.click(screen.getByLabelText(filter))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

describe('ProductsPage (FR-07, FR-22, FR-25)', () => {
  it('shows each drink with its picture, category, price and status', async () => {
    fakeApi(list)
    renderPage(<ProductsPage />, { path: '/menu/products' })

    const row = (await screen.findByText('Mocha')).closest('tr')!
    expect(row).toHaveTextContent('Dark and rich')
    expect(row).toHaveTextContent('Coffee')
    expect(row).toHaveTextContent('$4.60')
    expect(row).toHaveTextContent('Active')
    expect(screen.getByRole('img', { name: 'Mocha' })).toHaveAttribute('src', '/uploads/product-4-ab12cd34.png')
    // Latte has no picture: the placeholder stands in.
    expect(screen.getByText('Matcha Latte').closest('tr')).toHaveTextContent('Removed')
    expect(screen.getAllByRole('img', { name: 'No picture' })).toHaveLength(2)
  })

  it('the category filter keeps only that category', async () => {
    fakeApi(list)
    renderPage(<ProductsPage />, { path: '/menu/products' })
    await screen.findByText('Mocha')

    await choose('Category', 'Tea')

    expect(screen.queryByText('Mocha')).not.toBeInTheDocument()
    expect(screen.queryByText('Latte')).not.toBeInTheDocument()
    expect(screen.getByText('Matcha Latte')).toBeInTheDocument()
  })

  it('the status filter separates sold out from removed drinks', async () => {
    fakeApi(list)
    renderPage(<ProductsPage />, { path: '/menu/products' })
    await screen.findByText('Mocha')

    await choose('Status', 'Sold out')
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.queryByText('Mocha')).not.toBeInTheDocument()
    expect(screen.queryByText('Matcha Latte')).not.toBeInTheDocument()

    await choose('Status', 'Removed from menu')
    expect(screen.getByText('Matcha Latte')).toBeInTheDocument()
    expect(screen.queryByText('Latte')).not.toBeInTheDocument()
  })

  it('search narrows the list by name', async () => {
    fakeApi(list)
    renderPage(<ProductsPage />, { path: '/menu/products' })
    await screen.findByText('Mocha')

    await userEvent.type(screen.getByPlaceholderText('Search drinks'), 'moc')

    expect(screen.getByText('Mocha')).toBeInTheDocument()
    expect(screen.queryByText('Latte')).not.toBeInTheDocument()
    expect(screen.queryByText('Matcha Latte')).not.toBeInTheDocument()
  })

  it('marks a drink sold out and shows what the server sent back (FR-22)', async () => {
    const soldOut = vi.spyOn(toast, 'success')
    const calls = fakeApi({
      ...list,
      'PATCH /api/admin/products/4/availability': { ...mocha, isAvailable: false }
    })
    renderPage(<ProductsPage />, { path: '/menu/products' })

    await userEvent.click(await screen.findByRole('switch', { name: 'On sale: Mocha' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PATCH')).toBe(true))
    expect(calls.find(c => c.method === 'PATCH')).toMatchObject({
      path: '/api/admin/products/4/availability',
      body: { isAvailable: false }
    })
    await waitFor(() => expect(screen.getByRole('switch', { name: 'On sale: Mocha' })).not.toBeChecked())
    expect(soldOut).toHaveBeenCalledWith('Mocha is sold out.')
  })

  it('puts a sold-out drink back on sale (FR-22)', async () => {
    const backOn = vi.spyOn(toast, 'success')
    const calls = fakeApi({ ...list, 'PATCH /api/admin/products/5/availability': { ...latte, isAvailable: true } })
    renderPage(<ProductsPage />, { path: '/menu/products' })

    await userEvent.click(await screen.findByRole('switch', { name: 'On sale: Latte' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PATCH')).toBe(true))
    expect(calls.find(c => c.method === 'PATCH')!.body).toEqual({ isAvailable: true })
    await waitFor(() => expect(screen.getByRole('switch', { name: 'On sale: Latte' })).toBeChecked())
    expect(backOn).toHaveBeenCalledWith('Latte is back on sale.')
  })

  it('a removed drink cannot be put on sale', async () => {
    fakeApi(list)
    renderPage(<ProductsPage />, { path: '/menu/products' })

    // base-ui renders the switch as a span: "off" shows up as aria-disabled.
    expect(await screen.findByRole('switch', { name: 'On sale: Matcha Latte' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('keeps the switch as it was when the server refuses', async () => {
    const failed = vi.spyOn(toast, 'error')
    fakeApi({
      ...list,
      'PATCH /api/admin/products/4/availability': () => apiError(409, 'conflict', 'Mocha was changed elsewhere.')
    })
    renderPage(<ProductsPage />, { path: '/menu/products' })

    await userEvent.click(await screen.findByRole('switch', { name: 'On sale: Mocha' }))

    await waitFor(() => expect(failed).toHaveBeenCalledWith('Mocha was changed elsewhere.'))
    expect(screen.getByRole('switch', { name: 'On sale: Mocha' })).toBeChecked()
  })

  it('staff see the list and the switch, but no way to add or edit drinks', async () => {
    fakeApi(list)
    renderPage(<ProductsPage />, { path: '/menu/products', user: STAFF })

    expect(await screen.findByRole('switch', { name: 'On sale: Mocha' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add drink' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit Mocha' })).not.toBeInTheDocument()
  })

  it('an admin opens the editor of the drink they clicked', async () => {
    fakeApi(list)
    renderPage(<ProductsPage />, {
      path: '/menu/products',
      routes: [{ path: '/menu/products/:id', element: <p>Editing drink 4</p> }]
    })

    await userEvent.click(await screen.findByRole('link', { name: 'Edit Mocha' }))

    expect(await screen.findByText('Editing drink 4')).toBeInTheDocument()
  })

  it('an admin can start a new drink', async () => {
    fakeApi(list)
    renderPage(<ProductsPage />, {
      path: '/menu/products',
      routes: [{ path: '/menu/products/new', element: <p>New drink form</p> }]
    })

    await userEvent.click(await screen.findByRole('link', { name: 'Add drink' }))

    expect(await screen.findByText('New drink form')).toBeInTheDocument()
  })
})
