import { Chan } from '../../src/index.js'

const c = new Chan<string>()

;(async () => {
  for (let s of ['0', '1', '2', '3', '4', '5']) {
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

// $ node --loader ts-node/esm examples/value/serial.ts
//
// send: 0
// send: 1
// recv: 0
// send: 2
// recv: 1
// send: 3
// recv: 2
// send: 4
// recv: 3
// send: 5
// recv: 4
// recv: 5
