import { jest } from '@jest/globals'
import { getSignalAndAbort } from '../util.js'

// 以下のエラー対応、詳しい原因は不明.
// cancel.js を import する *.spec.ts が複数あるとエラーになる(と思う).
// ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From test /lib/cancel.spec.ts.
// Error [ERR_VM_MODULE_NOT_MODULE]: Provided module is not an instance of Module
//
// AbortController を import  し globalThis に設定することで cancel.js で動的 import を実行させない.
const { AbortController } = await import('abort-controller')
globalThis.AbortController = globalThis.AbortController || AbortController
const { abortPromise, chainSignal, emptyPromise, mixPromise, timeoutPromise } =
  await import('../../src/lib/cancel.js')

afterEach(() => {
  jest.useRealTimers()
})

describe('emptyPromise()', () => {
  it('should cancel', async () => {
    const [c, cancel] = emptyPromise()
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
  it('should cancel', async () => {
    const [signal, abort] = getSignalAndAbort()
    const mockAddEventListener = jest.spyOn(signal, 'addEventListener')
    const mockRemoveEventListener = jest.spyOn(signal, 'removeEventListener')
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
    expect(mockAddEventListener).toBeCalledTimes(1)
    expect(mockRemoveEventListener).toBeCalledTimes(0)

    cancel()

    await c.catch(() => {})
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()
    expect(mockAddEventListener).toBeCalledTimes(1)
    expect(mockRemoveEventListener).toBeCalledTimes(1)
    expect(mockRemoveEventListener.mock.calls[0]).toEqual(
      mockAddEventListener.mock.calls[0]
    )

    abort() // 結果は変わらない

    expect(await c).toBeUndefined()
    expect(mockAddEventListener).toBeCalledTimes(1)
    expect(mockRemoveEventListener).toBeCalledTimes(1)
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()
  })

  it('should abort', async () => {
    const [signal, abort] = getSignalAndAbort()
    const mockAddEventListener = jest.spyOn(signal, 'addEventListener')
    const mockRemoveEventListener = jest.spyOn(signal, 'removeEventListener')
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
    expect(mockAddEventListener).toBeCalledTimes(1)
    expect(mockRemoveEventListener).toBeCalledTimes(0)

    abort()

    await c.catch(() => {})
    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Aborted')
    expect(mockAddEventListener).toBeCalledTimes(1)
    expect(mockRemoveEventListener).toBeCalledTimes(1)
    expect(mockRemoveEventListener.mock.calls[0]).toEqual(
      mockAddEventListener.mock.calls[0]
    )

    cancel() // clean up

    reason = undefined
    try {
      await c
    } catch (r) {
      reason = r
    }
    expect(reason).toEqual('Aborted')
    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Aborted')
    expect(mockAddEventListener).toBeCalledTimes(1)
    expect(mockRemoveEventListener).toBeCalledTimes(1)
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

    expect(await c).toBeUndefined()
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()
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

    reason = undefined
    try {
      await c
    } catch (r) {
      reason = r
    }
    expect(reason).toEqual('Timeout')
    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Timeout')
  })
})

describe('mixPromise()', () => {
  it('should cancel', async () => {
    jest.useFakeTimers()
    const [signal, abort] = getSignalAndAbort()
    const [c, cancel] = mixPromise([timeoutPromise(1000), abortPromise(signal)])
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

    const step = async () => {
      // race の then が実行されるまで数ステップ必要.
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    }

    await step()
    expect(canceled).toBeFalsy()
    expect(reason).toBeUndefined()

    cancel()

    await c.catch(() => {})
    await step()
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()

    jest.advanceTimersByTime(1000)

    expect(await c).toBeUndefined()
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()

    abort()
    expect(await c).toBeUndefined()
    expect(canceled).toBeTruthy()
    expect(reason).toBeUndefined()
  })

  it('should abort', async () => {
    jest.useFakeTimers()
    const [signal, abort] = getSignalAndAbort()
    const [c, cancel] = mixPromise([timeoutPromise(1000), abortPromise(signal)])
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

    const step = async () => {
      // race の then が実行されるまで数ステップ必要.
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    }

    await step()
    expect(canceled).toBeFalsy()
    expect(reason).toBeUndefined()

    jest.advanceTimersByTime(1000)

    await Promise.resolve()
    await c.catch(() => {})
    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Timeout')

    cancel() // clean up

    reason = undefined
    try {
      await c
    } catch (r) {
      reason = r
    }
    expect(reason).toEqual('Timeout')
    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Timeout')

    abort() // 結果は変わらない
    reason = undefined
    try {
      await c
    } catch (r) {
      reason = r
    }
    expect(reason).toEqual('Timeout')
    expect(canceled).toBeFalsy()
    expect(reason).toEqual('Timeout')
  })
})

describe('chainSignal()', () => {
  it('should abort by resolve', async () => {
    const [cancelPromise, cancel] = emptyPromise()
    const [chainedProimse, chainedSignal] = chainSignal(cancelPromise)
    let aborted = false
    chainedSignal.addEventListener('abort', () => {
      aborted = true
    })
    expect(aborted).toBeFalsy()
    cancel()
    await chainedProimse
    expect(aborted).toBeTruthy()
  })
  it('should abort by reject', async () => {
    const [signal, abort] = getSignalAndAbort()
    const [cancelPromise, cancel] = abortPromise(signal)
    const [chainedProimse, chainedSignal] = chainSignal(cancelPromise)
    let aborted = false
    signal.addEventListener('abort', () => {
      aborted = true
    })
    expect(aborted).toBeFalsy()

    let rejected: any
    chainedProimse.catch((r) => {
      rejected = r
    })
    abort()
    try {
      await chainedProimse
    } catch {}
    expect(rejected).toEqual('Aborted')
    expect(aborted).toBeTruthy()
  })
})
