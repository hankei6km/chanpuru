import { Chan, timeoutPromise, workers } from '../../src/index.js'
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
        return () => genPromise(t, print)
      })(i)
      await ch.send(p)
    }

    ch.close()
  })()

  return workers<string>(3, ch.receiver())
}

const [cancelPromise, cancel] = timeoutPromise(1000)
cancelPromise.catch((r) => {
  print(`catch (main) ${r}`)
})

for await (let i of generateValues([cancelPromise, cancel])) {
  print(`recv ${i}`)
}

cancel()

print('done')
