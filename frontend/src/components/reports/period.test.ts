import {
  addDays,
  matchingQuickRange,
  periodDays,
  periodFromParams,
  quickPeriod
} from '@/components/reports/period'

// A fixed "today" so the numbers below are the only source of truth.
const FRIDAY = '2026-10-30'

describe('addDays', () => {
  it('steps over the end of a month and a year', () => {
    expect(addDays('2026-03-05', -29)).toBe('2026-02-04')
    expect(addDays('2026-01-03', -6)).toBe('2025-12-28')
    expect(addDays('2026-10-30', 2)).toBe('2026-11-01')
  })
})

describe('quickPeriod', () => {
  it('Today is one day', () => {
    expect(quickPeriod('today', FRIDAY)).toEqual({ from: '2026-10-30', to: '2026-10-30' })
  })

  it('Last 7 days counts today as the 7th day', () => {
    expect(quickPeriod('last7', FRIDAY)).toEqual({ from: '2026-10-24', to: '2026-10-30' })
  })

  it('Last 30 days counts today as the 30th day', () => {
    expect(quickPeriod('last30', FRIDAY)).toEqual({ from: '2026-10-01', to: '2026-10-30' })
  })

  it('This month starts on the 1st', () => {
    expect(quickPeriod('month', FRIDAY)).toEqual({ from: '2026-10-01', to: '2026-10-30' })
  })

  it('reaches back into February for a day early in March', () => {
    expect(quickPeriod('last30', '2026-03-05')).toEqual({ from: '2026-02-04', to: '2026-03-05' })
    expect(quickPeriod('month', '2026-03-05')).toEqual({ from: '2026-03-01', to: '2026-03-05' })
  })
})

describe('matchingQuickRange', () => {
  // On the 31st "This month" (Oct 1) and "Last 30 days" (Oct 2) differ.
  const halloween = '2026-10-31'

  it('recognises the dates a quick button produces', () => {
    expect(matchingQuickRange({ from: '2026-10-25', to: '2026-10-31' }, halloween)).toBe('last7')
    expect(matchingQuickRange({ from: '2026-10-02', to: '2026-10-31' }, halloween)).toBe('last30')
    expect(matchingQuickRange({ from: '2026-10-01', to: '2026-10-31' }, halloween)).toBe('month')
    expect(matchingQuickRange({ from: '2026-10-31', to: '2026-10-31' }, halloween)).toBe('today')
  })

  it('a hand-picked period lights up no button', () => {
    expect(matchingQuickRange({ from: '2026-10-02', to: '2026-10-20' }, halloween)).toBeNull()
  })
})

describe('periodFromParams', () => {
  it('no dates in the URL means the last 7 days, like the server', () => {
    expect(periodFromParams(null, null, FRIDAY)).toEqual({ from: '2026-10-24', to: '2026-10-30' })
  })

  it('keeps the dates the URL carries', () => {
    expect(periodFromParams('2026-09-01', '2026-09-30', FRIDAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('fills in only the missing end', () => {
    expect(periodFromParams('2026-09-01', null, FRIDAY)).toEqual({ from: '2026-09-01', to: '2026-10-30' })
    expect(periodFromParams(null, '2026-09-30', FRIDAY)).toEqual({ from: '2026-10-24', to: '2026-09-30' })
  })
})

describe('periodDays', () => {
  it('counts both ends', () => {
    expect(periodDays({ from: '2026-10-24', to: '2026-10-30' })).toBe(7)
    expect(periodDays({ from: '2026-10-30', to: '2026-10-30' })).toBe(1)
    expect(periodDays({ from: '2026-10-01', to: '2026-10-31' })).toBe(31)
  })

  it('is 0 when the dates run backwards (server code bad_period)', () => {
    expect(periodDays({ from: '2026-11-05', to: '2026-10-01' })).toBe(0)
  })
})
