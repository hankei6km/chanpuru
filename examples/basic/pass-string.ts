import { Chan } from '../../src/index.js'
import { log } from '../util.js'

const { print, printElapsed } = log()

const s = ['a', 'b', 'c', 'd', 'e', 'f']

const c = new Chan<string>()

;(async () => {
  for (let idx = 0; idx < s.length; idx++) {
    print(`send start ${idx + 1}`)
    await c.send(s[idx])
    print(`send end ${idx + 1}`)
  }
  c.close()
})()
;(async () => {
  for await (let i of c.receiver()) {
    print(`recv value: ${i}`)
  }
})()
