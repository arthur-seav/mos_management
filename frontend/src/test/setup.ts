import '@testing-library/jest-dom/vitest'

// Base UI dispatches PointerEvent on radios; jsdom does not provide it.
if (!('PointerEvent' in window)) {
  class TestPointerEvent extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? ''
      this.isPrimary = init.isPrimary ?? false
    }
  }
  Object.defineProperty(window, 'PointerEvent', { value: TestPointerEvent, writable: true, configurable: true })
}

// React Router's memory router builds Node Requests with a jsdom AbortSignal.
// These component tests do not exercise loader cancellation; omit the foreign signal.
const NativeRequest = globalThis.Request
globalThis.Request = class extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init?.signal ? { ...init, signal: undefined } : init)
  }
}
