/** Opening hours as the form holds them, checks them and sends them (FR-37). Pure, so it can be unit tested. */

import { WEEKDAYS } from '@/lib/format'
import type { DayHours } from '@/lib/types'

/** One row of the form: times are "HH:mm" for <input type="time">, "" when unknown. */
export type HourRow = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }

/** The API sends "09:00:00" (or "09:00"); a time input wants "09:00". */
export function toTimeInput(value: string | null): string {
  return value ? value.slice(0, 5) : ''
}

/** Seven rows, Sunday (0) to Saturday (6), so a day the API left out still shows up as closed. */
export function hourRows(hours: DayHours[]): HourRow[] {
  return WEEKDAYS.map((_, dayOfWeek) => {
    const day = hours.find(h => h.dayOfWeek === dayOfWeek)
    return {
      dayOfWeek,
      openTime: toTimeInput(day?.openTime ?? null),
      closeTime: toTimeInput(day?.closeTime ?? null),
      isClosed: day?.isClosed ?? true
    }
  })
}

/** What is wrong with each open day, keyed by dayOfWeek. Empty = safe to send. */
export function hoursProblems(rows: HourRow[]): Record<number, string> {
  const problems: Record<number, string> = {}
  for (const row of rows) {
    if (row.isClosed) continue
    if (!row.openTime || !row.closeTime) problems[row.dayOfWeek] = 'Set both times, or mark the day closed.'
    else if (row.openTime >= row.closeTime) problems[row.dayOfWeek] = 'Opening time must be before closing time.'
  }
  return problems
}

/** Body for PUT /api/admin/store/hours: all seven days, "HH:mm", and no times on a closed day. */
export function hoursPayload(rows: HourRow[]) {
  return {
    days: rows.map(row => ({
      dayOfWeek: row.dayOfWeek,
      openTime: row.isClosed ? null : row.openTime,
      closeTime: row.isClosed ? null : row.closeTime,
      isClosed: row.isClosed
    }))
  }
}
