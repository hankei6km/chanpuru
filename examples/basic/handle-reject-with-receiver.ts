import { Chan } from '../../src/index.js'
import { Src, log, genPromose } from '../util.js'

const { print } = log()

const s: Src[] = [
  ['a', 'f', 500],
  ['b', 'f', 700],
  ['c', 'f', 600],
  ['d', 'f', 2000],
  ['e', 'r', 800], // 少し待ってから reject
  ['f', 'f', 200],
  ['g', 'f', 1000],
  ['h', 'f', 600],
  ['i', 'f', 700],
  ['j', 'f', 300]
]

const c = new Chan<Promise<string>>(3, { rejectInReceiver: true })

;(async () => {
  let err: any
  for (let idx = 0; err === undefined && idx < s.length; idx++) {
    // print(`send start ${idx + 1}`)
    const p = genPromose(s[idx], print)
    p.catch((r) => {
      console.log(`handle reject(send loop) ${r}`)
      err = r
    })
    await c.send(p)
    // print(`send end ${idx + 1}`)
  }
  c.close()
})()
;(async () => {
  try {
    for await (let i of c.receiver()) {
      print(`recv value: ${i}`)
    }
  } catch (r) {
    console.log(`handle reject(recv loop) ${r}`)
  }
})()
