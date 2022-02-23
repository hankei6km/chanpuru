import { Chan, select } from '../../src/index.js'
import { Src, log, genPromise } from '../util.js'

const { print } = log()

const s1: Src[] = [
  ['a', 'f', 500],
  ['b', 'f', 700],
  ['c', 'f', 600],
  ['d', 'f', 2000]
]

const s2: Src[] = [
  ['A', 'f', 400],
  ['B', 'f', 200],
  ['C', 'f', 100],
  ['D', 'f', 800],
  ['E', 'f', 300]
]

const s3: Src<number>[] = [
  [1, 'f', 1000],
  [2, 'f', 100],
  [3, 'f', 1300]
]

const ch1 = new Chan<Promise<string>>(1)
const ch2 = new Chan<Promise<string>>(1)
const ch3 = new Chan<Promise<number>>(1)

async function sender<T>(ch: Chan<Promise<T>>, s: Src<T>[]) {
  for (const i of s) {
    const p = genPromise(i, print)
    await ch.send(p)
  }
  ch.close()
}
;(async () => {
  await Promise.all([sender(ch1, s1), sender(ch2, s2), sender(ch3, s3)])
})()
;(async () => {
  for await (let [s, v] of select<string | number>({
    ch1: ch1.receiver(),
    ch2: ch2.receiver(),
    ch3: ch3.receiver()
  })) {
    if (!v.done) {
      print(`recv ${s}-${v.value}`)
    }
  }
})()
