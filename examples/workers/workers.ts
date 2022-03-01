import { Chan, workers } from '../../src/index.js'
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

const ch = new Chan<() => Promise<string>>(0)
;(async () => {
  for (const i of s) {
    const p = ((t: Src) => {
      return () => genPromise(t, print)
    })(i)
    await ch.send(p)
  }
  ch.close()
})()
const recv = workers<string>(3, ch.receiver())

for await (let i of recv) {
  print(`recv ${i}`)
}
print('done')
