import { Chan } from '../../src/index.js'

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

const p = (value: string, timeout: number) =>
  new Promise<string>((resolve) => setTimeout(() => resolve(value), timeout))

const c = new Chan<Promise<string>>(0)

const n = Date.now()
;(async () => {
  for (let idx = 0; idx < s.length; idx++) {
    console.log(
      `send start elapsed time: ${`${Date.now() - n}`.padStart(
        4,
        '0'
      )} index: ${idx}`
    )
    await c.send(p(s[idx][0], s[idx][1]))
    console.log(
      `send done  elapsed time: ${`${Date.now() - n}`.padStart(
        4,
        '0'
      )} index: ${idx}`
    )
  }
  c.close()
})()
;(async () => {
  for await (let i of c.receiver()) {
    console.log(
      `recv       elapsed time: ${`${Date.now() - n}`.padStart(
        4,
        '0'
      )} value: ${i}`
    )
  }
})()

// $ node --loader ts-node/esm examples/serial.ts
//
// send start elapsed time: 0000 index: 0
// send done  elapsed time: 0002 index: 0
// send start elapsed time: 0002 index: 1
// send done  elapsed time: 0004 index: 1
// send start elapsed time: 0004 index: 2
// recv       elapsed time: 0081 value: 0
// send done  elapsed time: 0081 index: 2
// send start elapsed time: 0081 index: 3
// recv       elapsed time: 0102 value: 1
// send done  elapsed time: 0102 index: 3
// send start elapsed time: 0103 index: 4
// recv       elapsed time: 0103 value: 2
// send done  elapsed time: 0103 index: 4
// send start elapsed time: 0103 index: 5
// recv       elapsed time: 0362 value: 3
// send done  elapsed time: 0362 index: 5
// send start elapsed time: 0362 index: 6
// recv       elapsed time: 0362 value: 4
// send done  elapsed time: 0362 index: 6
// send start elapsed time: 0363 index: 7
// recv       elapsed time: 0363 value: 5
// send done  elapsed time: 0363 index: 7
// send start elapsed time: 0363 index: 8
// recv       elapsed time: 0513 value: 6
// send done  elapsed time: 0513 index: 8
// recv       elapsed time: 0514 value: 7
// recv       elapsed time: 0514 value: 8
