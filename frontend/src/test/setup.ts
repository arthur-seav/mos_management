import '@testing-library/jest-dom/vitest'

// Base UI dispatches PointerEvent on radios; jsdom does not provide it.
if (!('PointerEvent' in window)) {
  Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, writable: true, configurable: true })
}

// React Router's memory router builds Node Requests with a jsdom AbortSignal.
// These component tests do not exercise loader cancellation; omit the foreign signal.
const NativeRequest = globalThis.Request
globalThis.Request = class extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init?.signal ? { ...init, signal: undefined } : init)
  }
}
