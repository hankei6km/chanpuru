import { jest } from '@jest/globals'
import { ChanRace } from '../../src/lib/chan-race.js'

// https://stackoverflow.com/questions/43265944/is-there-any-way-to-mock-private-functions-with-jest
const mockBufReset = jest.spyOn(ChanRace.prototype as any, 'bufReset')
const mockBufRelease = jest.spyOn(ChanRace.prototype as any, 'bufRelease')
const mockValueReset = jest.spyOn(ChanRace.prototype as any, 'valueReset')
const mockValueRelease = jest.spyOn(ChanRace.prototype as any, 'valueRelease')

beforeEach(() => {
  mockBufReset.mockClear()
  mockBufRelease.mockClear()
  mockValueReset.mockClear()
  mockValueRelease.mockClear()
})

describe('ChanRace()', () => {
  const genPromiseResolve = function (
    s: string[]
  ): [Promise<string>, () => void, (e: any) => void][] {
    const ret: [Promise<string>, () => void, (e: any) => void][] = []
    s.forEach((f) => {
      let retResolve: (value: string) => void
      let retReject: (e: any) => void
      const p = new Promise<string>((resolve, reject) => {
        retResolve = resolve
        retReject = reject
      })
      ret.push([p, () => retResolve(f), (e: any) => retReject(e)])
    })
    return ret
  }
  const sortFunc = (a: string, b: string) => {
    const numA = Number.parseInt(a, 10)
    const numB = Number.parseInt(b, 10)
    return numA - numB
  }

  it('should claen when closed immediately', async () => {
    const c = new ChanRace<string>()
    c.close()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should reject when send to closed chan', async () => {
    const c = new ChanRace<string>()
    c.close()
    await expect(c.send(Promise.resolve('0'))).rejects.toThrow(
      'panic: send on closed channel'
    )

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive item that is sended after receive', async () => {
    const s = ['0']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>()
    setTimeout(async () => {
      ;(async () => await c.send(pr[0][0]))()
      pr[0][1]()
      c.close()
    }, 100)
    const i = c.receiver()
    expect((await i.next()).value).toEqual('0')
    expect((await i.next()).done).toBeTruthy()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive item that is sended after receive(parallel)', async () => {
    const s = ['0', '1']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3)
    setTimeout(async () => {
      ;(async () => {
        await c.send(pr[0][0])
        await c.send(pr[1][0])
        c.close()
      })()
      pr[0][1]()
      pr[1][1]()
    }, 100)
    const i = c.receiver()
    expect((await i.next()).value).toEqual('0')
    expect((await i.next()).value).toEqual('1')
    expect((await i.next()).done).toBeTruthy()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive item after send', async () => {
    const s = ['0']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>()
    ;(async () => {
      ;(async () => {
        await c.send(pr[0][0])
        c.close()
      })()
      pr[0][1]()
    })()

    const v: IteratorResult<string, void>[] = []
    await new Promise((resolve) => {
      setTimeout(async () => {
        const i = c.receiver()
        v.push(await i.next())
        v.push(await i.next())
        resolve(v)
      }, 100)
    })

    expect(v[0].value).toEqual('0')
    expect(v[1].done).toBeTruthy()
    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive item after send(parallel)', async () => {
    const s = ['0', '1']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3)
    ;(async () => {
      ;(async () => {
        await c.send(pr[0][0])
        await c.send(pr[1][0])
        c.close()
      })()
      pr[0][1]()
      pr[1][1]()
    })()

    const v: IteratorResult<string, void>[] = []
    await new Promise((resolve) => {
      setTimeout(async () => {
        const i = c.receiver()
        v.push(await i.next())
        v.push(await i.next())
        v.push(await i.next())
        resolve(v)
      }, 100)
    })

    expect(v[0].value).toEqual('0')
    expect(v[1].value).toEqual('1')
    expect(v[2].done).toBeTruthy()
    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should close when buffer is empty', async () => {
    const c = new ChanRace<string>()
    setTimeout(() => {
      c.close()
    }, 100)
    const i = c.receiver()
    expect((await i.next()).done).toBeTruthy()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should close when receive items the number of just bufSize', async () => {
    const s = ['0', '1']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(2)
    setTimeout(async () => {
      ;(async () => {
        await c.send(pr[0][0])
        await c.send(pr[1][0])
        c.close()
      })()
      pr[0][1]()
      pr[1][1]()
    }, 100)
    const i = c.receiver()
    expect((await i.next()).value).toEqual('0')
    expect((await i.next()).value).toEqual('1')
    expect((await i.next()).done).toBeTruthy()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should close when receive items the number of just bufSize-1', async () => {
    const s = ['0', '1']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3)
    setTimeout(async () => {
      ;(async () => {
        await c.send(pr[0][0])
        await c.send(pr[1][0])
        c.close()
      })()
      pr[0][1]()
      pr[1][1]()
    }, 100)
    const i = c.receiver()
    expect((await i.next()).value).toEqual('0')
    expect((await i.next()).value).toEqual('1')
    expect((await i.next()).done).toBeTruthy()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive all items', async () => {
    const s = ['0', '1', '2', '3', '4', '5']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>()
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.send(pr[i][0])
      }
      c.close()
    })()
    pr.forEach((p) => process.nextTick(() => p[1]()))
    setTimeout(() => pr[0][1](), 10)
    setTimeout(() => pr[1][1](), 100)
    setTimeout(() => pr[2][1](), 50)
    setTimeout(() => pr[3][1](), 150)
    setTimeout(() => pr[4][1](), 70)
    setTimeout(() => pr[5][1](), 110)
    const res: string[] = []
    for await (let v of c.receiver()) {
      res.push(v)
    }
    // res.sort(sortFunc)  // バッファーなしだと send 順にならぶ.
    expect(res).toEqual(s)

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive all items(parallel)', async () => {
    const s = ['0', '1', '2', '3', '4', '5']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(2)
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.send(pr[i][0])
      }
      c.close()
    })()
    setTimeout(() => pr[0][1](), 10)
    setTimeout(() => pr[1][1](), 100)
    setTimeout(() => pr[2][1](), 50)
    setTimeout(() => pr[3][1](), 150)
    setTimeout(() => pr[4][1](), 70)
    setTimeout(() => pr[5][1](), 110)
    const res: string[] = []
    for await (let v of c.receiver()) {
      res.push(v)
    }
    res.sort(sortFunc)

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
    expect(res).toEqual(s)
  })

  it('should receive all items(long)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3)
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.send(pr[i][0])
      }
      c.close()
    })()
    const rev = [...pr].reverse()
    const ps = [
      ...rev.slice(100, 200),
      ...rev.slice(0, 100),
      ...rev.slice(400, 500),
      ...rev.slice(300, 400),
      ...rev.slice(200, 300)
    ]
    ps.forEach(([_p, r]) => process.nextTick(() => r()))
    const res: string[] = []
    for await (let v of c.receiver()) {
      res.push(v)
    }
    res.sort(sortFunc)

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
    expect(res).toEqual(s)
  })

  it('should receive all items(multiple receive)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3)
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.send(pr[i][0])
      }
      c.close()
    })()
    const rev = [...pr].reverse()
    const ps = [
      ...rev.slice(100, 200),
      ...rev.slice(0, 100),
      ...rev.slice(400, 500),
      ...rev.slice(300, 400),
      ...rev.slice(200, 300)
    ]
    ps.forEach(([_p, r]) => process.nextTick(() => r()))
    const res: string[] = []
    let r1Cnt = 0
    let r2Cnt = 0
    const i = c.receiver()
    await Promise.all([
      new Promise<void>(async (resolve) => {
        for await (let v of i) {
          res.push(v)
          r1Cnt++
        }
        resolve()
      }),
      new Promise<void>(async (resolve) => {
        for await (let v of i) {
          res.push(v)
          r2Cnt++
        }
        resolve()
      })
    ])
    res.sort(sortFunc)
    expect(r1Cnt).toBeGreaterThan(0)
    expect(r2Cnt).toBeGreaterThan(0)
    expect(res).toEqual(s)

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive all items(multiple send)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3)
    const relaseResolve = new Array<(value: void) => void>(3)
    const promise = [
      new Promise((resolve) => {
        relaseResolve[0] = resolve
      }),
      new Promise((resolve) => {
        relaseResolve[1] = resolve
      }),
      new Promise((resolve) => {
        relaseResolve[2] = resolve
      })
    ]
    ;(async () => {
      for (let i = 0; i < 250; i++) {
        await c.send(pr[i][0])
      }
      relaseResolve[0]()
    })()
    ;(async () => {
      for (let i = 250; i < 400; i++) {
        await c.send(pr[i][0])
      }
      relaseResolve[1]()
    })()
    ;(async () => {
      for (let i = 400; i < len; i++) {
        await c.send(pr[i][0])
      }
      relaseResolve[2]()
    })()
    Promise.all(promise).then(() => c.close())
    pr.forEach(([_p, r]) => process.nextTick(() => r()))
    const res: string[] = []
    for await (let v of c.receiver()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(s)

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should block writing if the buffer is not allocated', async () => {
    const s = ['0', '1']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>()
    let done = [false, false]
    ;(async () => {
      await c.send(pr[0][0])
      done[0] = true
      await c.send(pr[1][0]) // バッファーがないのでブロックされる.
      done[1] = true
      c.close()
    })()
    const i = c.receiver()
    await (async () => {
      pr[0][1]()
      await i.next()
    })()
    expect(done[0]).toBeTruthy()
    expect(done[1]).toBeFalsy()

    pr[1][1]()
    await i.next()
    await i.next()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should returns immediately if the buffer is not full(short)', async () => {
    const s = ['0', '1']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(2)
    let done = [false, false]
    ;(async () => {
      await c.send(pr[0][0])
      done[0] = true
      await c.send(pr[1][0]) // バッファーが空いているのでブロックされない.
      done[1] = true
      c.close()
    })()
    const i = c.receiver()
    await (async () => {
      pr[0][1]()
      await i.next()
    })()
    expect(done[0]).toBeTruthy()
    expect(done[1]).toBeTruthy()

    pr[1][1]()
    await i.next()
    await i.next()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should returns immediately if the buffer is not full(long)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3)
    let cnt = 0
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.send(pr[i][0])
        cnt++
      }
      c.close()
    })()
    const rev = [...pr].reverse()
    const ps = [
      ...rev.slice(100, 200),
      ...rev.slice(0, 100),
      ...rev.slice(400, 500),
      ...rev.slice(300, 400),
      ...rev.slice(200, 300)
    ]
    ps.forEach(([_p, r]) => process.nextTick(() => r()))
    const i = c.receiver()
    expect(cnt).toEqual(0)
    await i.next()
    // 内部バッファーサイズ = 3、next でリリースされたので 1 回 send が成功.
    // generator 側の処理を変更すると send 成功前に戻ってくるので値は変動する.
    expect(cnt).toEqual(4)
    await i.next()
    await i.next()
    await i.next()
    await i.next()
    expect(cnt).toEqual(8)
    await i.next()
    await i.next()
    await i.next()
    await i.next()
    expect(cnt).toEqual(12)

    for await (let v of i) {
    }

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should close without reject receiver side', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const c = new ChanRace<string>(0)
    const dummyProcResolve = (r: () => void) => setTimeout(() => r(), 100)
    const dummyProcReject = (r: (reason: any) => void) =>
      setTimeout(() => r('rejected'), 10)
    let cnt = 0
    let senderError: Error | undefined = undefined
    let receiverError: Error | undefined = undefined
    ;(async () => {
      for (let i = 0; senderError === undefined && i < s.length; i++) {
        const p = genPromiseResolve([s[i]])[0]
        i === 3 ? dummyProcReject(p[2]) : dummyProcResolve(p[1])
        p[0].catch((r) => {
          senderError = r
          //return Promise.reject(r)
        })
        await c.send(p[0])
        cnt++
      }
      c.close()
    })()
    const res: string[] = []
    try {
      for await (let v of c.receiver()) {
        res.push(v)
      }
    } catch (e: any) {
      receiverError = e
    }
    res.sort(sortFunc)
    expect(res).toEqual(s.slice(0, 3)) // バッファーが無ければ reject されたところで send 側が止まる.
    expect(senderError).toEqual('rejected')
    expect(receiverError).toBeUndefined()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should close without reject receiver side(parallel)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const c = new ChanRace<string>(3)
    const dummyProcResolve = (r: () => void) => setTimeout(() => r(), 100)
    const dummyProcReject = (r: (reason: any) => void) =>
      setTimeout(() => r('rejected'), 10)
    let cnt = 0
    let senderError: Error | undefined = undefined
    let receiverError: Error | undefined = undefined
    ;(async () => {
      for (let i = 0; senderError === undefined && i < s.length; i++) {
        const p = genPromiseResolve([s[i]])[0]
        i === 3 ? dummyProcReject(p[2]) : dummyProcResolve(p[1])
        p[0].catch((r) => {
          senderError = r
          //return Promise.reject(r)
        })
        await c.send(p[0])
        cnt++
      }
      c.close()
    })()
    const res: string[] = []
    try {
      for await (let v of c.receiver()) {
        res.push(v)
      }
    } catch (e: any) {
      receiverError = e
    }
    res.sort(sortFunc)
    expect(res).toEqual(s.slice(0, 3))
    expect(senderError).toEqual('rejected')
    expect(receiverError).toBeUndefined()

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should reject in receiver side', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const c = new ChanRace<string>(0, { rejectInReceiver: true })
    const dummyProcResolve = (r: () => void) => setTimeout(() => r(), 100)
    const dummyProcReject = (r: (reason: any) => void) =>
      setTimeout(() => r('rejected'), 10)
    let cnt = 0
    let senderError: Error | undefined = undefined
    let receiverError: Error | undefined = undefined
    ;(async () => {
      for (let i = 0; senderError === undefined && i < s.length; i++) {
        const p = genPromiseResolve([s[i]])[0]
        i === 3 ? dummyProcReject(p[2]) : dummyProcResolve(p[1])
        p[0].catch((r) => {
          senderError = r
        })
        await c.send(p[0])
        cnt++
      }
      c.close()
    })()
    const res: string[] = []
    try {
      for await (let v of c.receiver()) {
        res.push(v)
      }
    } catch (e: any) {
      receiverError = e
    }
    res.sort(sortFunc)
    // for await...of で generator 側の finally が実行されるので reject の位置で止まる
    expect(res).toEqual(s.slice(0, 3))
    expect(senderError).toEqual('rejected')
    expect(receiverError).toEqual('rejected')

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should reject in receiver side(parallel)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3, { rejectInReceiver: true })
    const dummyProcResolve = (r: () => void) => setTimeout(() => r(), 100)
    const dummyProcReject = (r: (reason: any) => void) =>
      setTimeout(() => r('rejected'), 10)
    let cnt = 0
    let senderError: Error | undefined = undefined
    let receiverError: Error | undefined = undefined
    ;(async () => {
      for (let i = 0; senderError === undefined && i < s.length; i++) {
        const p = genPromiseResolve([s[i]])[0]
        i === 3 ? dummyProcReject(p[2]) : dummyProcResolve(p[1])
        p[0].catch((r) => {
          senderError = r
        })
        await c.send(p[0])
        cnt++
      }
      c.close()
    })()
    const res: string[] = []
    try {
      for await (let v of c.receiver()) {
        res.push(v)
      }
    } catch (e: any) {
      receiverError = e
    }
    res.sort(sortFunc)
    // for await...of で generator 側の finally が実行されるので
    // バッファーがある場合は最初に抜けてきた reject の位置で止まる
    // (今回のテストだと 4 番目の位置の reject がその前の 2 つを追い越す)
    expect(res).toEqual(s.slice(0, 1))
    expect(senderError).toEqual('rejected')
    expect(receiverError).toEqual('rejected')

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive items continue when rejcted', async () => {
    const s = ['0', '1', '2', '3', '4', '5', '6', '7']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(0)
    const dummyProcResolve = (r: () => void) => setTimeout(() => r(), 100)
    const dummyProcReject = (r: (reason: any) => void) =>
      setTimeout(() => r('rejected'), 10)
    let cnt = 0
    ;(async () => {
      for (let i = 0; i < s.length; i++) {
        const p = genPromiseResolve([s[i]])[0]
        i === 3 ? dummyProcReject(p[2]) : dummyProcResolve(p[1])
        p[0].catch((r) => {})
        await c.send(p[0])
        cnt++
      }
      c.close()
    })()
    const res: string[] = []
    for await (let v of c.receiver()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(['0', '1', '2', '4', '5', '6', '7'])

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive items continue when rejcted(parallel)', async () => {
    const s = ['0', '1', '2', '3', '4', '5', '6', '7']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3)
    const dummyProcResolve = (r: () => void) => setTimeout(() => r(), 100)
    const dummyProcReject = (r: (reason: any) => void) =>
      setTimeout(() => r('rejected'), 10)
    let cnt = 0
    ;(async () => {
      for (let i = 0; i < s.length; i++) {
        const p = genPromiseResolve([s[i]])[0]
        i === 3 ? dummyProcReject(p[2]) : dummyProcResolve(p[1])
        p[0].catch((r) => {})
        await c.send(p[0])
        cnt++
      }
      c.close()
    })()
    const res: string[] = []
    for await (let v of c.receiver()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(['0', '1', '2', '4', '5', '6', '7'])

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive items continue when rejcted last written item', async () => {
    const s = ['0', '1', '2', '3', '4', '5', '6', '7']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(0)
    const dummyProcResolve = (r: () => void) => setTimeout(() => r(), 100)
    const dummyProcReject = (r: (reason: any) => void) =>
      setTimeout(() => r('rejected'), 10)
    let cnt = 0
    ;(async () => {
      for (let i = 0; i < s.length; i++) {
        const p = genPromiseResolve([s[i]])[0]
        i === 3 || i === 7 ? dummyProcReject(p[2]) : dummyProcResolve(p[1])
        p[0].catch((r) => {})
        await c.send(p[0])
        cnt++
      }
      c.close()
    })()
    const res: string[] = []
    for await (let v of c.receiver()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(['0', '1', '2', '4', '5', '6'])

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })

  it('should receive items continue when rejcted last written item(parallel)', async () => {
    const s = ['0', '1', '2', '3', '4', '5', '6', '7']
    const pr = genPromiseResolve(s)
    const c = new ChanRace<string>(3)
    const dummyProcResolve = (r: () => void) => setTimeout(() => r(), 100)
    const dummyProcReject = (r: (reason: any) => void) =>
      setTimeout(() => r('rejected'), 10)
    let cnt = 0
    ;(async () => {
      for (let i = 0; i < s.length; i++) {
        const p = genPromiseResolve([s[i]])[0]
        i === 3 || i === 7 ? dummyProcReject(p[2]) : dummyProcResolve(p[1])
        p[0].catch((r) => {})
        await c.send(p[0])
        cnt++
      }
      c.close()
    })()
    const res: string[] = []
    for await (let v of c.receiver()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(['0', '1', '2', '4', '5', '6'])

    expect(mockBufReset).toBeCalled()
    expect(
      mockBufReset.mock.calls.length <= mockBufRelease.mock.calls.length
    ).toBeTruthy()
    expect(mockValueReset).toBeCalled()
    expect(
      mockValueReset.mock.calls.length <= mockValueRelease.mock.calls.length
    ).toBeTruthy()
  })
})
