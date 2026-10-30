import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import StoreSettingsPage from '@/pages/store/StoreSettingsPage'
import { apiError, fakeApi, renderPage, STAFF } from '@/test/render'
import type { DayHours, StoreInfo, StoreSettings } from '@/lib/types'

const settings: StoreSettings = {
  storeName: 'MOS Coffee',
  address: '12 Street 310, Phnom Penh',
  phone: '012 345 678',
  slotIntervalMin: 15,
  minPrepMin: 30,
  pickupTimeoutMin: 30,
  asapPrepMin: 10,
  onlineOrderingOpen: true
}

const hours: DayHours[] = [
  { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
  { dayOfWeek: 1, openTime: '07:00:00', closeTime: '18:00:00', isClosed: false },
  { dayOfWeek: 2, openTime: '07:00:00', closeTime: '18:00:00', isClosed: false },
  { dayOfWeek: 3, openTime: '07:00:00', closeTime: '18:00:00', isClosed: false },
  { dayOfWeek: 4, openTime: '07:00:00', closeTime: '18:00:00', isClosed: false },
  { dayOfWeek: 5, openTime: '07:00:00', closeTime: '18:00:00', isClosed: false },
  { dayOfWeek: 6, openTime: '08:00:00', closeTime: '21:00:00', isClosed: false }
]

const info: StoreInfo = { settings, hours, timeZone: 'Asia/Phnom_Penh', isOpenNow: true }

/** base-ui switches are driven by a hidden input, so click the label a user would click. */
function clickClosed(day: string) {
  return userEvent.click(within(screen.getByRole('group', { name: day })).getByText('Closed'))
}

afterEach(() => vi.unstubAllGlobals())

describe('StoreSettingsPage (FR-36, FR-37, FR-40, FR-41)', () => {
  it('shows the saved store, pickup rules and hours to an admin', async () => {
    fakeApi({ 'GET /api/admin/store': info })
    renderPage(<StoreSettingsPage />, { path: '/store' })

    expect(await screen.findByText('Open')).toBeInTheDocument()
    expect(screen.getByText(/Open now/)).toBeInTheDocument()
    expect(screen.getByLabelText('Store name')).toHaveValue('MOS Coffee')
    expect(screen.getByLabelText('Phone')).toHaveValue('012 345 678')
    expect(screen.getByLabelText('Slot interval (minutes)')).toHaveValue(15)
    expect(screen.getByLabelText('Minimum prep time for scheduled pickup (minutes)')).toHaveValue(30)
    expect(screen.getByLabelText('Pickup timeout (minutes)')).toHaveValue(30)
    expect(screen.getByLabelText('ASAP prep time (minutes)')).toHaveValue(10)
    expect(screen.getByLabelText('Monday opening time')).toHaveValue('07:00')
    expect(screen.getByLabelText('Saturday closing time')).toHaveValue('21:00')
    expect(screen.getByText(/The last pickup slot is 60 minutes before closing/)).toBeInTheDocument()
    expect(screen.getByText('SA rule BR-07 says at least 30 minutes.')).toBeInTheDocument()
    expect(screen.getByText(/flagged in the queue \(BR-12\)/)).toBeInTheDocument()
  })

  it('a closed day keeps its time inputs switched off', async () => {
    fakeApi({ 'GET /api/admin/store': info })
    renderPage(<StoreSettingsPage />)

    expect(await screen.findByLabelText('Sunday opening time')).toBeDisabled()
    expect(screen.getByLabelText('Monday opening time')).toBeEnabled()
  })

  it('staff can pause but cannot change the settings (SA 1.5)', async () => {
    fakeApi({ 'GET /api/admin/store': info })
    renderPage(<StoreSettingsPage />, { path: '/store', user: STAFF })

    expect(await screen.findByRole('button', { name: 'Pause online orders' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Store name')).toBeDisabled()
    expect(screen.getByLabelText('Slot interval (minutes)')).toBeDisabled()
    expect(screen.getByLabelText('Monday opening time')).toBeDisabled()
    // One read-only line per admin-only card: store information, pickup rules, opening hours.
    expect(screen.getAllByText('Only admins can change these.')).toHaveLength(3)
  })

  it('pausing asks first, then sends open:false (FR-41)', async () => {
    const calls = fakeApi({
      'GET /api/admin/store': info,
      'PUT /api/admin/store/online-ordering': { ...info, settings: { ...settings, onlineOrderingOpen: false } }
    })
    renderPage(<StoreSettingsPage />, { path: '/store', user: STAFF })

    await userEvent.click(await screen.findByRole('button', { name: 'Pause online orders' }))
    expect(
      screen.getByText("Customers can't place orders in the app until you resume. Orders already placed carry on.")
    ).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'PUT')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Pause now' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')).toMatchObject({
      path: '/api/admin/store/online-ordering',
      body: { open: false }
    })
    expect(await screen.findByText('Paused')).toBeInTheDocument()
  })

  it('resuming sends open:true straight away', async () => {
    const paused: StoreInfo = { ...info, settings: { ...settings, onlineOrderingOpen: false }, isOpenNow: false }
    const calls = fakeApi({
      'GET /api/admin/store': paused,
      'PUT /api/admin/store/online-ordering': info
    })
    renderPage(<StoreSettingsPage />, { path: '/store', user: STAFF })

    expect(await screen.findByText('Paused')).toBeInTheDocument()
    expect(screen.getByText(/Closed now/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Resume online orders' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')!.body).toEqual({ open: true })
  })

  it('an admin saving the store information keeps the pickup rules untouched (FR-36)', async () => {
    const calls = fakeApi({ 'GET /api/admin/store': info, 'PUT /api/admin/store/settings': info })
    renderPage(<StoreSettingsPage />)

    await userEvent.clear(await screen.findByLabelText('Store name'))
    await userEvent.type(screen.getByLabelText('Store name'), 'MOS Coffee Toul Kork')
    await userEvent.click(screen.getByRole('button', { name: 'Save store information' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')).toMatchObject({ path: '/api/admin/store/settings' })
    expect(calls.find(c => c.method === 'PUT')!.body).toEqual({
      storeName: 'MOS Coffee Toul Kork',
      address: '12 Street 310, Phnom Penh',
      phone: '012 345 678',
      slotIntervalMin: 15,
      minPrepMin: 30,
      pickupTimeoutMin: 30,
      asapPrepMin: 10
    })
  })

  it('an admin saving the pickup rules sends the typed numbers as numbers (FR-40)', async () => {
    const calls = fakeApi({ 'GET /api/admin/store': info, 'PUT /api/admin/store/settings': info })
    renderPage(<StoreSettingsPage />)

    await userEvent.clear(await screen.findByLabelText('Slot interval (minutes)'))
    await userEvent.type(screen.getByLabelText('Slot interval (minutes)'), '10')
    await userEvent.clear(screen.getByLabelText('Minimum prep time for scheduled pickup (minutes)'))
    await userEvent.type(screen.getByLabelText('Minimum prep time for scheduled pickup (minutes)'), '45')
    await userEvent.clear(screen.getByLabelText('Pickup timeout (minutes)'))
    await userEvent.type(screen.getByLabelText('Pickup timeout (minutes)'), '20')
    await userEvent.click(screen.getByRole('button', { name: 'Save pickup rules' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    expect(calls.find(c => c.method === 'PUT')!.body).toEqual({
      storeName: 'MOS Coffee',
      address: '12 Street 310, Phnom Penh',
      phone: '012 345 678',
      slotIntervalMin: 10,
      minPrepMin: 45,
      pickupTimeoutMin: 20,
      asapPrepMin: 10
    })
  })

  it('warns when the minimum prep time drops under the 30 minutes BR-07 asks for', async () => {
    fakeApi({ 'GET /api/admin/store': info })
    renderPage(<StoreSettingsPage />)

    const field = await screen.findByLabelText('Minimum prep time for scheduled pickup (minutes)')
    await userEvent.clear(field)
    await userEvent.type(field, '15')

    expect(screen.getByText('Under 30 minutes breaks BR-07.')).toBeInTheDocument()
  })

  it('saving the hours sends all seven days in HH:mm, with no times on a closed day (FR-37)', async () => {
    const calls = fakeApi({ 'GET /api/admin/store': info, 'PUT /api/admin/store/hours': info })
    renderPage(<StoreSettingsPage />)

    await userEvent.clear(await screen.findByLabelText('Monday closing time'))
    await userEvent.type(screen.getByLabelText('Monday closing time'), '20:00')
    await clickClosed('Tuesday')
    await userEvent.click(screen.getByRole('button', { name: 'Save opening hours' }))

    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true))
    const put = calls.find(c => c.method === 'PUT')!
    expect(put.path).toBe('/api/admin/store/hours')
    expect(put.body).toEqual({
      days: [
        { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
        { dayOfWeek: 1, openTime: '07:00', closeTime: '20:00', isClosed: false },
        { dayOfWeek: 2, openTime: null, closeTime: null, isClosed: true },
        { dayOfWeek: 3, openTime: '07:00', closeTime: '18:00', isClosed: false },
        { dayOfWeek: 4, openTime: '07:00', closeTime: '18:00', isClosed: false },
        { dayOfWeek: 5, openTime: '07:00', closeTime: '18:00', isClosed: false },
        { dayOfWeek: 6, openTime: '08:00', closeTime: '21:00', isClosed: false }
      ]
    })
  })

  it('a day that closes before it opens never reaches the server', async () => {
    const calls = fakeApi({ 'GET /api/admin/store': info })
    renderPage(<StoreSettingsPage />)

    await userEvent.clear(await screen.findByLabelText('Monday closing time'))
    await userEvent.type(screen.getByLabelText('Monday closing time'), '06:00')
    await userEvent.click(screen.getByRole('button', { name: 'Save opening hours' }))

    expect(await screen.findByText('Monday: Opening time must be before closing time.')).toBeInTheDocument()
    expect(calls.filter(c => c.method === 'PUT')).toHaveLength(0)
  })

  it("shows the server's bad_hours message", async () => {
    fakeApi({
      'GET /api/admin/store': info,
      'PUT /api/admin/store/hours': () => apiError(400, 'bad_hours', 'Each day once, please.')
    })
    renderPage(<StoreSettingsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Save opening hours' }))

    expect(await screen.findByText('Each day once, please.')).toBeInTheDocument()
  })
})
