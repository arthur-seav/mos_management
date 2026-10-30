import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import OptionGroupsPage from '@/pages/menu/OptionGroupsPage'
import { fakeApi, renderPage } from '@/test/render'
import type { OptionGroup } from '@/lib/types'

const iceLevel: OptionGroup = {
  id: 1,
  name: 'Ice level',
  selectionType: 'single',
  isRequired: true,
  maxSelect: 1,
  sortOrder: 1,
  needsIcedDrink: true,
  summaryNoun: 'ice',
  options: [
    { id: 11, groupId: 1, name: 'Less', extraPrice: 0, sortOrder: 1, isActive: true, isIced: false },
    { id: 12, groupId: 1, name: 'Normal', extraPrice: 0, sortOrder: 2, isActive: true, isIced: false }
  ]
}

const extras: OptionGroup = {
  id: 2,
  name: 'Extras',
  selectionType: 'multiple',
  isRequired: false,
  maxSelect: 3,
  sortOrder: 2,
  needsIcedDrink: false,
  summaryNoun: null,
  options: [
    { id: 21, groupId: 2, name: 'Extra shot', extraPrice: 0.75, sortOrder: 1, isActive: true, isIced: false },
    { id: 22, groupId: 2, name: 'Oat milk', extraPrice: 0.5, sortOrder: 2, isActive: false, isIced: false }
  ]
}

function card(name: string) {
  return screen.getByText(name).closest('[data-slot=card]') as HTMLElement
}

/** base-ui switches and radios are driven by a hidden input, so click the label a customer would click. */
function clickLabel(text: string) {
  return userEvent.click(screen.getByText(text))
}

afterEach(() => vi.unstubAllGlobals())

describe('OptionGroupsPage (FR-26)', () => {
  it('shows each group with its rules, its summary noun and its option prices', async () => {
    fakeApi({ 'GET /api/admin/option-groups': [extras, iceLevel] })
    renderPage(<OptionGroupsPage />, { path: '/menu/options' })

    await screen.findByText('Ice level')
    const ice = card('Ice level')
    expect(ice).toHaveTextContent('Required')
    expect(ice).toHaveTextContent('Pick one')
    expect(ice).toHaveTextContent('Only for iced drinks')
    expect(ice).toHaveTextContent('Shown as "Less ice"')
    // Both of this group's options are free, so the table shows a dash, not "+$0.00".
    expect(within(ice).getAllByText('—')).toHaveLength(2)

    const extra = card('Extras')
    expect(extra).toHaveTextContent('Optional')
    expect(extra).toHaveTextContent('Pick up to 3')
    expect(extra).not.toHaveTextContent('Only for iced drinks')
    expect(within(extra).getByText('Extra shot').closest('tr')).toHaveTextContent('+$0.75')
    expect(within(extra).getByText('Oat milk').closest('tr')).toHaveTextContent('Inactive')
    expect(within(extra).getByText('Extra shot').closest('tr')).toHaveTextContent('Active')
  })

  it('lists the groups in sortOrder, whatever order the API answered in', async () => {
    fakeApi({ 'GET /api/admin/option-groups': [extras, iceLevel] })
    renderPage(<OptionGroupsPage />)
    await screen.findByText('Ice level')

    const titles = screen.getAllByText(/^(Ice level|Extras)$/).map(el => el.textContent)
    expect(titles).toEqual(['Ice level', 'Extras'])
  })

  it('tells admins where a drink\u2019s own prices and defaults live', async () => {
    fakeApi({ 'GET /api/admin/option-groups': [] })
    renderPage(<OptionGroupsPage />)

    expect(await screen.findByText(/its own prices and its defaults are set on that drink's page/)).toBeInTheDocument()
  })

  it('adds a single-choice group and sends maxSelect 1 with the typed body', async () => {
    const calls = fakeApi({
      'GET /api/admin/option-groups': [iceLevel],
      'POST /api/admin/option-groups': { ...iceLevel, id: 9, name: 'Cup size' }
    })
    renderPage(<OptionGroupsPage />)
    await screen.findByText('Ice level')

    await userEvent.click(screen.getByRole('button', { name: 'Add group' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Cup size')
    // A max set while the group was "Multiple" must not follow it back to "Single".
    await clickLabel('Multiple')
    await userEvent.clear(screen.getByLabelText('Max picks'))
    await userEvent.type(screen.getByLabelText('Max picks'), '5')
    await clickLabel('Single')
    await clickLabel('Customers must choose')
    await userEvent.clear(screen.getByLabelText('Position'))
    await userEvent.type(screen.getByLabelText('Position'), '3')
    await userEvent.type(screen.getByLabelText('Summary noun'), 'cup')
    // "Add group" is both the page button and the dialog's submit; the dialog's is last.
    await userEvent.click(screen.getAllByRole('button', { name: 'Add group' }).at(-1)!)

    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true))
    expect(calls.find(c => c.method === 'POST')).toMatchObject({
      path: '/api/admin/option-groups',
      body: {
        name: 'Cup size',
        selectionType: 'single',
        isRequired: true,
        maxSelect: 1,
        sortOrder: 3,
        needsIcedDrink: false,
        summaryNoun: 'cup'
      }
    })
  })

  it('hides max picks for a single group and shows it once Multiple is picked', async () => {
    fakeApi({ 'GET /api/admin/option-groups': [iceLevel] })
    renderPage(<OptionGroupsPage />)
    await screen.findByText('Ice level')

    await userEvent.click(screen.getByRole('button', { name: 'Add group' }))
    expect(screen.queryByLabelText('Max picks')).not.toBeInTheDocument()

    await clickLabel('Multiple')

    expect(screen.getByLabelText('Max picks')).toBeInTheDocument()
  })

  it('edits a group with its current values and sends them to its own id', async () => {
    const calls = fakeApi({
      'GET /api/admin/option-groups': [extras],
      'PUT /api/admin/option-groups/2': { ...extras, maxSelect: 2 }
    })
    renderPage(<OptionGroupsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Edit group Extras' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Extras')
    await userEvent.clear(screen.getByLabelText('Max picks'))
    await userEvent.type(screen.getByLabelText('Max picks'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Save group' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')).toMatchObject({
      path: '/api/admin/option-groups/2',
      body: { name: 'Extras', selectionType: 'multiple', isRequired: false, maxSelect: 2, summaryNoun: null }
    })
  })

  it('adds an option to the group it was started from, with a negative price as a number', async () => {
    const calls = fakeApi({
      'GET /api/admin/option-groups': [iceLevel, extras],
      'POST /api/admin/option-groups/2/options': { ...extras.options[0], id: 23, name: 'Single shot' }
    })
    renderPage(<OptionGroupsPage />)
    await screen.findByText('Extras')

    await userEvent.click(screen.getByRole('button', { name: 'Add option to Extras' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Single shot')
    await userEvent.clear(screen.getByLabelText('Extra price'))
    await userEvent.type(screen.getByLabelText('Extra price'), '-0.50')
    await userEvent.clear(screen.getByLabelText('Position'))
    await userEvent.type(screen.getByLabelText('Position'), '4')
    // "Add option" is both the card button and the dialog's submit; the dialog's is last.
    await userEvent.click(screen.getAllByRole('button', { name: /^Add option/ }).at(-1)!)

    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true))
    const post = calls.find(c => c.method === 'POST')!
    expect(post.path).toBe('/api/admin/option-groups/2/options')
    expect(post.body).toEqual({ name: 'Single shot', extraPrice: -0.5, sortOrder: 4, isIced: false, isActive: true })
  })

  it('edits an option and can mark it as the iced choice', async () => {
    const calls = fakeApi({
      'GET /api/admin/option-groups': [extras],
      'PUT /api/admin/options/22': { ...extras.options[1], isIced: true }
    })
    renderPage(<OptionGroupsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Oat milk in Extras' }))
    expect(screen.getByLabelText('Extra price')).toHaveValue(0.5)
    await clickLabel('This is the iced choice')
    await userEvent.click(screen.getByRole('button', { name: 'Save option' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')).toMatchObject({
      path: '/api/admin/options/22',
      body: { name: 'Oat milk', extraPrice: 0.5, sortOrder: 2, isIced: true, isActive: false }
    })
  })

  it('an empty option name never reaches the server', async () => {
    const calls = fakeApi({ 'GET /api/admin/option-groups': [iceLevel] })
    renderPage(<OptionGroupsPage />)
    await screen.findByText('Ice level')

    await userEvent.click(screen.getByRole('button', { name: 'Add option to Ice level' }))
    await userEvent.click(screen.getAllByRole('button', { name: /^Add option/ }).at(-1)!)

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0)
  })
})
