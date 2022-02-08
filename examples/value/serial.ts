import { Chan } from '../../src/index.js'

const c = new Chan<string>()

;(async () => {
  for (let s of ['0', '1', '2', '3', '4', '5']) {
    console.log(`write: ${s}`)
    await c.write(s)
  }
  c.close()
})()
;(async () => {
  for await (let i of c.reader()) {
    console.log(`read : ${i}`)
  }
})()

// $ node --loader ts-node/esm examples/value/serial.ts
//
// write: 0
// write: 1
// read : 0
// write: 2
// read : 1
// write: 3
// read : 2
// write: 4
// read : 3
// write: 5
// read : 4
// read : 5
