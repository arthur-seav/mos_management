/**
 * FR-28 / SA 9.3: the period filter. Everything here works on store-local
 * calendar dates as "YYYY-MM-DD" strings, the same shape the API takes, so
 * no time zone can shift a day. `today` is always passed in (format.storeDate).
 */

export type QuickRange = 'today' | 'last7' | 'last30' | 'month'

export type DatePeriod = { from: string; to: string }

export const QUICK_RANGES: { id: QuickRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'month', label: 'This month' }
]

/** The period the API uses when no dates are given (ReportService.period). */
export const DEFAULT_RANGE: QuickRange = 'last7'

const DAY_MS = 86_400_000

function toUtcMillis(day: string): number {
  const [year, month, date] = day.split('-').map(Number)
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1)
}

function toDay(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10)
}

/** `day` moved by whole days, e.g. addDays('2026-03-05', -29) === '2026-02-04'. */
export function addDays(day: string, days: number): string {
  return toDay(toUtcMillis(day) + days * DAY_MS)
}

/** The from/to a quick button stands for, counting today as one of the days. */
export function quickPeriod(range: QuickRange, today: string): DatePeriod {
  switch (range) {
    case 'today':
      return { from: today, to: today }
    case 'last7':
      return { from: addDays(today, -6), to: today }
    case 'last30':
      return { from: addDays(today, -29), to: today }
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today }
  }
}

/**
 * Which quick button to light up, or null for a custom period. When two
 * ranges mean the same dates the first one in QUICK_RANGES wins.
 */
export function matchingQuickRange(period: DatePeriod, today: string): QuickRange | null {
  const match = QUICK_RANGES.find(range => {
    const quick = quickPeriod(range.id, today)
    return quick.from === period.from && quick.to === period.to
  })
  return match ? match.id : null
}

/** Reads ?from=&to= off the URL, falling back to the API's own default period. */
export function periodFromParams(from: string | null, to: string | null, today: string): DatePeriod {
  const end = to || today
  const fallback = quickPeriod(DEFAULT_RANGE, /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : today)
  return { from: from || fallback.from, to: end }
}

/** How many days the period covers, both ends included; 0 if it runs backwards. */
export function periodDays(period: DatePeriod): number {
  const days = (toUtcMillis(period.to) - toUtcMillis(period.from)) / DAY_MS + 1
  return days > 0 ? days : 0
}
