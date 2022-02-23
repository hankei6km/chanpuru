import { emptyPromise, Chan, rotateGenerator, select } from '../../src/index.js'
import { Src, log, genPromise } from '../util.js'

const { print } = log()

const s: Src[] = [
  ['a', 'f', 500],
  ['b', 'f', 700],
  ['c', 'f', 600],
  ['d', 'f', 2000],
  ['e', 'f', 800],
  ['f', 'f', 200],
  ['g', 'f', 1000],
  ['h', 'f', 600],
  ['i', 'f', 700],
  ['j', 'f', 300]
]

// https://unix.stackexchange.com/questions/225179/display-spinner-while-waiting-for-some-process-to-finish/565551
const sp = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']
const [p, cancel] = emptyPromise()
const spinner = rotateGenerator(p, sp, { timeout: 200 })

function generateValues() {
  const c = new Chan<Promise<string>>()
  ;(async () => {
    for (const i of s) {
      const p = genPromise(i, () => {})
      await c.send(p)
    }
    c.close()
    cancel()
  })()
  return c.receiver()
}
const values = generateValues()

for await (let [key, value] of select<string>({ values, spinner })) {
  if (key === 'spinner') {
    if (!value.done && value.value) {
      process.stdout.write(` waiting: ${value.value}`)
      process.stdout.write('\u001b[11D')
    }
  } else {
    process.stdout.write(` waiting:  `)
    process.stdout.write('\u001b[11D')
    if (key === 'values') {
      if (value.done !== true) {
        print(`recv ${value.value}`)
      }
    }
  }
}
