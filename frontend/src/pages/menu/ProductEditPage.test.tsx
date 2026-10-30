import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ProductEditPage from '@/pages/menu/ProductEditPage'
import { apiError, fakeApi, json, renderPage } from '@/test/render'
import type { Category, Product, ProductGroupSetting, ProductOptionsView } from '@/lib/types'

// jsdom 26 has no PointerEvent; base-ui's Switch dispatches one when clicked.
class PointerEventShim extends MouseEvent {}
Object.defineProperty(window, 'PointerEvent', { value: PointerEventShim, configurable: true })

// jsdom's AbortSignal is not Node's, so react-router's `new Request(url, {signal})`
// throws while navigating after a save. Drop the signal: no route here loads data.
const RealRequest = globalThis.Request
class RequestWithoutSignal extends RealRequest {
  constructor(input: RequestInfo | URL, init: RequestInit = {}) {
    super(input, { ...init, signal: undefined })
  }
}
Object.defineProperty(globalThis, 'Request', { value: RequestWithoutSignal, configurable: true })

const coffee: Category = { id: 1, name: 'Coffee', sortOrder: 1, active: true, productCount: 2 }
const tea: Category = { id: 2, name: 'Tea', sortOrder: 2, active: true, productCount: 1 }

const mocha: Product = {
  id: 4,
  categoryId: 1,
  categoryName: 'Coffee',
  name: 'Mocha',
  description: 'Dark and rich',
  imageUrl: '/uploads/product-4-ab12cd34.png',
  basePrice: 4.6,
  isAvailable: true,
  isActive: true,
  createdAt: '2026-10-01T00:00:00Z'
}

/** Size: required, one pick. Large is +$1.00 for the group but +$0.50 on this drink (TC-15). */
const size: ProductGroupSetting = {
  groupId: 1,
  name: 'Size',
  selectionType: 'single',
  isRequired: true,
  maxSelect: 1,
  offered: true,
  isActive: true,
  defaultOptionId: 11,
  options: [
    { optionId: 11, name: 'Regular', groupPrice: 0, offered: true, priceOverride: null, optionActive: true },
    { optionId: 12, name: 'Large', groupPrice: 1, offered: true, priceOverride: 0.5, optionActive: true }
  ]
}

const addons: ProductGroupSetting = {
  groupId: 2,
  name: 'Add-ons',
  selectionType: 'multiple',
  isRequired: false,
  maxSelect: 3,
  offered: false,
  isActive: true,
  defaultOptionId: null,
  options: [
    { optionId: 21, name: 'Oat milk', groupPrice: 0.6, offered: false, priceOverride: null, optionActive: true },
    { optionId: 22, name: 'Espresso shot', groupPrice: 0.8, offered: false, priceOverride: null, optionActive: false }
  ]
}

const optionsView: ProductOptionsView = { productId: 4, productName: 'Mocha', groups: [size, addons] }

/** Everything the editor of drink 4 asks for. */
const editRoutes = {
  'GET /api/admin/categories': [coffee, tea],
  'GET /api/admin/products/4': mocha,
  'GET /api/admin/products/4/options': optionsView
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderEditor() {
  return renderPage(<ProductEditPage />, { path: '/menu/products/4', routePath: '/menu/products/:id' })
}

describe('ProductEditPage details (FR-25)', () => {
  it('reports a missing drink instead of loading forever', async () => {
    fakeApi({ ...editRoutes, 'GET /api/admin/products/4': () => apiError(404, 'not_found', 'Drink not found.') })
    renderEditor()
    expect(await screen.findByRole('alert')).toHaveTextContent('Drink not found.')
  })

  it('fills the form with the drink the server sent', async () => {
    fakeApi(editRoutes)
    renderEditor()

    expect(await screen.findByDisplayValue('Mocha')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toHaveValue('Dark and rich')
    expect(screen.getByLabelText('Base price')).toHaveValue('4.60')
    expect(screen.getByLabelText('Category')).toHaveTextContent('Coffee')
    expect(screen.getByRole('switch', { name: 'On the menu' })).toBeChecked()
  })

  it('saves the typed values with PUT and keeps the picture it already has', async () => {
    const calls = fakeApi({
      ...editRoutes,
      'PUT /api/admin/products/4': { ...mocha, name: 'Mocha Deluxe', basePrice: 5.25 }
    })
    renderEditor()

    const name = await screen.findByDisplayValue('Mocha')
    await userEvent.clear(name)
    await userEvent.type(name, 'Mocha Deluxe')
    await userEvent.clear(screen.getByLabelText('Base price'))
    await userEvent.type(screen.getByLabelText('Base price'), '5.25')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')).toMatchObject({ path: '/api/admin/products/4' })
    expect(calls.find(c => c.method === 'PUT')!.body).toEqual({
      categoryId: 1,
      name: 'Mocha Deluxe',
      description: 'Dark and rich',
      imageUrl: '/uploads/product-4-ab12cd34.png',
      basePrice: 5.25,
      isActive: true
    })
  })

  it('adds a drink and opens the new drink page', async () => {
    const calls = fakeApi({
      'GET /api/admin/categories': [coffee, tea],
      'POST /api/admin/products': () =>
        json(
          {
            ...mocha,
            id: 9,
            name: 'Frappé',
            description: 'Cold and sweet',
            imageUrl: '',
            basePrice: 4.6,
            isActive: true
          },
          201
        ),
      'GET /api/admin/products/9': { ...mocha, id: 9, name: 'Frappé', description: 'Cold and sweet', imageUrl: '' },
      'GET /api/admin/products/9/options': { ...optionsView, productId: 9, productName: 'Frappé' }
    })
    renderPage(<ProductEditPage />, {
      path: '/menu/products/new',
      routes: [{ path: '/menu/products/:id', element: <ProductEditPage /> }]
    })

    await userEvent.click(await screen.findByLabelText('Category'))
    await userEvent.click(await screen.findByRole('option', { name: 'Coffee' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Frappé')
    await userEvent.type(screen.getByLabelText('Description'), 'Cold and sweet')
    await userEvent.type(screen.getByLabelText('Base price'), '4.60')
    await userEvent.click(screen.getByRole('switch', { name: 'On the menu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add drink' }))

    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true))
    expect(calls.find(c => c.method === 'POST')!.body).toEqual({
      categoryId: 1,
      name: 'Frappé',
      description: 'Cold and sweet',
      imageUrl: null,
      basePrice: 4.6,
      isActive: true
    })
    // The editor of drink 9 is now open: it has the picture and options cards.
    expect(await screen.findByRole('heading', { name: 'Frappé' })).toBeInTheDocument()
    expect(await screen.findByText('Picture')).toBeInTheDocument()
  })

  it('catches an empty form before calling the server', async () => {
    const calls = fakeApi({ 'GET /api/admin/categories': [coffee, tea] })
    renderPage(<ProductEditPage />, { path: '/menu/products/new' })

    await userEvent.click(await screen.findByRole('button', { name: 'Add drink' }))

    expect(await screen.findByText('Choose a category.')).toBeInTheDocument()
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a price.')).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0)
  })

  it('refuses a price with three decimals', async () => {
    const calls = fakeApi(editRoutes)
    renderEditor()

    await userEvent.clear(await screen.findByLabelText('Base price'))
    await userEvent.type(screen.getByLabelText('Base price'), '4.567')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Use a price like 4.50.')).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'PUT')).toHaveLength(0)
  })
})

describe('ProductEditPage picture (FR-07)', () => {
  it('uploads the chosen file and shows the picture the server stored', async () => {
    const calls = fakeApi({
      ...editRoutes,
      'POST /api/admin/products/4/image': { ...mocha, imageUrl: '/uploads/product-4-ff00ee11.png' }
    })
    renderEditor()

    await userEvent.upload(
      await screen.findByLabelText('New picture'),
      new File(['x'], 'mocha.png', { type: 'image/png' })
    )

    await waitFor(() => expect(calls.some(c => c.path.endsWith('/image'))).toBe(true))
    const sent = calls.find(c => c.path.endsWith('/image'))!.body as FormData
    expect(sent).toBeInstanceOf(FormData)
    expect((sent.get('file') as File).name).toBe('mocha.png')
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Mocha' })).toHaveAttribute(
        'src',
        '/uploads/product-4-ff00ee11.png'
      )
    )
  })

  it('shows why the server refused the file', async () => {
    fakeApi({
      ...editRoutes,
      'POST /api/admin/products/4/image': () => apiError(400, 'bad_image', 'Use a JPG, PNG or WebP picture.')
    })
    renderEditor()

    // The box only takes images, so send a .png the server then rejects.
    await userEvent.upload(
      await screen.findByLabelText('New picture'),
      new File(['x'], 'broken.png', { type: 'image/png' })
    )

    expect(await screen.findByText('Use a JPG, PNG or WebP picture.')).toBeInTheDocument()
  })
})

describe('ProductEditPage options (FR-26)', () => {
  it('shows every group, the group price and options that are switched off', async () => {
    fakeApi(editRoutes)
    renderEditor()

    const sizeGroup = within(await screen.findByRole('region', { name: 'Options: Size' }))
    expect(sizeGroup.getByRole('checkbox', { name: 'Offer Size' })).toBeChecked()
    expect(sizeGroup.getByText('Group price +$1.00')).toBeInTheDocument()
    expect(sizeGroup.getByLabelText('Price for this drink: Large')).toHaveValue('0.50')
    expect(sizeGroup.getByRole('radio', { name: 'Default: Regular' })).toBeChecked()

    const addonGroup = within(screen.getByRole('region', { name: 'Options: Add-ons' }))
    expect(addonGroup.getByRole('checkbox', { name: 'Offer Add-ons' })).not.toBeChecked()
    // Not offered yet, so its options stay hidden until the group is ticked.
    expect(addonGroup.queryByRole('checkbox', { name: 'Oat milk' })).not.toBeInTheDocument()
  })

  it('sends exactly what the screen says', async () => {
    const saved: ProductOptionsView = {
      ...optionsView,
      groups: [
        { ...size, defaultOptionId: 12 },
        {
          ...addons,
          offered: true,
          options: [
            { ...addons.options[0], offered: true, priceOverride: 0.75 },
            { ...addons.options[1], offered: false, priceOverride: null }
          ]
        }
      ]
    }
    const calls = fakeApi({ ...editRoutes, 'PUT /api/admin/products/4/options': saved })
    renderEditor()

    const sizeGroup = within(await screen.findByRole('region', { name: 'Options: Size' }))
    await userEvent.click(sizeGroup.getByRole('radio', { name: 'Default: Large' }))

    const addonGroup = within(screen.getByRole('region', { name: 'Options: Add-ons' }))
    await userEvent.click(addonGroup.getByRole('checkbox', { name: 'Offer Add-ons' }))
    expect(addonGroup.getByRole('checkbox', { name: 'Espresso shot (inactive)' })).toBeInTheDocument()
    await userEvent.click(addonGroup.getByRole('checkbox', { name: 'Oat milk' }))
    await userEvent.type(addonGroup.getByLabelText('Price for this drink: Oat milk'), '0.75')

    await userEvent.click(screen.getByRole('button', { name: 'Save options' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    const put = calls.find(c => c.method === 'PUT')!
    expect(put.path).toBe('/api/admin/products/4/options')
    expect(put.body).toEqual({
      groups: [
        {
          groupId: 1,
          isActive: true,
          defaultOptionId: 12,
          options: [
            { optionId: 11, priceOverride: null },
            { optionId: 12, priceOverride: 0.5 }
          ]
        },
        { groupId: 2, isActive: true, defaultOptionId: null, options: [{ optionId: 21, priceOverride: 0.75 }] }
      ]
    })
  })

  it('an offered group with no option is caught before calling the server', async () => {
    const calls = fakeApi(editRoutes)
    renderEditor()

    const addonGroup = within(await screen.findByRole('region', { name: 'Options: Add-ons' }))
    await userEvent.click(addonGroup.getByRole('checkbox', { name: 'Offer Add-ons' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save options' }))

    expect(await screen.findByText('Add-ons: offer at least one option.')).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'PUT')).toHaveLength(0)
  })

  it('warns when a required group has no default, and still saves', async () => {
    const noDefault: ProductOptionsView = { ...optionsView, groups: [{ ...size, defaultOptionId: null }, addons] }
    const calls = fakeApi({
      ...editRoutes,
      'GET /api/admin/products/4/options': noDefault,
      'PUT /api/admin/products/4/options': noDefault
    })
    renderEditor()

    expect(
      await screen.findByText('Size is required: pick a default so the app shows one chosen.')
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save options' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')!.body).toEqual({
      groups: [
        {
          groupId: 1,
          isActive: true,
          defaultOptionId: null,
          options: [
            { optionId: 11, priceOverride: null },
            { optionId: 12, priceOverride: 0.5 }
          ]
        }
      ]
    })
  })

  it('shows the server message when the default is not offered', async () => {
    fakeApi({
      ...editRoutes,
      'PUT /api/admin/products/4/options': () =>
        apiError(400, 'bad_default', 'Size: the default must be an offered option.')
    })
    renderEditor()

    await userEvent.click(await screen.findByRole('button', { name: 'Save options' }))

    expect(await screen.findByText('Size: the default must be an offered option.')).toBeInTheDocument()
  })
})
