import { jest } from '@jest/globals'
import { Chan } from '../../src/lib/chan.js'
import { select } from '../../src/lib/select.js'

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
    expect(res[7]).toEqual(['one', { value: undefined, done: true }])
    expect(res[8]).toEqual(['two', { value: '2-3', done: false }])
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

  it('should call return of each generators that is not done', async () => {
    let gen1f = false
    async function* gen1() {
      try {
        yield 10
        yield 20
        yield 30
        yield 40
      } finally {
        gen1f = true
      }
    }
    let gen2f = false
    async function* gen2() {
      try {
        yield 100
      } finally {
        gen2f = true
      }
    }
    let gen3f = false
    async function* gen3() {
      try {
        yield 100
        yield 200
        yield 300
      } finally {
        gen3f = true
      }
    }

    const g1 = gen1()
    const g2 = gen2()
    const g3 = gen3()
    const sg = select({ g1, g2, g3 })

    expect(await sg.next()).toEqual({
      value: ['g1', { value: 10, done: false }],
      done: false
    })
    expect(gen1f).toBeFalsy()
    expect(gen2f).toBeFalsy()
    expect(gen3f).toBeFalsy()

    expect(await sg.next()).toEqual({
      value: ['g2', { value: 100, done: false }],
      done: false
    })
    expect(gen1f).toBeFalsy()
    expect(gen2f).toBeFalsy()
    expect(gen3f).toBeFalsy()

    expect(await sg.next()).toEqual({
      value: ['g3', { value: 100, done: false }],
      done: false
    })
    expect(gen1f).toBeFalsy()
    expect(gen2f).toBeTruthy() // この時点で gen2 内部では終了している、ただし select 側で継続.
    expect(gen3f).toBeFalsy()

    expect(await sg.next()).toEqual({
      value: ['g1', { value: 20, done: false }],
      done: false
    })
    expect(gen1f).toBeFalsy()
    expect(gen2f).toBeTruthy() // 同上
    expect(gen3f).toBeFalsy()

    expect(await sg.next()).toEqual({
      value: ['g2', { value: undefined, done: true }],
      done: false
    }) // ここでも select 側では継続(次の next() まで管理配列は更新されない).
    expect(gen1f).toBeFalsy()
    expect(gen2f).toBeTruthy()
    expect(gen3f).toBeFalsy()

    expect(await sg.next()).toEqual({
      value: ['g3', { value: 200, done: false }],
      done: false
    }) // ここで g2 が終了したことになる.
    expect(gen1f).toBeFalsy()
    expect(gen2f).toBeTruthy()
    expect(gen3f).toBeFalsy()

    expect(await sg.return(Infinity as any)).toEqual({
      value: Infinity,
      done: true
    })
    expect(gen1f).toBeTruthy()
    expect(gen2f).toBeTruthy()
    expect(gen3f).toBeTruthy()

    expect(await sg.next()).toEqual({
      value: undefined,
      done: true
    })
    expect(await g1.next()).toEqual({
      value: undefined,
      done: true
    })
    expect(await g2.next()).toEqual({
      value: undefined,
      done: true
    })
    expect(await g3.next()).toEqual({
      value: undefined,
      done: true
    })
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
