import { Make } from '../src/index'
//import { Make } from '../src/index.js'

const s: [string, number][] = [
  ['0', 100],
  ['1', 280],
  ['2', 10],
  ['3', 80],
  ['4', 200],
  ['5', 240],
  ['6', 150],
  ['7', 10],
  ['8', 130]
]
for (let idx = 1, t = 0; idx < s.length; idx++) {
  s[idx][1] = s[idx][1] + s[idx - 1][1]
}
const pa: Promise<string>[] = s.map(
  ([value, timeout]) =>
    new Promise((resolve) => setTimeout(() => resolve(value), timeout))
)

const c = new Make<string>()

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
// write elapsed time: 0101 index: 0
// read  elapsed time: 0102 value: 0
// write elapsed time: 0149 index: 1
// read  elapsed time: 0150 value: 1
// write elapsed time: 0330 index: 2
// read  elapsed time: 0330 value: 2
// write elapsed time: 0410 index: 3
// read  elapsed time: 0411 value: 3
// write elapsed time: 0610 index: 4
// read  elapsed time: 0611 value: 4
// write elapsed time: 0850 index: 5
// read  elapsed time: 0850 value: 5
// write elapsed time: 1000 index: 6
// read  elapsed time: 1001 value: 6
// write elapsed time: 1010 index: 7
// read  elapsed time: 1011 value: 7
// write elapsed time: 1140 index: 8
// read  elapsed time: 1140 value: 8
