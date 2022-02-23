import { Chan, payloads, workers } from '../../src/index.js'
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

const ch = new Chan<[() => Promise<string>, string]>(0)
;(async () => {
  for (let idx = 0; idx < s.length; idx++) {
    const p = ((t: Src) => {
      return () => genPromise(t, print)
    })(s[idx])
    await ch.send([p, idx % 2 ? '#' : '@'])
  }
  ch.close()
})()
const recv = payloads<string, string>(3, ch.receiver(), { keepOrder: false })

for await (let [value, payload] of recv) {
  print(`recv ${value}-${payload}`)
}
print('done')
