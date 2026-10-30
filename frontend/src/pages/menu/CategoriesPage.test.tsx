import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import CategoriesPage from '@/pages/menu/CategoriesPage'
import { apiError, fakeApi, renderPage } from '@/test/render'
import type { Category } from '@/lib/types'

const coffee: Category = { id: 1, name: 'Coffee', sortOrder: 1, active: true, productCount: 7 }
const tea: Category = { id: 2, name: 'Tea', sortOrder: 2, active: false, productCount: 4 }

afterEach(() => vi.unstubAllGlobals())

describe('CategoriesPage (FR-25)', () => {
  it('lists categories with their drink count and status', async () => {
    fakeApi({ 'GET /api/admin/categories': [coffee, tea] })
    renderPage(<CategoriesPage />, { path: '/menu/categories' })

    const coffeeRow = (await screen.findByText('Coffee')).closest('tr')!
    expect(coffeeRow).toHaveTextContent('7')
    expect(coffeeRow).toHaveTextContent('Active')
    expect(screen.getByText('Tea').closest('tr')).toHaveTextContent('Hidden')
  })

  it('search narrows the list', async () => {
    fakeApi({ 'GET /api/admin/categories': [coffee, tea] })
    renderPage(<CategoriesPage />)
    await screen.findByText('Coffee')

    await userEvent.type(screen.getByPlaceholderText('Search categories'), 'te')

    expect(screen.queryByText('Coffee')).not.toBeInTheDocument()
    expect(screen.getByText('Tea')).toBeInTheDocument()
  })

  it('adds a category and sends what was typed', async () => {
    const calls = fakeApi({
      'GET /api/admin/categories': [coffee],
      'POST /api/admin/categories': { ...tea, id: 3, name: 'Frappé', active: true }
    })
    renderPage(<CategoriesPage />)
    await screen.findByText('Coffee')

    await userEvent.click(screen.getByRole('button', { name: 'Add category' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Frappé')
    await userEvent.clear(screen.getByLabelText('Position'))
    await userEvent.type(screen.getByLabelText('Position'), '3')
    await userEvent.click(screen.getAllByRole('button', { name: 'Add category' }).at(-1)!)

    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true))
    expect(calls.find(c => c.method === 'POST')!.body).toEqual({ name: 'Frappé', sortOrder: 3, active: true })
  })

  it('shows the server message under the name when it is taken', async () => {
    fakeApi({
      'GET /api/admin/categories': [coffee],
      'PUT /api/admin/categories/1': () => apiError(409, 'name_taken', 'A category with this name already exists.')
    })
    renderPage(<CategoriesPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Coffee' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('A category with this name already exists.')).toBeInTheDocument()
  })

  it('an empty name is caught before calling the server', async () => {
    const calls = fakeApi({ 'GET /api/admin/categories': [] })
    renderPage(<CategoriesPage />)
    await screen.findByText('No categories yet.')

    await userEvent.click(screen.getByRole('button', { name: 'Add category' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Add category' }).at(-1)!)

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0)
  })
})
