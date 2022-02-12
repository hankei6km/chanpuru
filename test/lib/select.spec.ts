import { jest } from '@jest/globals'
import { Chan } from '../../src/lib/chan.js'
import { select, beatsGenerator } from '../../src/lib/select.js'

const genTimerPromise: (tag: string, timeout: number[]) => Promise<string>[] = (
  tag,
  timeout
) =>
  timeout.map(
    (t, i) =>
      new Promise((resolve) => setTimeout(() => resolve(`${tag}-${i}`), t))
  )

afterEach(() => {
  jest.useRealTimers()
})

describe('beatsGenerator()', () => {
  it('should count by timer', async () => {
    jest.useFakeTimers()
    const c = new Chan<number>()
    const g = beatsGenerator(1000)
    let cnt = 0
    ;(async () => {
      let done = false
      while (!(await g.next(done)).done) {
        cnt++
        c.send(cnt)
        if (cnt === 3) {
          done = true
        }
      }
      c.close()
    })()
    const i = c.receiver()
    expect(cnt).toEqual(0)

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual(1)

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual(2)

    jest.advanceTimersByTime(1000)
    expect((await i.next()).value).toEqual(3)

    jest.advanceTimersByTime(1000)
    expect((await i.next()).done).toBeTruthy()
  })
})

describe('select()', () => {
  it('should select all items', async () => {
    jest.useFakeTimers()
    const p1 = genTimerPromise('1', [1000, 3000, 5000, 7000])
    const c1 = new Chan<Promise<string>>()
    const i1 = c1.receiver()
    ;(async () => {
      for (let p of p1) {
        await c1.send(p)
      }
      c1.close()
    })()
    const res: [string, IteratorResult<Awaited<string>, void>][] = []
    jest.advanceTimersByTime(1000)
    for await (let s of select<Awaited<string>>({ one: i1 })) {
      res.push(s)
      jest.advanceTimersByTime(2000)
    }
    expect(res.length).toEqual(5)
    expect(res[0]).toEqual(['one', { value: '1-0', done: false }])
    expect(res[1]).toEqual(['one', { value: '1-1', done: false }])
    expect(res[2]).toEqual(['one', { value: '1-2', done: false }])
    expect(res[3]).toEqual(['one', { value: '1-3', done: false }])
    expect(res[4]).toEqual(['one', { value: undefined, done: true }])
  })

  it('should select all items(multiple)', async () => {
    jest.useFakeTimers()
    const p1 = genTimerPromise('1', [1000, 3000, 5000, 7000])
    const p2 = genTimerPromise('2', [2000, 4000, 6000, 8000])
    const c1 = new Chan<Promise<string>>()
    const i1 = c1.receiver()
    const c2 = new Chan<Promise<string>>()
    const i2 = c2.receiver()
    ;(async () => {
      for (let p of p1) {
        await c1.send(p)
      }
      c1.close()
    })()
    ;(async () => {
      for (let p of p2) {
        await c2.send(p)
      }
      c2.close()
    })()
    const res: [string, IteratorResult<Awaited<string>, void>][] = []
    jest.advanceTimersByTime(1000)
    for await (let s of select<Awaited<string>>({ one: i1, two: i2 })) {
      res.push(s)
      jest.advanceTimersByTime(1000)
    }
    expect(res.length).toEqual(10)
    expect(res[0]).toEqual(['one', { value: '1-0', done: false }])
    expect(res[1]).toEqual(['two', { value: '2-0', done: false }])
    expect(res[2]).toEqual(['one', { value: '1-1', done: false }])
    expect(res[3]).toEqual(['two', { value: '2-1', done: false }])
    expect(res[4]).toEqual(['one', { value: '1-2', done: false }])
    expect(res[5]).toEqual(['two', { value: '2-2', done: false }])
    expect(res[6]).toEqual(['one', { value: '1-3', done: false }])
    expect(res[7]).toEqual(['two', { value: '2-3', done: false }])
    expect(res[8]).toEqual(['one', { value: undefined, done: true }])
    expect(res[9]).toEqual(['two', { value: undefined, done: true }])
  })

  it('should catch rejected error', async () => {
    jest.useFakeTimers()
    const pp = genTimerPromise('1', [1000, 2000, 3000, 4000, 5000, 6000])
    const p1 = [...pp.slice(0, 4), Promise.reject('rejected'), ...pp.slice(4)]
    const c1 = new Chan<Promise<string>>(0, { rejectInReceiver: true })
    const i1 = c1.receiver()
    let sendErr: any = undefined
    let selectErr: any
    ;(async () => {
      for (let p of p1) {
        p.catch((r) => (sendErr = r))
        if (sendErr !== undefined) {
          break
        }
        await c1.send(p)
      }
      c1.close()
    })()
    const res: [string, IteratorResult<Awaited<string>, void>][] = []
    jest.advanceTimersByTime(1000)
    try {
      for await (let s of select<Awaited<string>>({ one: i1 })) {
        res.push(s)
        jest.advanceTimersByTime(1000)
      }
    } catch (r) {
      selectErr = r
    }
    expect(res.length).toEqual(5)
    expect(res[0]).toEqual(['one', { value: '1-0', done: false }])
    expect(res[1]).toEqual(['one', { value: '1-1', done: false }])
    expect(res[2]).toEqual(['one', { value: '1-2', done: false }])
    expect(res[3]).toEqual(['one', { value: '1-3', done: false }])
    expect(res[4]).toEqual(['one', { value: undefined, done: true }])
    expect(sendErr).toEqual('rejected')
    expect(selectErr).toEqual(undefined)
  })

  it('should catch rejected error(multiple)', async () => {
    jest.useFakeTimers()
    const p1 = genTimerPromise(
      '1',
      [1000, 3000, 5000, 7000, 9000, 11000, 13000]
    )
    const pp = genTimerPromise('2', [2000, 4000, 6000, 8000, 10000, 12000])
    const p2 = [...pp.slice(0, 4), Promise.reject('rejected'), ...pp.slice(4)]
    const c1 = new Chan<Promise<string>>(0, { rejectInReceiver: true })
    const i1 = c1.receiver()
    const c2 = new Chan<Promise<string>>(0, { rejectInReceiver: true })
    const i2 = c2.receiver()
    let sendErr: any = undefined
    let selectErr: any
    ;(async () => {
      for (let p of p1) {
        p.catch((r) => (sendErr = r))
        if (sendErr !== undefined) {
          break
        }
        await c1.send(p)
      }
      c1.close()
    })()
    ;(async () => {
      for (let p of p2) {
        p.catch((r) => (sendErr = r))
        if (sendErr !== undefined) {
          break
        }
        await c2.send(p)
      }
      c2.close()
    })()
    const res: [string, IteratorResult<Awaited<string>, void>][] = []
    jest.advanceTimersByTime(1000)
    try {
      for await (let s of select<Awaited<string>>({ one: i1, two: i2 })) {
        res.push(s)
        jest.advanceTimersByTime(1000)
      }
    } catch (r) {
      selectErr = r
    }
    expect(res.length).toEqual(11)
    expect(res[0]).toEqual(['one', { value: '1-0', done: false }])
    expect(res[1]).toEqual(['two', { value: '2-0', done: false }])
    expect(res[2]).toEqual(['one', { value: '1-1', done: false }])
    expect(res[3]).toEqual(['two', { value: '2-1', done: false }])
    expect(res[4]).toEqual(['one', { value: '1-2', done: false }])
    expect(res[5]).toEqual(['two', { value: '2-2', done: false }])
    expect(res[6]).toEqual(['one', { value: '1-3', done: false }])
    expect(res[7]).toEqual(['two', { value: '2-3', done: false }])
    expect(res[8]).toEqual(['one', { value: '1-4', done: false }])
    expect(res[9]).toEqual(['two', { value: undefined, done: true }])
    expect(res[10]).toEqual(['one', { value: undefined, done: true }])
    expect(sendErr).toEqual('rejected')
    expect(selectErr).toEqual(undefined)
  })

  it('should select items continue when rejected', async () => {
    jest.useFakeTimers()
    const pp = genTimerPromise('1', [1000, 2000, 3000, 4000, 5000, 6000])
    const p1 = [...pp.slice(0, 3), Promise.reject('rejected'), ...pp.slice(3)]
    const c1 = new Chan<Promise<string>>()
    const i1 = c1.receiver()
    let sendErr: any = undefined
    let selectErr: any
    ;(async () => {
      for (let p of p1) {
        p.catch((r) => (sendErr = r))
        await c1.send(p)
      }
      c1.close()
    })()
    const res: [string, IteratorResult<Awaited<string>, void>][] = []
    jest.advanceTimersByTime(1000)
    try {
      for await (let s of select<Awaited<string>>({ one: i1 })) {
        res.push(s)
        jest.advanceTimersByTime(1000)
      }
    } catch (r) {
      selectErr = r
    }
    expect(res.length).toEqual(7)
    expect(res[0]).toEqual(['one', { value: '1-0', done: false }])
    expect(res[1]).toEqual(['one', { value: '1-1', done: false }])
    expect(res[2]).toEqual(['one', { value: '1-2', done: false }])
    expect(res[3]).toEqual(['one', { value: '1-3', done: false }])
    expect(res[4]).toEqual(['one', { value: '1-4', done: false }])
    expect(res[5]).toEqual(['one', { value: '1-5', done: false }])
    expect(res[6]).toEqual(['one', { value: undefined, done: true }])
    expect(sendErr).toEqual('rejected')
    expect(selectErr).toEqual(undefined)
  })
})

// fakeTimers だと beatsGenerator の setTimeout が反応しないので一旦保留.
// describe('beatsGenerator(), select()', () => {
//   it('should receive all items from both chan and beats', async () => {
//     jest.useFakeTimers()
//     const g = beatsGenerator(500)
//     const c = new Chan<Promise<string>>()
//     const i = c.receiver()
//     const pa = genTimerPromise('1', [1000, 2000, 3000, 4000])
//     ;(async () => {
//       for (let p of pa) {
//         await c.send(p)
//       }
//       c.close()
//       await Promise.all(pa)
//       await g.next(true)
//     })()
//     const res: [string, IteratorResult<Promise<string> | void, void>][] = []
//
//     jest.advanceTimersByTime(500)
//     for await (let s of select<Promise<string> | void, void, boolean | void>({
//       one: i,
//       default: g
//     })) {
//       res.push(s)
//       jest.advanceTimersByTime(500)
//     }
//     expect(res.length).toEqual(14)
//     expect(res[0]).toEqual(['default', { value: undefined, done: false }])
//     expect(res[1]).toEqual(['one', { value: '1-0', done: false }])
//     expect(res[2]).toEqual(['default', { value: undefined, done: false }])
//     expect(res[3]).toEqual(['default', { value: undefined, done: false }])
//     expect(res[4]).toEqual(['one', { value: '1-1', done: false }])
//     expect(res[5]).toEqual(['default', { value: undefined, done: false }])
//     expect(res[6]).toEqual(['default', { value: undefined, done: false }])
//     expect(res[7]).toEqual(['one', { value: '1-2', done: false }])
//     expect(res[8]).toEqual(['default', { value: undefined, done: false }])
//     expect(res[9]).toEqual(['default', { value: undefined, done: false }])
//     expect(res[10]).toEqual(['one', { value: '1-3', done: false }])
//     expect(res[11]).toEqual(['one', { value: undefined, done: true }])
//     expect(res[12]).toEqual(['default', { value: undefined, done: false }])
//     expect(res[13]).toEqual(['default', { value: undefined, done: true }])
//   })
// })
