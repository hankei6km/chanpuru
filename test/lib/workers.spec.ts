import { jest } from '@jest/globals'
import { Chan, ChanSend } from '../../src/lib/chan.js'
import { workers, payloads } from '../../src/lib/workers.js'

class RecordMax {
  private max = 0
  private cur = 0
  constructor() {}
  start() {
    this.cur++
    if (this.cur > this.max) {
      this.max = this.cur
    }
  }
  done() {
    this.cur--
  }
  record() {
    return this.max
  }
}

type Src = [string, 'f' | 'r', number]
const genPromise: (max: RecordMax, s: Src) => Promise<string> = (
  max,
  [value, kind, timeout]
) => {
  max.start()
  if (kind === 'r') {
    return new Promise((_resolve, reject) =>
      setTimeout(() => {
        max.done()
        reject(value)
      }, timeout)
    )
  }
  return new Promise((resolve) =>
    setTimeout(() => {
      max.done()
      resolve(value)
    }, timeout)
  )
}
const src: () => Src[] = () => [
  ['a', 'f', 200],
  ['b', 'f', 400],
  ['c', 'f', 300],
  ['d', 'f', 120],
  ['e', 'f', 600],
  ['f', 'f', 80]
]
const rsrc: () => Src[] = () => [
  ['a', 'f', 200],
  ['b', 'f', 400],
  ['c', 'f', 300],
  ['d', 'r', 120],
  ['e', 'f', 600],
  ['f', 'f', 80]
]

afterEach(() => {
  jest.useRealTimers()
})

describe('workers()', () => {
  it('should receive all items', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const c = new Chan<() => Promise<string>>(0)
    ;(async () => {
      for (let s of src()) {
        await c.send(() => genPromise(r, s))
      }
      c.close()
    })()

    const recv = workers(3, c.receiver())

    const rec: string[] = []
    for await (let i of recv) {
      rec.push(i)
    }
    timerUpdate = false

    expect(rec).toEqual(['a', 'c', 'd', 'b', 'f', 'e'])
    expect(r.record()).toEqual(3)
  })

  it('should receive all items(keep order)', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const c = new Chan<() => Promise<string>>(0)
    ;(async () => {
      for (let s of src()) {
        await c.send(() => genPromise(r, s))
      }
      c.close()
    })()

    const recv = workers(3, c.receiver(), { keepOrder: true })

    const rec: string[] = []
    for await (let i of recv) {
      rec.push(i)
    }
    timerUpdate = false

    expect(rec).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(r.record()).toEqual(3)
  })

  it('should receive all items(max=1)', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const c = new Chan<() => Promise<string>>(0)
    ;(async () => {
      for (let s of src()) {
        await c.send(() => genPromise(r, s))
      }
      c.close()
    })()

    const recv = workers(1, c.receiver())

    const rec: string[] = []
    for await (let i of recv) {
      rec.push(i)
    }
    timerUpdate = false

    expect(rec).toEqual(['a', 'b', 'c', 'd', 'e', 'f']) // worker が 1 なので順番は変動しない.
    expect(r.record()).toEqual(1)
  })

  it('should receive all items(max=4)', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(2)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const c = new Chan<() => Promise<string>>(0)
    ;(async () => {
      for (let s of src()) {
        await c.send(() => genPromise(r, s))
      }
      c.close()
    })()

    const recv = workers(4, c.receiver())

    const rec: string[] = []
    for await (let i of recv) {
      rec.push(i)
    }
    timerUpdate = false

    expect(rec).toEqual(['d', 'a', 'f', 'c', 'b', 'e'])
    expect(r.record()).toEqual(4)
  })

  it('should receive all items(keep order, max=4)', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const c = new Chan<() => Promise<string>>(0)
    ;(async () => {
      for (let s of src()) {
        await c.send(() => genPromise(r, s))
      }
      c.close()
    })()

    const recv = workers(4, c.receiver(), { keepOrder: true })

    const rec: string[] = []
    for await (let i of recv) {
      rec.push(i)
    }
    timerUpdate = false

    expect(rec).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(r.record()).toEqual(4)
  })

  it('should receive all items(long)', async () => {
    const r = new RecordMax()
    const l = new Array(500).fill('').map((_v, i) => `${i}`)

    const c = new Chan<() => Promise<string>>(0)
    ;(async () => {
      for (let s of l) {
        await c.send(() => genPromise(r, [s, 'f', s.endsWith('0') ? 10 : 0]))
      }
      c.close()
    })()

    const recv = workers(3, c.receiver())

    const rec: string[] = []
    for await (let i of recv) {
      rec.push(i)
    }
    rec.sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))

    expect(rec).toEqual(l)
    expect(r.record()).toEqual(3)
  })

  it('should receive all items(keep order, long)', async () => {
    const r = new RecordMax()
    const l = new Array(500).fill('').map((_v, i) => `${i}`)

    const c = new Chan<() => Promise<string>>(0)
    ;(async () => {
      for (let s of l) {
        await c.send(() => genPromise(r, [s, 'f', s.endsWith('0') ? 10 : 0]))
      }
      c.close()
    })()

    const recv = workers(3, c.receiver(), { keepOrder: true })

    const rec: string[] = []
    for await (let i of recv) {
      rec.push(i)
    }
    // rec.sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))

    expect(rec).toEqual(l)
    expect(r.record()).toEqual(3)
  })

  it('should close without reject receiver side', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const c = new Chan<() => Promise<string>>(0)
    let err: any = undefined
    ;(async () => {
      for (let s of rsrc()) {
        await c.send(() => {
          const p = genPromise(r, s)
          p.catch((r) => {
            err = r
          })
          return p
        })
        if (err !== undefined) {
          break
        }
      }
      c.close()
    })()

    const recv = workers(4, c.receiver())

    const rec: string[] = []
    for await (let i of recv) {
      rec.push(i)
    }
    timerUpdate = false

    expect(rec).toEqual(['a', 'c', 'b'])
    expect(err).toEqual('d')
    expect(r.record()).toEqual(4)
  })

  it('should close without reject receiver side(keep order)', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const c = new Chan<() => Promise<string>>(0)
    let err: any = undefined
    ;(async () => {
      for (let s of rsrc()) {
        await c.send(() => {
          const p = genPromise(r, s)
          p.catch((r) => {
            err = r
          })
          return p
        })
        if (err !== undefined) {
          break
        }
      }
      c.close()
    })()

    const recv = workers(4, c.receiver(), { keepOrder: true })

    const rec: string[] = []
    for await (let i of recv) {
      rec.push(i)
    }
    timerUpdate = false

    expect(rec).toEqual(['a', 'b', 'c'])
    expect(err).toEqual('d')
    expect(r.record()).toEqual(4)
  })
})

describe('payloads()', () => {
  it('should receive all items with payload', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const ch = new Chan<[() => Promise<string>, string]>(0)

    const recResp: string[] = []
    ;(async () => {
      for (let s of src()) {
        await ch.send([() => genPromise(r, s), s[0].toUpperCase()])
      }
      ch.close()
    })()

    const recv = payloads(3, ch.receiver())

    const rec: string[] = []
    for await (let [value, payload] of recv) {
      rec.push(`${value}${payload}`)
    }
    timerUpdate = false

    expect(rec).toEqual(['aA', 'cC', 'dD', 'bB', 'fF', 'eE'])
    expect(r.record()).toEqual(3)
  })

  it('should receive all items with payload(keep oredr)', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const ch = new Chan<[() => Promise<string>, string]>(0)

    const recResp: string[] = []
    ;(async () => {
      for (let s of src()) {
        await ch.send([() => genPromise(r, s), s[0].toUpperCase()])
      }
      ch.close()
    })()

    const recv = payloads(3, ch.receiver(), { keepOrder: true })

    const rec: string[] = []
    for await (let [value, payload] of recv) {
      rec.push(`${value}${payload}`)
    }
    timerUpdate = false

    expect(rec).toEqual(['aA', 'bB', 'cC', 'dD', 'eE', 'fF'])
    expect(r.record()).toEqual(3)
  })

  it('should close without reject receiver side', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const ch = new Chan<[() => Promise<string>, string]>(0)

    const recResp: string[] = []
    let err: any = undefined
    ;(async () => {
      for (let s of rsrc()) {
        await ch.send([
          () => {
            const p = genPromise(r, s)
            p.catch((r) => {
              err = r
            })
            return p
          },
          s[0].toUpperCase()
        ])
        if (err !== undefined) {
          break
        }
      }
      ch.close()
    })()

    const recv = payloads(3, ch.receiver())

    const rec: string[] = []
    for await (let [value, payload] of recv) {
      rec.push(`${value}${payload}`)
    }
    timerUpdate = false

    expect(rec).toEqual(['aA', 'cC', 'bB'])
    expect(err).toEqual('d')
    expect(r.record()).toEqual(3)
  })

  it('should close without reject receiver side(keep order)', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const ch = new Chan<[() => Promise<string>, string]>(0)

    const recResp: string[] = []
    let err: any = undefined
    ;(async () => {
      for (let s of rsrc()) {
        await ch.send([
          () => {
            const p = genPromise(r, s)
            p.catch((r) => {
              err = r
            })
            return p
          },
          s[0].toUpperCase()
        ])
        if (err !== undefined) {
          break
        }
      }
      ch.close()
    })()

    const recv = payloads(3, ch.receiver(), { keepOrder: true })

    const rec: string[] = []
    for await (let [value, payload] of recv) {
      rec.push(`${value}${payload}`)
    }
    timerUpdate = false

    expect(rec).toEqual(['aA', 'bB', 'cC'])
    expect(err).toEqual('d')
    expect(r.record()).toEqual(3)
  })

  it('should receive response from promise', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const ch = new Chan<
      [() => Promise<string>, (resp: string) => Promise<string>]
    >(0)

    const recResp: string[] = []
    ;(async () => {
      for (let s of src()) {
        await ch.send([
          () => genPromise(r, s),
          (resp: string) =>
            new Promise<string>((resolve) => resolve(resp)).then((v) => {
              recResp.push(v)
              return v
            })
        ])
      }
      ch.close()
    })()

    const recv = payloads(3, ch.receiver())

    const rec: string[] = []
    for await (let [value, resp] of recv) {
      rec.push(value)
      await resp(value.toUpperCase())
    }
    timerUpdate = false

    expect(rec).toEqual(['a', 'c', 'd', 'b', 'f', 'e'])
    expect(recResp).toEqual(['A', 'C', 'D', 'B', 'F', 'E'])
    expect(r.record()).toEqual(3)
  })

  it('should receive response from promise(keep order)', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const ch = new Chan<
      [() => Promise<string>, (resp: string) => Promise<string>]
    >(0)

    const recResp: string[] = []
    ;(async () => {
      for (let s of src()) {
        await ch.send([
          () => genPromise(r, s),
          (resp: string) =>
            new Promise<string>((resolve) => resolve(resp)).then((v) => {
              recResp.push(v)
              return v
            })
        ])
      }
      ch.close()
    })()

    const recv = payloads(3, ch.receiver(), { keepOrder: true })

    const rec: string[] = []
    for await (let [value, resp] of recv) {
      rec.push(value)
      await resp(value.toUpperCase())
    }
    timerUpdate = false

    expect(rec).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(recResp).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(r.record()).toEqual(3)
  })

  it('should receive response from channle', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const respCh = new Chan<string>()
    const ch = new Chan<[() => Promise<string>, typeof respCh['send']]>(0)

    const recResp: string[] = []
    ;(async () => {
      ;(async () => {
        for await (let i of respCh.receiver()) {
          recResp.push(i)
        }
      })()
      for (let s of src()) {
        await ch.send([() => genPromise(r, s), respCh.send])
      }
      ch.close()
    })()

    const recv = payloads(3, ch.receiver())

    const rec: string[] = []
    for await (let [value, errSend] of recv) {
      rec.push(value)
      if (value === 'd') {
        await errSend('D')
      }
    }

    respCh.close() // respCh のクローズが離れているのは面白くない.

    timerUpdate = false

    expect(rec).toEqual(['a', 'c', 'd', 'b', 'f', 'e'])
    expect(recResp).toEqual(['D'])
    expect(r.record()).toEqual(3)
  })

  it('should receive response from channle(keep order)', async () => {
    jest.useFakeTimers()
    let timerUpdate = true
    ;(async () => {
      while (timerUpdate) {
        jest.advanceTimersByTime(5)
        await new Promise<void>((resolve) => resolve())
      }
    })()
    const r = new RecordMax()

    const respCh = new Chan<string>()
    const ch = new Chan<[() => Promise<string>, typeof respCh['send']]>(0)

    const recResp: string[] = []
    ;(async () => {
      ;(async () => {
        for await (let i of respCh.receiver()) {
          recResp.push(i)
        }
      })()
      for (let s of src()) {
        await ch.send([() => genPromise(r, s), respCh.send])
      }
      ch.close()
    })()

    const recv = payloads(3, ch.receiver(), { keepOrder: true })

    const rec: string[] = []
    for await (let [value, errSend] of recv) {
      rec.push(value)
      if (value === 'd') {
        await errSend('D')
      }
    }

    respCh.close()

    timerUpdate = false

    expect(rec).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(recResp).toEqual(['D'])
    expect(r.record()).toEqual(3)
  })
})
