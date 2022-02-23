import { Chan } from '../../src/index.js'
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

const c = new Chan<() => Promise<string>>()

;(async () => {
  for (const i of s) {
    // ここで Promise を作成しておかないとコールバックが実行されないため順次実行と変わらないので注意.
    const p = genPromise(i, print)
    await c.send(() => p)
  }
  c.close()
})()

for await (let i of c.receiver()) {
  const p = i().then((v) => v.toUpperCase())
  print(`recv value: ${await p}`)
}
