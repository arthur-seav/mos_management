import { playNewOrderBeep } from '@/components/queue/beep'

afterEach(() => vi.unstubAllGlobals())

describe('playNewOrderBeep (FR-34)', () => {
  it('plays a short tone through the Web Audio API', () => {
    const osc = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as null | (() => void)
    }
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn()
    }
    const close = vi.fn()
    const ctx = {
      currentTime: 0,
      destination: {},
      createOscillator: () => osc,
      createGain: () => gain,
      close
    }
    vi.stubGlobal('AudioContext', vi.fn(() => ctx))

    playNewOrderBeep()

    expect(osc.start).toHaveBeenCalledTimes(1)
    expect(osc.stop).toHaveBeenCalledWith(0.25)
    expect(osc.frequency.value).toBe(880)
  })

  it('stays quiet instead of crashing the board when the browser has no audio', () => {
    vi.stubGlobal('AudioContext', undefined)

    expect(() => playNewOrderBeep()).not.toThrow()
  })

  it('swallows an audio error so the toast still shows', () => {
    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => {
        throw new Error('not allowed before a user gesture')
      })
    )

    expect(() => playNewOrderBeep()).not.toThrow()
  })
})
