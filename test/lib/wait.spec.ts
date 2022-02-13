import { jest } from '@jest/globals'
import { WaitCnt } from '../../src/lib/wait.js'

describe('WaitCnt', () => {
  it('should return immediately', async () => {
    const wc = new WaitCnt()
    wc.add(1)
    wc.done()
    await wc.wait()
    expect(true).toBeTruthy()
  })

  it('should return immediately(long)', async () => {
    const wc = new WaitCnt()
    const f = jest.fn()
    for (let i = 0; i < 500; i++) {
      wc.add(1)
      wc.done()
      f()
    }
    await wc.wait()
    expect(f).toBeCalledTimes(500)
  })

  it('should return immediately(step)', async () => {
    const wc = new WaitCnt()
    const f = jest.fn()
    for (let i = 0; i < 500; i++) {
      wc.add(1)
      wc.add(1)
      wc.add(2)
      wc.done()
      wc.done()
      wc.done()
      wc.done()
      f()
    }
    await wc.wait()
    expect(f).toBeCalledTimes(500)
  })

  it('should wait all timeout', async () => {
    const wc = new WaitCnt()
    const f = jest.fn()
    ;(async () => {
      for (let i = 0; i < 100; i++) {
        wc.add(1)
        setTimeout(() => {
          f()
          wc.done()
        }, 10)
      }
    })()
    await wc.wait()
    expect(f).toBeCalledTimes(100)
  })
})
