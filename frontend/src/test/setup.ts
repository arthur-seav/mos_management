import '@testing-library/jest-dom/vitest'

// Base UI dispatches PointerEvent on radios; jsdom does not provide it.
if (!('PointerEvent' in window)) {
  Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, writable: true, configurable: true })
}
