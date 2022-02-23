import { ChanRace } from '../../src/index.js'
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

const c = new ChanRace<string>(3)

;(async () => {
  for (let idx = 0; idx < s.length; idx++) {
    // print(`send start ${idx + 1}`)
    const p = genPromise(s[idx], print)
    await c.send(p)
    // print(`send end ${idx + 1}`)
  }
  c.close()
})()
const r = c.receiver()
Promise.all([
  (async () => {
    for await (let i of r) {
      print(`recv1 value: ${i}`)
    }
    print('done 1')
  })(),
  (async () => {
    for await (let i of r) {
      print(`recv2 value: ${i}`)
    }
    print('done 2')
  })()
])
