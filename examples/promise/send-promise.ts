import { Chan } from '../../src/index.js'

const c = new Chan<() => Promise<string>>()

const pa = [
  new Promise<string>((resolve) => setTimeout(() => resolve('0'), 200)),
  new Promise<string>((resolve) => setTimeout(() => resolve('1'), 100))
]
;(async () => {
  for (let p of pa) {
    await c.write(() => p)
  }
  c.close()
})()

const r: Promise<string>[] = []
;(async () => {
  for await (let i of c.reader()) {
    r.push(i())
  }
  console.log(`race : ${await Promise.race(r)}`)
  await r[0]
})()

// $ node --loader ts-node/esm examples/promise/send-promise.ts
//
// res : 1
