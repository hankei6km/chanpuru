import { Chan } from '../../src/index.js'
import { log } from '../util.js'

const { print, printElapsed } = log()

const s: [string, number][] = [
  ['a', 500],
  ['b', 700],
  ['c', 600],
  ['d', 2000],
  ['e', 0],
  ['f', 200],
  ['h', 1000],
  ['j', 600],
  ['k', 700]
]

const p = (value: string, timeout: number) => {
  if (timeout === 0) {
    return new Promise<string>((_resolve, reject) =>
      setTimeout(() => reject(`rejected: ${value}`), 100)
    )
  }
  return new Promise<string>((resolve) =>
    setTimeout(() => resolve(value), timeout)
  )
}

const c = new Chan<Promise<string>>(3)

;(async () => {
  let err: any
  for (let idx = 0; err === undefined && idx < s.length; idx++) {
    print(`send start ${idx + 1}`)
    await c.send(
      p(s[idx][0], s[idx][1]).catch((r) => {
        console.log(`handle reject(send loop) ${r}`)
        err = r
        return Promise.reject(r)
      })
    )
    print(`send end ${idx + 1}`)
  }
  c.close()
})()
;(async () => {
  try {
    for await (let i of c.receiver()) {
      print(`recv value: ${i}`)
    }
  } catch (r) {
    console.log(`handle reject(recv loop) ${r}`)
  }
})()
