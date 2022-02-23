import { Chan, emptyPromise, workers } from '../../src/index.js'
import { Src, log, genPromise } from '../util.js'

const { print } = log()

const s: Src[] = [
  ['a', 'f', 500],
  ['b', 'f', 700],
  ['c', 'f', 600],
  ['d', 'r', 2000],
  ['e', 'f', 800],
  ['f', 'f', 200],
  ['g', 'f', 1000],
  ['h', 'f', 600],
  ['i', 'f', 700],
  ['j', 'f', 300]
]

function generateValues([cancelPromise, cancel]: [Promise<void>, () => void]) {
  const ch = new Chan<() => Promise<string>>(0)

  let cancelled = false
  cancelPromise
    .catch((r) => {
      print(`catch (generateValues) ${r}`)
    })
    .finally(() => {
      cancelled = true
      print('canclled (generateValues)')
    })
  ;(async () => {
    for (const i of s) {
      if (cancelled) {
        break
      }
      const p = ((t: Src) => {
        return () => {
          const pp = genPromise(t, print)
          pp.catch((r) => {
            print(`handle reject(send loop) ${r}`)
            cancel()
          })
          return pp
        }
      })(i)
      await ch.send(p)
    }

    ch.close()
  })()

  return workers<string>(3, ch.receiver(), { keepOrder: true })
}

const [cancelPromise, cancel] = emptyPromise()
cancelPromise
  .catch((r) => {
    print(`catch (main) ${r}`)
  })
  .finally(() => {
    print('canclled (main)')
  })

for await (let i of generateValues([cancelPromise, cancel])) {
  print(`recv ${i}`)
}

cancel()

print('done')
