import { jest } from '@jest/globals'
import { Chan } from '../../src/lib/chan.js'

// https://stackoverflow.com/questions/43265944/is-there-any-way-to-mock-private-functions-with-jest
const mockBufReset = jest.spyOn(Chan.prototype as any, 'bufReset')
const mockBufRelease = jest.spyOn(Chan.prototype as any, 'bufRelease')
const mockValueReset = jest.spyOn(Chan.prototype as any, 'valueReset')
const mockValueRelease = jest.spyOn(Chan.prototype as any, 'valueRelease')

beforeEach(() => {
  mockBufReset.mockClear()
  mockBufRelease.mockClear()
  mockValueReset.mockClear()
  mockValueRelease.mockClear()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('Chan()', () => {
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
    const c = new Chan<string>()
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
    const c = new Chan<string>()
    c.close()
    await expect(c.send('0')).rejects.toThrow('panic: send on closed channel')

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
    const c = new Chan<string>()
    setTimeout(async () => {
      ;(async () => {
        await c.send(s[0])
        c.close()
      })()
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

  it('should receive item that is sended after receive', async () => {
    const s = ['0']
    const c = new Chan<string>()
    setTimeout(async () => {
      ;(async () => {
        await c.send(s[0])
        c.close()
      })()
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
    const c = new Chan<string>(3)
    setTimeout(async () => {
      ;(async () => {
        await c.send(s[0])
        await c.send(s[1])
        c.close()
      })()
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

  it('should receive item after send(parallel)', async () => {
    const s = ['0', '1']
    const c = new Chan<string>(3)
    ;(async () => {
      await c.send(s[0])
      await c.send(s[1])
      c.close()
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
    const c = new Chan<string>()
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
    const c = new Chan<string>(2)
    setTimeout(async () => {
      ;(async () => {
        await c.send(s[0])
        await c.send(s[1])
        c.close()
      })()
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
    const c = new Chan<string>(3)
    setTimeout(async () => {
      ;(async () => {
        await c.send(s[0])
        await c.send(s[1])
        c.close()
      })()
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
    const c = new Chan<string>()
    ;(async () => {
      for (let i = 0; i < s.length; i++) {
        await c.send(s[i])
      }
      c.close()
    })()
    const res: string[] = []
    for await (let v of c.receiver()) {
      res.push(v)
    }
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
    const c = new Chan<string>(2)
    ;(async () => {
      for (let i = 0; i < s.length; i++) {
        await c.send(s[i])
      }
      c.close()
    })()
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
    const c = new Chan<string>(3)
    ;(async () => {
      for (let i = 0; i < s.length; i++) {
        await c.send(s[i])
      }
      c.close()
    })()
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

  it('should receive all items(multiple receiver)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const c = new Chan<string>(3)
    ;(async () => {
      for (let i = 0; i < s.length; i++) {
        await c.send(s[i])
      }
      c.close()
    })()
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

  it('should receive all items(multiple sender)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const c = new Chan<string>(3)
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
        await c.send(s[i])
      }
      relaseResolve[0]()
    })()
    ;(async () => {
      for (let i = 250; i < 400; i++) {
        await c.send(s[i])
      }
      relaseResolve[1]()
    })()
    ;(async () => {
      for (let i = 400; i < len; i++) {
        await c.send(s[i])
      }
      relaseResolve[2]()
    })()
    Promise.all(promise).then(() => c.close())
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
    const c = new Chan<string>()
    let step = 0
    const pocket: number[] = []
    ;(async () => {
      pocket.push(step)
      await c.send(s[0]) // バッファーがないので受信されるまでブロックされる.
      pocket.push(step)
      await c.send(s[1])
      pocket.push(step)
      c.close()
    })()
    await new Promise<void>(async (resolve) => {
      const i = c.receiver()
      await i.next()
      step++
      await i.next()
      step++
      await i.next()
      step++
      resolve()
    })

    expect(pocket).toEqual([0, 1, 2])

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
    const c = new Chan<string>(1)
    let step = 0
    const pocket: number[] = []
    ;(async () => {
      pocket.push(step)
      await c.send(s[0]) // バッファーがあるのでブロックされない.
      pocket.push(step) // よって、受信前に到達するので step = 0 の状態.
      await c.send(s[1])
      pocket.push(step)
      c.close()
    })()
    await new Promise<void>(async (resolve) => {
      const i = c.receiver()
      await i.next()
      step++
      await i.next()
      step++
      await i.next()
      step++
      resolve()
    })

    expect(pocket).toEqual([0, 0, 1])

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
    const len = 100
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const c = new Chan<string>(3)
    const stepCh = new Chan<void>(10)
    let cnt = 0
    ;(async () => {
      for (let i = 0; i < s.length; i++) {
        await c.send(s[i])
        cnt++
        await stepCh.send()
      }
      c.close()
      stepCh.close()
    })()
    const i = c.receiver()
    const step = stepCh.receiver()

    expect(cnt).toEqual(0)
    await step.next()
    await step.next()
    await step.next()
    expect(cnt).toEqual(3) // c からは受信していないがループは 3 回実行されている.

    for (let idx = 4; idx < 101; idx++) {
      await i.next()
      await step.next()
      expect(cnt).toEqual(idx)
    }

    // c の残りを受信しておく.
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
    const len = 30
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const c = new Chan<Promise<string>>(0)
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
    // ['0', '1', '2', '3' 以外] で undefined を含まないことを確認.
    // バッファーサイズなどによって長さは変動する.
    expect(res).toEqual(['0', '1', '2'])
    expect(res).not.toContain(undefined)
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
    const c = new Chan<Promise<string>>(3)
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
    // ['0', '1', '2', '3' 以外] であることだけを確認.
    // バッファーサイズなどによって長さは変動する.
    expect(res).toEqual(['0', '1', '2'])
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
    const c = new Chan<Promise<string>>(0, { rejectInReceiver: true })
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
    // for await...of で generator 側の finally が実行されるので reject の位置で止まる
    expect(res).toEqual(['0', '1', '2'])
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
    const c = new Chan<Promise<string>>(3, { rejectInReceiver: true })
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
    // for await...of で generator 側の finally が実行されるので reject の位置で止まる
    expect(res).toEqual(['0', '1', '2'])
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
    const c = new Chan<Promise<string>>(0)
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
    const c = new Chan<Promise<string>>(3)
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
    const c = new Chan<Promise<string>>(0)
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
    const c = new Chan<Promise<string>>(3)
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

  it('should send promise via async generator(yield)', async () => {
    jest.useFakeTimers()
    const pr = [
      new Promise<string>((resolve) => setTimeout(() => resolve('0'), 2000)),
      new Promise<string>((resolve) => setTimeout(() => resolve('1'), 1000))
    ]
    const c = new Chan<() => Promise<string>>()
    ;(async () => {
      await c.send(() => pr[0])
      await c.send(() => pr[1])
      c.close()
    })()

    const v: Promise<string>[] = []
    for await (let p of c.receiver()) {
      v.push(p())
    }

    jest.advanceTimersByTime(1000)
    expect(await Promise.race(v)).toEqual('1')
    jest.advanceTimersByTime(1000)
    expect(await Promise.race(v)).toEqual('0')

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
