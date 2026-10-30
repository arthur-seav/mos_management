import { ApiError, api, storeSession, withQuery } from '@/lib/api'

describe('withQuery', () => {
  it('drops empty values and encodes the rest', () => {
    expect(withQuery('/api/x', { q: 'latte art', status: '', page: 0, none: undefined })).toBe(
      '/api/x?q=latte+art&page=0'
    )
    expect(withQuery('/api/x')).toBe('/api/x')
  })
})

describe('api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    storeSession(null)
  })

  it('sends the stored token and turns {code, message} into an ApiError', async () => {
    storeSession({ token: 'abc', user: {} })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'bad_credentials', message: 'Incorrect email/phone or password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const error = (await api.get('/api/admin/me').catch(e => e)) as ApiError

    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer abc')
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('bad_credentials')
    expect(error.message).toBe('Incorrect email/phone or password.')
  })
})
