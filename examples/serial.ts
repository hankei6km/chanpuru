import { Chan } from '../src/index.js'

const s: [string, number][] = [
  ['0', 100],
  ['1', 280],
  ['2', 50],
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

const c = new Chan<string>()

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
// write elapsed time: 0100 index: 0
// read  elapsed time: 0101 value: 0
// write elapsed time: 0380 index: 1
// read  elapsed time: 0380 value: 1
// write elapsed time: 0430 index: 2
// read  elapsed time: 0430 value: 2
// write elapsed time: 0510 index: 3
// read  elapsed time: 0510 value: 3
// write elapsed time: 0710 index: 4
// read  elapsed time: 0710 value: 4
// write elapsed time: 0950 index: 5
// read  elapsed time: 0950 value: 5
// write elapsed time: 1100 index: 6
// read  elapsed time: 1101 value: 6
// write elapsed time: 1110 index: 7
// read  elapsed time: 1110 value: 7
// write elapsed time: 1240 index: 8
// read  elapsed time: 1241 value: 8
