import { Chan } from '../../src/index.js'
import { Src, log, genPromise } from '../util.js'

const { print } = log()

const s1: Src[] = [
  ['a-1', 'f', 500],
  ['b-1', 'f', 700],
  ['c-1', 'f', 600],
  ['d-1', 'f', 2000]
]

const s2: Src[] = [
  ['a-2', 'f', 400],
  ['b-2', 'f', 200],
  ['c-2', 'f', 100],
  ['d-2', 'f', 800],
  ['e-2', 'f', 300]
]

const s3: Src[] = [
  ['a-3', 'f', 1000],
  ['b-3', 'f', 100],
  ['c-3', 'f', 1300],
  ['d-3', 'f', 100],
  ['e-3', 'f', 400],
  ['f-3', 'f', 500],
  ['g-3', 'f', 200]
]

const c = new Chan<(len: number) => Promise<string>>(3)

async function sender(s: Src[]) {
  for (const i of s) {
    const p = ((t: Src) => {
      return (len: number) =>
        genPromise(t, print).then((v) => new Array(len).fill(v).join())
    })(i)
    await c.send(p)
  }
}
;(async () => {
  await Promise.all([sender(s1), sender(s2), sender(s3)])
  c.close()
})()

for await (let i of c.receiver()) {
  print(`recv value: ${await i(3)}`)
}
