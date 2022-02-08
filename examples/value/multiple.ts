import { Chan } from '../../src/index.js'

const c = new Chan<string>(3)

;(async () => {
  for (let s of ['1-0', '1-1', '1-2', '1-3', '1-4', '1-5']) {
    console.log(`write: ${s}`)
    await c.write(s)
  }
  c.close()
})()
;(async () => {
  for (let s of ['2-0', '2-1', '2-2', '2-3', '2-4', '2-5']) {
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

// $ node --loader ts-node/esm examples/value/multiple.ts
//
// write: 1-0
// write: 2-0
// write: 1-1
// write: 2-1
// write: 1-2
// write: 2-2
// read : 1-0
// write: 1-3
// read : 2-0
// write: 2-3
// read : 1-1
// write: 1-4
// read : 2-1
// write: 2-4
// read : 1-2
// write: 1-5
// read : 2-2
// write: 2-5
// read : 1-3
// read : 2-3
// read : 1-4
// read : 2-4
// read : 1-5
// read : 2-5
