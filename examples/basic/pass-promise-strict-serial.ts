import { Chan } from '../../src/index.js'
import { Src, log, genPromose } from '../util.js'

const { print } = log()

const s: Src[] = [
  ['a', 'f', 500],
  ['b', 'f', 700],
  ['c', 'f', 600],
  ['d', 'f', 2000],
  ['e', 'f', 800],
  ['f', 'f', 200],
  ['h', 'f', 1000],
  ['j', 'f', 600],
  ['k', 'f', 700]
]

const c = new Chan<() => Promise<string>>()

;(async () => {
  for (let idx = 0; idx < s.length; idx++) {
    // print(`send start ${idx + 1}`)
    // 受信側で p を実行するまで Promise の cb は実行されないので直列処理になる.
    const p = () => genPromose(s[idx], print)
    await c.send(p)
    // print(`send end ${idx + 1}`)
  }
  c.close()
})()
;(async () => {
  for await (let i of c.receiver()) {
    print(`recv value: ${await i()}`)
  }
})()
