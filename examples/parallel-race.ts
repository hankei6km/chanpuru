import { PromiseChan } from '../src/index.js'

const s: [string, number][] = [
  ['0', 80],
  ['1', 100],
  ['2', 50],
  ['3', 280],
  ['4', 200],
  ['5', 240],
  ['6', 150],
  ['7', 10],
  ['8', 130]
]
//for (let idx = 1, t = 0; idx < s.length; idx++) {
//  s[idx][1] = s[idx][1] + s[idx - 1][1]
//}
const pa: Promise<string>[] = s.map(
  ([value, timeout]) =>
    new Promise((resolve) => setTimeout(() => resolve(value), timeout))
)

const c = new PromiseChan<string>(3)

const n = Date.now()
;(async () => {
  for (let idx = 0; idx < pa.length; idx++) {
    await c.write(pa[idx])
    console.log(
      `write elapsed time: ${`${Date.now() - n}`.padStart(
        4,
        '0'
      )} index: ${idx}`
    )
  }
  c.close()
})()
;(async () => {
  for await (let i of c.reader()) {
    console.log(
      `read  elapsed time: ${`${Date.now() - n}`.padStart(4, '0')} value: ${i}`
    )
  }
})()

// $ node --loader ts-node/esm examples/serial.ts
//
// write elapsed time: 0000 index: 0
// write elapsed time: 0001 index: 1
// write elapsed time: 0001 index: 2
// write elapsed time: 0050 index: 3
// read  elapsed time: 0051 value: 2
// write elapsed time: 0079 index: 4read  elapsed time: 0080 value: 0
// write elapsed time: 0100 index: 5
// read  elapsed time: 0100 value: 1
// write elapsed time: 0200 index: 6
// read  elapsed time: 0200 value: 4
// write elapsed time: 0201 index: 7
// read  elapsed time: 0201 value: 6
// write elapsed time: 0201 index: 8
// read  elapsed time: 0202 value: 7
// read  elapsed time: 0202 value: 8
// read  elapsed time: 0240 value: 5read  elapsed time: 0280 value: 3
