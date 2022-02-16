import { jest } from '@jest/globals'
import EventEmitter from 'events'
import {
  abortPromise,
  cancelPromise,
  timeoutPromise
} from '../../src/lib/cancel.js'

afterEach(() => {
  jest.useRealTimers()
})

describe('canccelPromise()', () => {
  it('should cancel', async () => {
    const [c, cancel] = cancelPromise()
    let canceled = false
    c.then(() => {
      canceled = true
    })

    // https://stackoverflow.com/questions/52177631/jest-timer-and-promise-dont-work-well-settimeout-and-async-function
    await Promise.resolve()
    expect(canceled).toBeFalsy()

    cancel()

    await Promise.resolve()
    expect(canceled).toBeTruthy()
  })
})

describe('abortPromise()', () => {
  class DummySignal extends EventEmitter {
    addEventListener(...args: any[]) {
      this.addListener(args[0], args[1])
    }
  }
  const getSignalAndAbort = (): [AbortSignal, AbortController['abort']] => {
    const forceDummy = false
    if (forceDummy || typeof AbortController === 'undefined') {
      const signal = new DummySignal()
      return [signal as any, () => signal.emit('abort')]
    }
    const a = new AbortController()
    return [a.signal, () => a.abort()]
  }

  it('should cancel', async () => {
    const [signal, abort] = getSignalAndAbort()
    const [c, cancel] = abortPromise(signal)
    let canceled = false
    let reason: any = undefined
    c.then(
      () => {
        canceled = true
      },
      (r) => {
        reason = r
        return
      }
    )

    await Promise.resolve()
    expect(canceled).toBeFalsy()
    expect(reason).toBeUndefined()

    cancel()

    await Promise.resolve()
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()

    abort() // 結果は変わらない

    await Promise.resolve()
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()
    expect(await c).toBeUndefined()
  })

  it('should abort', async () => {
    const [signal, abort] = getSignalAndAbort()
    const [c, cancel] = abortPromise(signal as any)
    let canceled = false
    let reason: any = undefined
    c.then(
      () => {
        canceled = true
      },
      (r) => {
        reason = r
        return
      }
    )

    await Promise.resolve()
    expect(canceled).toBeFalsy()
    expect(reason).toBeUndefined()

    abort()

    await Promise.resolve()
    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Aborted')

    cancel() // clean up

    await Promise.resolve()
    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Aborted')
    reason = undefined
    try {
      await c
    } catch (r) {
      reason = r
    }
    expect(reason).toEqual('Aborted')
  })
})

describe('timeoutPromise()', () => {
  it('should cancel', async () => {
    jest.useFakeTimers()
    const [c, cancel] = timeoutPromise(1000)
    let canceled = false
    let reason: any = undefined
    c.then(
      () => {
        canceled = true
      },
      (r) => {
        reason = r
        return
      }
    )

    await Promise.resolve()
    expect(canceled).toBeFalsy()
    expect(reason).toBeUndefined()

    cancel()

    await Promise.resolve()
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()

    jest.advanceTimersByTime(1000)
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()
    expect(await c).toBeUndefined()
  })

  it('should abort', async () => {
    jest.useFakeTimers()
    const [c, cancel] = timeoutPromise(1000)
    let canceled = false
    let reason: any = undefined
    c.then(
      () => {
        canceled = true
      },
      (r) => {
        reason = r
        return
      }
    )

    await Promise.resolve()
    expect(canceled).toBeFalsy()
    expect(reason).toBeUndefined()

    jest.advanceTimersByTime(1000)

    await Promise.resolve()
    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Timeout')

    cancel() // clean up

    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Timeout')
    reason = undefined
    try {
      await c
    } catch (r) {
      reason = r
    }
    await Promise.resolve()
    expect(reason).toEqual('Timeout')
  })
})
