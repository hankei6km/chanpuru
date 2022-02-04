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

  it('should results are in the order of the calls', async () => {
    const s = ['a', 'b', 'c', 'd', 'e', 'f']
    const pr = genPromiseResolve(s)
    const c = new Make<string>(1)
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.write(pr[i][0])
      }
      c.close()
    })()
    pr[0][1]()
    pr[2][1]()
    pr[5][1]()
    pr[1][1]()
    pr[3][1]()
    pr[4][1]()
    const res: string[] = []
    for await (let v of c.reader()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(s)
  })

  it('should results are in the order of the calls(parallel)', async () => {
    const s = ['a', 'b', 'c', 'd', 'e', 'f']
    const pr = genPromiseResolve(s)
    const c = new Make<string>(3)
    ;(async () => {
      for (let i = 0; i < pr.length; i++) {
        await c.write(pr[i][0])
      }
      c.close()
    })()
    pr[0][1]()
    pr[2][1]()
    pr[5][1]()
    pr[1][1]()
    pr[3][1]()
    pr[4][1]()
    const res: string[] = []
    for await (let v of c.reader()) {
      res.push(v)
    }
    res.sort(sortFunc)
    expect(res).toEqual(s)
  })

  it('should results are in the order of the calls(long)', async () => {
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

  it('should results are in the order of the calls(multiple writer)', async () => {
    const len = 500
    const s = new Array<string>(len).fill('').map((_v, i) => `${i}`)
    const pr = genPromiseResolve(s)
    const c = new Make<string>(3)
    const relaseResolve = new Array<(value: void) => void>(2)
    const promise = [
      new Promise((resolve) => {
        relaseResolve[0] = resolve
      }),
      new Promise((resolve) => {
        relaseResolve[1] = resolve
      })
    ]
    ;(async () => {
      for (let i = 0; i < 250; i++) {
        await c.write(pr[i][0])
      }
      relaseResolve[0]()
    })()
    ;(async () => {
      for (let i = 250; i < len; i++) {
        await c.write(pr[i][0])
      }
      relaseResolve[1]()
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

  it('should returns immediately if the buffer is not full', async () => {
    const s = ['a', 'b']
    const pr = genPromiseResolve(s)
    const c = new Make<string>(2)
    await c.write(pr[0][0]) // バッファーが空いているのでブロックされない.
    await c.write(pr[1][0])
    expect(true).toBeTruthy()
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
    await i.next()
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
  })

  it('should catche rejected error', async () => {
    const s = ['a', 'b', 'c', 'd', 'e', 'f']
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
    pr[3][2]('rejected')
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
