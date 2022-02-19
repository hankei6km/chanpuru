import { jest } from '@jest/globals'
import { Readable } from 'stream'
import { getSignalAndAbort } from '../util.js'
import { Chan } from '../../src/lib/chan.js'
import {
  beatsGenerator,
  breakGenerator,
  fromReadableStreamGenerator,
  rotateGenerator
} from '../../src/lib/generators.js'

// 以下のエラー対応、詳しい原因は不明.
// cancel.js を import する *.spec.ts が複数あるとエラーになる(と思う).
// ReferenceError: You are trying to `import` a file after the Jest environment has been torn down. From test /lib/cancel.spec.ts.
// Error [ERR_VM_MODULE_NOT_MODULE]: Provided module is not an instance of Module
//
// AbortController を import  し globalThis に設定することで cancel.js で動的 import を実行させない.
const { AbortController } = await import('abort-controller')
const saveAbortController = globalThis.AbortController
globalThis.AbortController = globalThis.AbortController || AbortController
const { abortPromise, emptyPromise, timeoutPromise } = await import(
  '../../src/lib/cancel.js'
)

// jest.useFakeTimers の後の spyOn でも戻さないと
// ReferenceError: setTimeout is not defined になる.
// (今回は jest.useFakeTimers でない場合でも使っているでの戻す必要はある)
const saveSetTimeout = global.setTimeout
const saveClearTimeout = global.clearTimeout
afterEach(() => {
  jest.useRealTimers()
  global.setTimeout = saveSetTimeout
  global.clearTimeout = saveClearTimeout
})
afterAll(() => {
  globalThis.AbortController = saveAbortController
})

describe('beatsGenerator()', () => {
  it('should generate values by generator', async () => {
    jest.useFakeTimers()
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')
    const c = new Chan<number>()
    const [p, cancel] = emptyPromise()
    const g = beatsGenerator(p, { timeout: 1000 })
    ;(async () => {
      // 別の async function で待つと timer が実行される?
      // 以下のように直接待つと実行されない.
      // jest.advanceTimersByTime(1000)
      // expect((await g.next()).value).toEqual(1)
      // await Promise.resolve()
      for await (let cnt of g) {
        c.send(cnt)
        if (cnt === 3) {
          cancel()
        }
      }
      c.close()
    })()
    const i = c.receiver()

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual(0)

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual(1)

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual(2)

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual(3)

    // jest.advanceTimersByTime(1000) // cancel されたので待たない.
    expect((await i.next()).done).toBeTruthy()

    expect(mockSetTimeout).toBeCalledTimes(5)
    expect(mockClearTimeout).toBeCalledTimes(1)
    expect(mockSetTimeout.mock.calls[0][1]).toEqual(1000)

    cancel()
  })

  it('should exit generator by counter', async () => {
    jest.useFakeTimers()
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')
    const c = new Chan<number>()
    const [p, cancel] = emptyPromise()
    const g = beatsGenerator(p, { timeout: 1000, count: 3 })
    ;(async () => {
      for await (let cnt of g) {
        c.send(cnt)
      }
      c.close()
    })()
    const i = c.receiver()

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual(0)

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual(1)

    // done を 1 回と数える.
    // 本来なら value で 2 が返ってきているはずだがここでは検証できない.
    // この後の timeout が 0 の方で検証している.
    jest.advanceTimersByTime(1000)
    expect((await i.next()).done).toBeTruthy()

    expect(mockSetTimeout).toBeCalledTimes(3)
    expect(mockClearTimeout).toBeCalledTimes(0)
    expect(mockSetTimeout.mock.calls[0][1]).toEqual(1000)

    cancel()
  })

  it('should wait timer when count passed 1', async () => {
    jest.useFakeTimers()
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')
    const c = new Chan<number>()
    const [p, cancel] = emptyPromise()
    const g = beatsGenerator(p, { timeout: 1000, count: 1 })
    let sended = false
    ;(async () => {
      for await (let cnt of g) {
        // generator は終了するのでループしない.
      }
      sended = true
      c.close()
    })()
    const i = c.receiver()

    jest.advanceTimersByTime(500)

    // まだカウントされていない.
    expect(sended).toBeFalsy()

    jest.advanceTimersByTime(500)
    expect((await i.next()).done).toBeTruthy()

    expect(sended).toBeTruthy()

    expect(mockSetTimeout).toBeCalledTimes(1)
    expect(mockClearTimeout).toBeCalledTimes(0)
    expect(mockSetTimeout.mock.calls[0][1]).toEqual(1000)

    cancel()
  })

  it('should reject in generator', async () => {
    jest.useFakeTimers()
    const [p, cancel] = timeoutPromise(10)
    const g = beatsGenerator(p, { timeout: 1000, count: 1 })

    let rejectedReason: any = undefined

    const i = g.next().catch((r) => {
      rejectedReason = r
    })

    jest.advanceTimersByTime(10)

    // await Promise.resolve()
    await i
    expect(rejectedReason).not.toBeUndefined()

    cancel()
  })

  it('should clear timer when cancel while waiting', async () => {
    // jest.useFakeTimers()
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')
    const [p, cancel] = emptyPromise()
    const g = beatsGenerator(p, { timeout: 1000 })

    // 途中で待機させる.
    const partial = g.next()
    // 確実に generator 内部の wait を実行させる.
    await new Promise<void>((resolve) => setImmediate(() => resolve()))

    // clearTimeout
    cancel()

    expect((await partial).done).toBeTruthy()

    expect(mockSetTimeout).toBeCalledTimes(1)
    expect(mockClearTimeout).toBeCalledTimes(1)
    expect(mockSetTimeout.mock.calls[0][1]).toEqual(1000)

    cancel()
  })

  it('should accept timeout is zero', async () => {
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')

    const [p, cancel] = emptyPromise()
    const g = beatsGenerator(p, { timeout: 0, count: 3 })

    expect((await g.next()).value).toEqual(0)
    expect((await g.next()).value).toEqual(1)
    let v = await g.next()
    expect(v.value).toEqual(2) // done のときにもカウントが返ってくる.
    expect(v.done).toBeTruthy()

    expect(mockSetTimeout).toBeCalledTimes(3)
    expect(mockClearTimeout).toBeCalledTimes(0)
    expect(mockSetTimeout.mock.calls[0][1]).toEqual(0)

    cancel()
  })
})

describe('rotateGenerator()', () => {
  it('should rotate values by generator', async () => {
    jest.useFakeTimers()
    const c = new Chan<string>()

    const [p, cancel] = emptyPromise()
    const g = rotateGenerator(p, ['a', 'b', 'c'], { timeout: 1000 })
    ;(async () => {
      let cnt = 0
      for await (let i of g) {
        c.send(i)
        if (cnt === 6) {
          cancel()
        }
        cnt++
      }
      c.close()
    })()
    const i = c.receiver()

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('a')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('b')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('c')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('a')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('b')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('c')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('a')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('b')

    // jest.advanceTimersByTime(1000) // 終了時は待たない.
    expect((await i.next()).done).toBeTruthy()

    cancel()
  })

  it('should exit generator by counter', async () => {
    jest.useFakeTimers()
    const c = new Chan<string>()

    const [p, cancel] = emptyPromise()
    const g = rotateGenerator(p, ['a', 'b', 'c'], { timeout: 1000, count: 4 })
    ;(async () => {
      let cnt = 0
      for await (let i of g) {
        c.send(i)
        cnt++
      }
      c.close()
    })()
    const i = c.receiver()

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('a')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('b')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('c')

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual('a')

    expect((await i.next()).done).toBeTruthy()

    cancel()
  })

  it('should not generate value when empty array passed', async () => {
    jest.useFakeTimers()
    const [p, cancel] = emptyPromise()
    const g = rotateGenerator(p, [], { timeout: 1000 })
    expect((await g.next()).done).toBeTruthy()
    cancel()
  })
})

describe('fromReadableStreamGenerator()', () => {
  it('should make generator from NodeJS.readableStream', async () => {
    const tbl = ['a', 'b', 'c', 'd', 'e']
    const rs = Readable.from(tbl)
    const rec: string[] = []
    for await (let i of fromReadableStreamGenerator(rs)) {
      rec.push(i.toString('utf-8'))
    }
    expect(rec).toEqual(tbl)
  })
  it('should reject by NodeJS.readableStream', async () => {
    async function* gen() {
      yield 'a'
      yield 'b'
      yield Promise.reject('rejected')
    }
    const rs = Readable.from(gen())
    const rec: string[] = []
    let rejected: any
    try {
      for await (let i of fromReadableStreamGenerator(rs)) {
        rec.push(i.toString('utf-8'))
      }
    } catch (e) {
      rejected = e
    }
    expect(rejected).toEqual('rejected')
  })
  // https://developer.mozilla.org/ja/docs/Web/API/Streams_API
  // こちらの ReadableStream でのテストはできていない.
  // it('should make generator from (dom) ReadableStream', async () => {
  // })
})

describe('breakGenerator()', () => {
  it('should return by normal end', async () => {
    let f = false
    async function* gen() {
      try {
        yield 0
        yield 1
        yield 2
      } finally {
        f = true
      }
    }
    const [cancelPromise, cancel] = emptyPromise()
    const g = breakGenerator(cancelPromise, gen(), 10 as any)

    expect(await g.next()).toEqual({ done: false, value: 0 })
    expect(await g.next()).toEqual({ done: false, value: 1 })
    expect(await g.next()).toEqual({ done: false, value: 2 })
    expect(await g.next()).toEqual({ done: true, value: undefined })
    expect(f).toBeTruthy()
    cancel()
    await cancelPromise.catch(() => {})
    expect(await g.next()).toEqual({ done: true, value: undefined })
  })
  it('should return by cancel', async () => {
    let f = false
    async function* gen() {
      try {
        yield 0
        yield 1
        yield 2
      } finally {
        f = true
      }
    }
    const [cancelPromise, cancel] = emptyPromise()
    const g = breakGenerator(cancelPromise, gen(), 10 as any)

    expect(await g.next()).toEqual({ done: false, value: 0 })
    expect(await g.next()).toEqual({ done: false, value: 1 })
    cancel()
    await cancelPromise.catch(() => {})
    expect(await g.next()).toEqual({ done: true, value: 10 })
    expect(f).toBeTruthy()
    expect(await g.next()).toEqual({ done: true, value: undefined })
  })
  it('should return by cancel before first next()', async () => {
    let f = false
    async function* gen() {
      try {
        yield 0
        yield 1
        yield 2
      } finally {
        f = true
      }
    }
    const [cancelPromise, cancel] = emptyPromise()
    const g = breakGenerator(cancelPromise, gen(), 10 as any)

    cancel()
    await cancelPromise.catch(() => {})
    expect(await g.next()).toEqual({ done: true, value: 10 })
    expect(f).toBeTruthy()
    expect(await g.next()).toEqual({ done: true, value: undefined })
  })
  it('should return by abort', async () => {
    let f = false
    async function* gen() {
      try {
        yield 0
        yield 1
        yield 2
      } finally {
        f = true
      }
    }
    const [signal, abort] = getSignalAndAbort()
    const [cancelPromise, cancel] = abortPromise(signal)
    const g = breakGenerator(cancelPromise, gen(), 10 as any)

    expect(await g.next()).toEqual({ done: false, value: 0 })
    expect(await g.next()).toEqual({ done: false, value: 1 })
    abort()
    await cancelPromise.catch(() => {})
    expect(await g.next()).toEqual({ done: true, value: 10 })
    expect(f).toBeTruthy()
    expect(await g.next()).toEqual({ done: true, value: undefined })
    cancel()
  })
})
