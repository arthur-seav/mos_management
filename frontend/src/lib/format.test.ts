import { ago, dateTime, money, moneySigned, storeDate, time } from '@/lib/format'

describe('format', () => {
  it('formats dollars', () => {
    expect(money(4.6)).toBe('$4.60')
    expect(moneySigned(-0.5)).toBe('-$0.50')
    expect(moneySigned(0)).toBe('+$0.00')
  })

  it('shows times in the store zone (UTC+7)', () => {
    expect(time('2026-10-29T03:12:00Z')).toBe('10:12 AM')
    expect(dateTime('2026-10-29T03:12:00Z')).toBe('Thu, Oct 29, 2026 · 10:12 AM')
    expect(storeDate(new Date('2026-10-29T18:30:00Z'))).toBe('2026-10-30')
  })

  it('says how long ago', () => {
    expect(ago('2026-10-29T03:00:00Z', '2026-10-29T03:00:30Z')).toBe('just now')
    expect(ago('2026-10-29T03:00:00Z', '2026-10-29T03:04:00Z')).toBe('4 min ago')
    expect(ago('2026-10-29T03:00:00Z', '2026-10-29T05:10:00Z')).toBe('2 h ago')
  })
})
