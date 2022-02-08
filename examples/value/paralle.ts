import { Chan } from '../../src/index.js'

const c = new Chan<string>(3)

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

// $ node --loader ts-node/esm examples/value/paralle.ts
//
// send: 0
// send: 1
// send: 2
// send: 3
// recv: 0
// send: 4
// recv: 1
// send: 5
// recv: 2
// recv: 3
// recv: 4
// recv: 5
