import { hourRows, hoursPayload, hoursProblems, toTimeInput, type HourRow } from '@/components/store/hours'
import type { DayHours } from '@/lib/types'

function day(dayOfWeek: number, over: Partial<DayHours> = {}): DayHours {
  return { dayOfWeek, openTime: '07:00:00', closeTime: '18:00:00', isClosed: false, ...over }
}

function row(dayOfWeek: number, over: Partial<HourRow> = {}): HourRow {
  return { dayOfWeek, openTime: '07:00', closeTime: '18:00', isClosed: false, ...over }
}

describe('toTimeInput', () => {
  it('drops the seconds and turns null into an empty input', () => {
    expect(toTimeInput('07:00:00')).toBe('07:00')
    expect(toTimeInput('07:30')).toBe('07:30')
    expect(toTimeInput(null)).toBe('')
  })
})

describe('hourRows', () => {
  it('always gives seven rows, Sunday first', () => {
    const rows = hourRows([day(1), day(2, { openTime: '08:00:00', closeTime: '17:00:00' })])
    expect(rows).toHaveLength(7)
    expect(rows.map(r => r.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(rows[2]).toEqual({ dayOfWeek: 2, openTime: '08:00', closeTime: '17:00', isClosed: false })
  })

  it('treats a day the API did not send as closed', () => {
    expect(hourRows([day(1)])[0]).toEqual({ dayOfWeek: 0, openTime: '', closeTime: '', isClosed: true })
  })

  it('keeps the stored times of a closed day so they come back if it reopens', () => {
    const rows = hourRows([day(0, { isClosed: true, openTime: '07:00:00', closeTime: '18:00:00' })])
    expect(rows[0]).toEqual({ dayOfWeek: 0, openTime: '07:00', closeTime: '18:00', isClosed: true })
  })
})

describe('hoursProblems', () => {
  it('says nothing when every open day opens before it closes', () => {
    expect(hoursProblems([row(0, { isClosed: true, openTime: '', closeTime: '' }), row(1)])).toEqual({})
  })

  it('catches a closing time that is not after the opening time', () => {
    expect(hoursProblems([row(3, { openTime: '18:00', closeTime: '07:00' })])).toEqual({
      3: 'Opening time must be before closing time.'
    })
    expect(hoursProblems([row(3, { openTime: '07:00', closeTime: '07:00' })])).toEqual({
      3: 'Opening time must be before closing time.'
    })
  })

  it('catches a missing time on an open day', () => {
    expect(hoursProblems([row(5, { closeTime: '' })])).toEqual({ 5: 'Set both times, or mark the day closed.' })
  })

  it('ignores the times of a closed day', () => {
    expect(hoursProblems([row(6, { isClosed: true, openTime: '18:00', closeTime: '07:00' })])).toEqual({})
  })
})

describe('hoursPayload', () => {
  it('sends all seven days, with null times on a closed day', () => {
    const rows = hourRows([
      day(0, { isClosed: true }),
      day(1),
      day(2),
      day(3),
      day(4),
      day(5),
      day(6, { openTime: '08:00:00', closeTime: '21:00:00' })
    ])
    const { days } = hoursPayload(rows)
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual({ dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true })
    expect(days[1]).toEqual({ dayOfWeek: 1, openTime: '07:00', closeTime: '18:00', isClosed: false })
    expect(days[6]).toEqual({ dayOfWeek: 6, openTime: '08:00', closeTime: '21:00', isClosed: false })
  })
})
