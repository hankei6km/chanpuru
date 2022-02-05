import { Make } from '../../src/lib/promise-chan.js'

describe('Make()', () => {
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

  it('should read item that is writed after read', async () => {
    const s = ['0']
    const pr = genPromiseResolve(s)
    const c = new Make<string>()
    setTimeout(async () => {
      c.write(pr[0][0])
      pr[0][1]()
    }, 100)
    const i = c.reader()
    expect((await i.next()).value).toEqual('0')
  })

  it('should close when buffer is empty', async () => {
    const c = new Make<string>()
    setTimeout(() => {
      c.close()
    }, 100)
    const i = c.reader()
    expect((await i.next()).done).toBeTruthy()
  })

  it('should close when read items the number of just bufSize', async () => {
    const s = ['0', '1']
    const pr = genPromiseResolve(s)
    const c = new Make<string>(1)
    setTimeout(async () => {
      ;(async () => {
        await c.write(pr[0][0])
        await c.write(pr[1][0])
      })()
      pr[0][1]()
      pr[1][1]()
      c.close()
    }, 100)
    const i = c.reader()
    expect((await i.next()).value).toEqual('0')
    expect((await i.next()).value).toEqual('1')
    expect((await i.next()).done).toBeTruthy()
  })

  it('should read all items', async () => {
    const s = ['0', '1', '2', '3', '4', '5']
    const pr = genPromiseResolve(s)
    const c = new Make<string>()
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.write(pr[i][0])
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
    for await (let v of c.reader()) {
      res.push(v)
    }
    // res.sort(sortFunc)  // バッファーなしだと write 順にならぶ.
    expect(res).toEqual(s)
  })

  it('should read all items(parallel)', async () => {
    const s = ['0', '1', '2', '3', '4', '5']
    const pr = genPromiseResolve(s)
    const c = new Make<string>(2)
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.write(pr[i][0])
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
    for await (let v of c.reader()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(s)
  })

  it('should read all items(long)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new Make<string>(3)
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.write(pr[i][0])
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
    for await (let v of c.reader()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(s)
  })

  it('should read all items(multiple writer)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new Make<string>(3)
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
        await c.write(pr[i][0])
      }
      relaseResolve[0]()
    })()
    ;(async () => {
      for (let i = 250; i < 400; i++) {
        await c.write(pr[i][0])
      }
      relaseResolve[1]()
    })()
    ;(async () => {
      for (let i = 400; i < len; i++) {
        await c.write(pr[i][0])
      }
      relaseResolve[2]()
    })()
    Promise.all(promise).then(() => c.close())
    pr.forEach(([_p, r]) => process.nextTick(() => r()))
    const res: string[] = []
    for await (let v of c.reader()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(s)
  })

  it('should block writing if the buffer is not allocated', async () => {
    const s = ['0', '1']
    const pr = genPromiseResolve(s)
    const c = new Make<string>()
    let done = [false, false]
    ;(async () => {
      await c.write(pr[0][0])
      done[0] = true
      await c.write(pr[1][0]) // バッファーがないのでブロックされる.
      done[1] = true
    })()
    await (async () => {
      pr[0][1]()
      await c.reader().next()
    })()
    expect(done[0]).toBeTruthy()
    expect(done[1]).toBeFalsy()
    c.close()
  })

  it('should returns immediately if the buffer is not full(short)', async () => {
    const s = ['0', '1']
    const pr = genPromiseResolve(s)
    const c = new Make<string>(1)
    let done = [false, false]
    ;(async () => {
      await c.write(pr[0][0])
      done[0] = true
      await c.write(pr[1][0]) // バッファーが空いているのでブロックされない.
      done[1] = true
    })()
    await (async () => {
      pr[0][1]()
      await c.reader().next()
    })()
    expect(done[0]).toBeTruthy()
    expect(done[1]).toBeTruthy()
    c.close()
  })

  it('should returns immediately if the buffer is not full(long)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new Make<string>(3)
    let cnt = 0
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.write(pr[i][0])
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
    const i = c.reader()
    expect(cnt).toEqual(0)
    await i.next()
    // 内部バッファーサイズ = 3+1、next でリリースされたので 1 回 write が成功.
    // generator 側の処理を変更すると write 成功前に戻ってくるので値は変動する.
    expect(cnt).toEqual(5)
    await i.next()
    await i.next()
    await i.next()
    await i.next()
    expect(cnt).toEqual(9)
    await i.next()
    await i.next()
    await i.next()
    await i.next()
    expect(cnt).toEqual(13)
  })

  it('should catch rejected error', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new Make<string>(3)
    let cnt = 0
    let writerError: Error | undefined = undefined
    let readerError: Error | undefined = undefined
    ;(async () => {
      try {
        for (let i = 0; i < pr.length; i++) {
          await c.write(pr[i][0])
          cnt++
        }
      } catch (e: any) {
        writerError = e
      }
      c.close()
    })()
    pr[0][1]()
    pr[1][1]()
    pr[2][1]()
    process.nextTick(() => pr[3][2]('rejected'))
    const res: string[] = []
    try {
      for await (let v of c.reader()) {
        res.push(v)
      }
    } catch (e: any) {
      readerError = e
    }
    res.sort(sortFunc)
    expect(res).toEqual(s.slice(0, 3))
    expect(writerError).toContain('rejected')
    expect(readerError).toContain('rejected')
  })
})
