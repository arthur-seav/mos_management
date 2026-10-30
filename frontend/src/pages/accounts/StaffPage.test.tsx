import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import StaffPage from '@/pages/accounts/StaffPage'
import { ADMIN, apiError, fakeApi, renderPage } from '@/test/render'
import type { Page, User } from '@/lib/types'

/** ADMIN from the test helper is id 1, so this row is the signed-in admin's own row. */
const vanna: User = { ...ADMIN }

const dara: User = {
  id: 7,
  firstName: 'Dara',
  lastName: 'Pich',
  email: 'dara@mos.test',
  phone: '+85512345678',
  role: 'staff',
  status: 'active',
  dateOfBirth: null,
  createdAt: '2026-10-12T03:00:00Z'
}

const sokha: User = {
  id: 8,
  firstName: 'Sokha',
  lastName: 'Nuon',
  email: null,
  phone: '+85598765432',
  role: 'staff',
  status: 'inactive',
  dateOfBirth: null,
  createdAt: '2026-09-02T03:00:00Z'
}

const list: Page<User> = { items: [vanna, dara, sokha], page: 0, size: 20, total: 3 }

const rowOf = (name: string) => screen.getByText(name).closest('tr')!

// jsdom ships no PointerEvent, and base-ui's radio needs the constructor to
// pass the click on to its hidden input. Browsers all have it.
if (!('PointerEvent' in window)) {
  Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, writable: true, configurable: true })
}

afterEach(() => vi.unstubAllGlobals())

describe('StaffPage (FR-27)', () => {
  it('lists every staff account with its role, status and joining date', async () => {
    fakeApi({ 'GET /api/admin/staff': list })
    renderPage(<StaffPage />, { path: '/accounts/staff' })
    await screen.findByText('Vanna Chea')

    const admin = rowOf('Vanna Chea')
    expect(admin).toHaveTextContent('Admin')
    expect(admin).toHaveTextContent('Active')

    const active = rowOf('Dara Pich')
    expect(active).toHaveTextContent('Staff')
    expect(active).toHaveTextContent('dara@mos.test')
    expect(active).toHaveTextContent('Mon, Oct 12, 2026')

    const off = rowOf('Sokha Nuon')
    expect(off).toHaveTextContent('Inactive')
    // No email, so the phone number is the sign-in detail shown.
    expect(off).toHaveTextContent('+85598765432')
    expect(off).toHaveTextContent('Wed, Sep 2, 2026')
  })

  it('marks the signed-in admin and gives their row no deactivate', async () => {
    fakeApi({ 'GET /api/admin/staff': list })
    renderPage(<StaffPage />, { path: '/accounts/staff' })
    await screen.findByText('Vanna Chea')

    expect(within(rowOf('Vanna Chea')).getByText('(you)')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Vanna Chea' }))

    expect(await screen.findByText('Reset password')).toBeInTheDocument()
    expect(screen.queryByText('Deactivate')).not.toBeInTheDocument()
  })

  it('someone else can still be deactivated', async () => {
    fakeApi({ 'GET /api/admin/staff': list })
    renderPage(<StaffPage />, { path: '/accounts/staff' })

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Dara Pich' }))

    expect(await screen.findByText('Deactivate')).toBeInTheDocument()
  })

  it('the search box asks the server once the typing stops', async () => {
    const calls = fakeApi({ 'GET /api/admin/staff': list })
    renderPage(<StaffPage />, { path: '/accounts/staff' })
    await screen.findByText('Dara Pich')

    await userEvent.type(screen.getByPlaceholderText('Search name, email or phone'), 'dara')

    await waitFor(() => expect(calls.some(c => c.path === '/api/admin/staff?q=dara&page=0&size=20')).toBe(true))
    // Without the debounce every keystroke would ask: one page load plus one search.
    expect(calls.filter(c => c.path.startsWith('/api/admin/staff')).length).toBeLessThanOrEqual(2)
  })

  it('adds a staff account with exactly what was typed', async () => {
    const calls = fakeApi({
      'GET /api/admin/staff': list,
      'POST /api/admin/staff': { ...dara, id: 9, firstName: 'Mealea', lastName: 'Keo' }
    })
    renderPage(<StaffPage />, { path: '/accounts/staff' })
    await screen.findByText('Dara Pich')

    await userEvent.click(screen.getByRole('button', { name: 'Add staff' }))
    await userEvent.type(screen.getByLabelText('First name'), 'Mealea')
    await userEvent.type(screen.getByLabelText('Last name'), 'Keo')
    await userEvent.type(screen.getByLabelText('Email'), 'mealea@mos.test')
    await userEvent.click(screen.getByRole('radio', { name: 'Admin' }))
    await userEvent.type(screen.getByLabelText('Password'), 'coffee123')
    // Two "Add staff" buttons exist on purpose: the toolbar one and the dialog one.
    await userEvent.click(screen.getAllByRole('button', { name: 'Add staff' }).at(-1)!)

    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true))
    expect(calls.find(c => c.method === 'POST')!.body).toEqual({
      firstName: 'Mealea',
      lastName: 'Keo',
      email: 'mealea@mos.test',
      phone: null,
      role: 'admin',
      password: 'coffee123'
    })
  })

  it('a password under 8 characters never reaches the server', async () => {
    const calls = fakeApi({ 'GET /api/admin/staff': list })
    renderPage(<StaffPage />, { path: '/accounts/staff' })
    await screen.findByText('Dara Pich')

    await userEvent.click(screen.getByRole('button', { name: 'Add staff' }))
    await userEvent.type(screen.getByLabelText('First name'), 'Mealea')
    await userEvent.type(screen.getByLabelText('Phone'), '012345678')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getAllByRole('button', { name: 'Add staff' }).at(-1)!)

    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0)
  })

  it('shows the server email_taken message under the email field', async () => {
    fakeApi({
      'GET /api/admin/staff': list,
      'POST /api/admin/staff': () =>
        apiError(409, 'email_taken', 'This email is already used by another account.')
    })
    renderPage(<StaffPage />, { path: '/accounts/staff' })
    await screen.findByText('Dara Pich')

    await userEvent.click(screen.getByRole('button', { name: 'Add staff' }))
    await userEvent.type(screen.getByLabelText('First name'), 'Mealea')
    await userEvent.type(screen.getByLabelText('Email'), 'dara@mos.test')
    await userEvent.type(screen.getByLabelText('Password'), 'coffee123')
    await userEvent.click(screen.getAllByRole('button', { name: 'Add staff' }).at(-1)!)

    const emailError = await screen.findByText('This email is already used by another account.')
    expect(emailError).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('editing sends the five fields the server takes, without a password', async () => {
    const calls = fakeApi({
      'GET /api/admin/staff': list,
      'PUT /api/admin/staff/7': { ...dara, role: 'admin' }
    })
    renderPage(<StaffPage />, { path: '/accounts/staff' })

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Dara Pich' }))
    await userEvent.click(await screen.findByText('Edit'))
    await userEvent.click(await screen.findByRole('radio', { name: 'Admin' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')!.body).toEqual({
      firstName: 'Dara',
      lastName: 'Pich',
      email: 'dara@mos.test',
      phone: '+85512345678',
      role: 'admin'
    })
  })

  it('the admin cannot change their own role', async () => {
    fakeApi({ 'GET /api/admin/staff': list })
    renderPage(<StaffPage />, { path: '/accounts/staff' })

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Vanna Chea' }))
    await userEvent.click(await screen.findByText('Edit'))

    expect(await screen.findByText('Admin — you cannot change your own role.')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Staff' })).not.toBeInTheDocument()
  })

  it('deactivating asks first, then patches the status to inactive', async () => {
    const calls = fakeApi({
      'GET /api/admin/staff': list,
      'PATCH /api/admin/staff/7/status': { ...dara, status: 'inactive' }
    })
    renderPage(<StaffPage />, { path: '/accounts/staff' })

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Dara Pich' }))
    await userEvent.click(await screen.findByText('Deactivate'))

    expect(await screen.findByText('Deactivate Dara Pich?')).toBeInTheDocument()
    expect(
      screen.getByText("They are signed out at once and can't sign in until reactivated.")
    ).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'PATCH')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PATCH')).toBe(true))
    const patch = calls.find(c => c.method === 'PATCH')!
    expect(patch.path).toBe('/api/admin/staff/7/status')
    expect(patch.body).toEqual({ status: 'inactive' })
  })

  it('an inactive account is reactivated with status active', async () => {
    const calls = fakeApi({
      'GET /api/admin/staff': list,
      'PATCH /api/admin/staff/8/status': { ...sokha, status: 'active' }
    })
    renderPage(<StaffPage />, { path: '/accounts/staff' })

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Sokha Nuon' }))
    await userEvent.click(await screen.findByText('Reactivate'))
    await userEvent.click(screen.getByRole('button', { name: 'Reactivate' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PATCH')).toBe(true))
    expect(calls.find(c => c.method === 'PATCH')!.body).toEqual({ status: 'active' })
  })

  it('resetting a password needs the same password twice', async () => {
    const calls = fakeApi({
      'GET /api/admin/staff': list,
      'POST /api/admin/staff/7/password': dara
    })
    renderPage(<StaffPage />, { path: '/accounts/staff' })

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Dara Pich' }))
    await userEvent.click(await screen.findByText('Reset password'))
    await userEvent.type(await screen.findByLabelText('New password'), 'coffee123')
    await userEvent.type(screen.getByLabelText('Type it again'), 'coffee124')
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    expect(await screen.findByText('The two passwords are different.')).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0)

    await userEvent.clear(screen.getByLabelText('Type it again'))
    await userEvent.type(screen.getByLabelText('Type it again'), 'coffee123')
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true))
    const post = calls.find(c => c.method === 'POST')!
    expect(post.path).toBe('/api/admin/staff/7/password')
    expect(post.body).toEqual({ newPassword: 'coffee123' })
  })

  it('counts the accounts in the footer', async () => {
    fakeApi({ 'GET /api/admin/staff': list })
    renderPage(<StaffPage />, { path: '/accounts/staff' })

    expect(await screen.findByText('Showing 1 to 3 of 3 entries')).toBeInTheDocument()
  })
})
