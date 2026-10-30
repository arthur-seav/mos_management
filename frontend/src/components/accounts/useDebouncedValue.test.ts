import { act, renderHook } from '@testing-library/react'

import { useDebouncedValue } from '@/components/accounts/useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps the previous value until the whole delay has passed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' }
    })

    rerender({ value: 'ab' })
    expect(result.current).toBe('a')
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('a')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('ab')
  })

  it('only the last value of a burst of typing gets through', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' }
    })

    rerender({ value: 's' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ value: 'so' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ value: 'sop' })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('sop')
  })
})
