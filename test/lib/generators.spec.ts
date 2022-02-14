import { jest } from '@jest/globals'
import { Chan } from '../../src/lib/chan.js'
import { beatsGenerator } from '../../src/lib/generators.js'

// jest.useFakeTimers の後の spyOn でも戻さないと
// ReferenceError: setInterval is not defined になる.
// (今回は jest.useFakeTimers でない場合でも使っているでの戻す必要はある)
const saveSetInterval = global.setInterval
const saveClearInterval = global.clearInterval
afterEach(() => {
  jest.useRealTimers()
  global.setInterval = saveSetInterval
  global.clearInterval = saveClearInterval
})

describe('beatsGenerator()', () => {
  it('should generate values by generator', async () => {
    jest.useFakeTimers()
    const mockSetInterval = jest.spyOn(global, 'setInterval')
    const mockClearInterval = jest.spyOn(global, 'clearInterval')
    const c = new Chan<number>()
    const g = beatsGenerator({ interval: 1000 })
    ;(async () => {
      // 別の async function で待つと timer が実行される?
      // 以下のように直接待つと実行されない.
      // jest.advanceTimersByTime(1000)
      // expect((await g.next()).value).toEqual(1)
      for await (let cnt of g) {
        c.send(cnt)
        if (cnt === 3) {
          g.next(true)
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

    expect(mockSetInterval).toBeCalledTimes(1)
    expect(mockSetInterval).toBeCalledTimes(1)
    expect(mockSetInterval.mock.calls[0][1]).toEqual(1000)
    expect(mockClearInterval.mock.calls[0][0]).toEqual(
      mockSetInterval.mock.results[0].value
    )
  })

  it('should exit generator by counter', async () => {
    jest.useFakeTimers()
    const mockSetInterval = jest.spyOn(global, 'setInterval')
    const mockClearInterval = jest.spyOn(global, 'clearInterval')
    const c = new Chan<number>()
    const g = beatsGenerator({ interval: 1000, count: 3 })
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
    // この後の interval が 0 の方で検証している.
    jest.advanceTimersByTime(1000)
    expect((await i.next()).done).toBeTruthy()

    expect(mockSetInterval).toBeCalledTimes(1)
    expect(mockSetInterval).toBeCalledTimes(1)
    expect(mockSetInterval.mock.calls[0][1]).toEqual(1000)
    expect(mockClearInterval.mock.calls[0][0]).toEqual(
      mockSetInterval.mock.results[0].value
    )
  })

  it('should wait timer when count passed 1', async () => {
    jest.useFakeTimers()
    const mockSetInterval = jest.spyOn(global, 'setInterval')
    const mockClearInterval = jest.spyOn(global, 'clearInterval')
    const c = new Chan<number>()
    const g = beatsGenerator({ interval: 1000, count: 1 })
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

    expect(mockSetInterval).toBeCalledTimes(1)
    expect(mockSetInterval).toBeCalledTimes(1)
    expect(mockSetInterval.mock.calls[0][1]).toEqual(1000)
    expect(mockClearInterval.mock.calls[0][0]).toEqual(
      mockSetInterval.mock.results[0].value
    )
  })

  it('should accept interval is zero', async () => {
    const mockSetInterval = jest.spyOn(global, 'setInterval')
    const mockClearInterval = jest.spyOn(global, 'clearInterval')

    const g = beatsGenerator({ interval: 0, count: 3 })

    expect((await g.next()).value).toEqual(0)
    expect((await g.next()).value).toEqual(1)
    let v = await g.next()
    expect(v.value).toEqual(2) // done のときにもカウントが返ってくる.
    expect(v.done).toBeTruthy()

    expect(mockSetInterval).toBeCalledTimes(1)
    expect(mockSetInterval).toBeCalledTimes(1)
    expect(mockSetInterval.mock.calls[0][1]).toEqual(0)
    expect(mockClearInterval.mock.calls[0][0]).toEqual(
      mockSetInterval.mock.results[0].value
    )
  })
})
