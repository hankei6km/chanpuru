import { Chan } from '../src/index.js'

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
for (let idx = 1, t = 0; idx < s.length; idx++) {
  s[idx][1] = s[idx][1] + s[idx - 1][1]
}
const pa: Promise<string>[] = s.map(
  ([value, timeout]) =>
    new Promise((resolve) => setTimeout(() => resolve(value), timeout))
)

const c = new Chan<Promise<string>>()

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
// write elapsed time: 0001 index: 0
// write elapsed time: 0002 index: 1
// read  elapsed time: 0080 value: 0
// write elapsed time: 0081 index: 2
// read  elapsed time: 0180 value: 1
// write elapsed time: 0181 index: 3
// read  elapsed time: 0230 value: 2
// write elapsed time: 0230 index: 4
// read  elapsed time: 0510 value: 3
// write elapsed time: 0515 index: 5
// read  elapsed time: 0710 value: 4
// write elapsed time: 0711 index: 6
// read  elapsed time: 0950 value: 5
// write elapsed time: 0951 index: 7
// read  elapsed time: 1100 value: 6
// write elapsed time: 1101 index: 8
// read  elapsed time: 1109 value: 7
// read  elapsed time: 1240 value: 8
