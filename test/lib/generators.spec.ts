import { jest } from '@jest/globals'
import { Chan } from '../../src/lib/chan.js'
import { beatsGenerator, rotateGenerator } from '../../src/lib/generators.js'

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

describe('beatsGenerator()', () => {
  it('should generate values by generator', async () => {
    jest.useFakeTimers()
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')
    const c = new Chan<number>()
    const [g, cancel] = beatsGenerator({ timeout: 1000 })
    ;(async () => {
      // 別の async function で待つと timer が実行される?
      // 以下のように直接待つと実行されない.
      // jest.advanceTimersByTime(1000)
      // expect((await g.next()).value).toEqual(1)
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

    jest.advanceTimersByTime(1000)
    expect((await i.next()).done).toBeTruthy()

    expect(mockSetTimeout).toBeCalledTimes(5)
    expect(mockClearTimeout).toBeCalledTimes(0) // timer はすべて実行されているので clear は実行されない.
    expect(mockSetTimeout.mock.calls[0][1]).toEqual(1000)
  })

  it('should exit generator by counter', async () => {
    jest.useFakeTimers()
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')
    const c = new Chan<number>()
    const [g] = beatsGenerator({ timeout: 1000, count: 3 })
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
  })

  it('should wait timer when count passed 1', async () => {
    jest.useFakeTimers()
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')
    const c = new Chan<number>()
    const [g] = beatsGenerator({ timeout: 1000, count: 1 })
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
  })

  it('should clear timer when cancel while waiting', async () => {
    // jest.useFakeTimers()
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')
    const [g, cancel] = beatsGenerator({ timeout: 1000 })

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
  })

  it('should accept timeout is zero', async () => {
    const mockSetTimeout = jest.spyOn(global, 'setTimeout')
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout')

    const [g] = beatsGenerator({ timeout: 0, count: 3 })

    expect((await g.next()).value).toEqual(0)
    expect((await g.next()).value).toEqual(1)
    let v = await g.next()
    expect(v.value).toEqual(2) // done のときにもカウントが返ってくる.
    expect(v.done).toBeTruthy()

    expect(mockSetTimeout).toBeCalledTimes(3)
    expect(mockClearTimeout).toBeCalledTimes(0)
    expect(mockSetTimeout.mock.calls[0][1]).toEqual(0)
  })
})

describe('rotateGenerator()', () => {
  it('should rotate values by generator', async () => {
    jest.useFakeTimers()
    const c = new Chan<string>()
    const [g, cancel] = rotateGenerator(['a', 'b', 'c'], { timeout: 1000 })
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
  })

  it('should exit generator by counter', async () => {
    jest.useFakeTimers()
    const c = new Chan<string>()
    const [g] = rotateGenerator(['a', 'b', 'c'], { timeout: 1000, count: 4 })
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
  })

  it('should not generate value when empty array passed', async () => {
    jest.useFakeTimers()
    const [g] = rotateGenerator([], { timeout: 1000 })
    expect((await g.next()).done).toBeTruthy()
  })
})