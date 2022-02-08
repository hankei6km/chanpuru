import { Chan } from '../../src/index.js'

const c = new Chan<string>(3)

;(async () => {
  for (let s of ['1-0', '1-1', '1-2', '1-3', '1-4', '1-5']) {
    console.log(`send: ${s}`)
    await c.send(s)
  }
  c.close()
})()
;(async () => {
  for (let s of ['2-0', '2-1', '2-2', '2-3', '2-4', '2-5']) {
    console.log(`send: ${s}`)
    await c.send(s)
  }
  c.close()
})()
;(async () => {
  for await (let i of c.receiver()) {
    console.log(`recv: ${i}`)
  }
})()

// $ node --loader ts-node/esm examples/value/multiple.ts
//
// send: 1-0
// send: 2-0
// send: 1-1
// send: 2-1
// send: 1-2
// send: 2-2
// recv: 1-0
// send: 1-3
// recv: 2-0
// send: 2-3
// recv: 1-1
// send: 1-4
// recv: 2-1
// send: 2-4
// recv: 1-2
// send: 1-5
// recv: 2-2
// send: 2-5
// recv: 1-3
// recv: 2-3
// recv: 1-4
// recv: 2-4
// recv: 1-5
// recv: 2-5
