import { useEffect, useState } from 'react'

/**
 * The value, but only after it has stopped changing for `delayMs`.
 * Keeps the search box from calling the API on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}
