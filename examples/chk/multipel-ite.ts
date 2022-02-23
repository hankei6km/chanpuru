import { Chan, ChanRace, ChanRecv, ChanSend, workers } from '../../src/index.js'
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

// const c2 = new Chan<string>(0)

// function worker<T>(
//   max: number,
//   recv: ChanRecv<() => Promise<T>>
// ): ChanRecv<Promise<T>> {
//   const ch = new Chan<Promise<T>>(0)
//   const w: Promise<void>[] = []
//   ;(async () => {
//     for (let i = 0; i < max; i++) {
//       w.push(
//         (async () => {
//           for await (let i of recv) {
//             try {
//               // await c2.send(await i())
//               await ch.send(i())
//             } catch (r) {
//               console.log(`relay catch ${r}`)
//             }
//           }
//         })()
//       )
//     }
//     await Promise.all(w)
//     ch.close()
//   })()
//   return ch.receiver()
// }

const ch = new Chan<() => Promise<string>>(0)
;(async () => {
  let abort = false
  for (let idx = 0; !abort && idx < s.length; idx++) {
    const p = () => {
      const t = genPromise(s[idx], print)
      t.catch((r) => {
        console.log(`catch ${r}`)
        abort = true
      })
      return t
    }
    await ch.send(p)
    // print(`send end ${idx + 1}`)
  }
  ch.close()
})()

const recv = workers<string>(3, ch.receiver())

;(async () => {
  for await (let i of recv) {
    print(`recv ${i}`)
  }
  print('done')
})()
