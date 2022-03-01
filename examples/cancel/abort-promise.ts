import { chainSignal, Chan, emptyPromise, workers } from '../../src/index.js'
import { Src, log, genPromise } from '../util.js'

const { print } = log()

const s: Src[] = [
  ['a', 'f', 500],
  ['b', 'f', 700],
  ['c', 'f', 600],
  ['d', 'f', 2000],
  ['e', 'f', 800],
  ['f', 'r', 200],
  ['g', 'f', 1000],
  ['h', 'f', 600],
  ['i', 'f', 700],
  ['j', 'f', 300]
]

function generateValues([cancelPromise, cancel]: [Promise<void>, () => void]) {
  const ch = new Chan<() => Promise<string>>(0)

  let cancelled = false
  const [chainedPromise, signal] = chainSignal(cancelPromise)
  chainedPromise
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
          const p = new Promise<string>((resolve, reject) => {
            print(`promise start ${t[0]}`)
            // signal が abort されているか確認.
            if (!signal.aborted) {
              let timerId: any
              // abort 用のハンドラー .
              const handleAbort = () => {
                // 処理を停止.
                if (timerId) {
                  clearTimeout(timerId)
                  timerId = undefined
                }
                // reject.
                reject(`abort ${t[0]}`)
              }
              // ハンドラーの登録(1 回のみ).
              signal.addEventListener('abort', handleAbort, { once: true })
              // 実際の処理(このサンプルでは setTimeout が該当).
              timerId = setTimeout(() => {
                timerId = undefined
                // abort 以外で終了したのでハンドラーを削除.
                signal.removeEventListener('abort', handleAbort)
                if (t[1] === 'f') {
                  resolve(t[0])
                } else {
                  reject(`rejected ${t[0]}`)
                }
              }, t[2])
            } else {
              // signal が abort されていたので reject..
              reject(`signal aborted ${t[0]}`)
            }
          })
          p.catch((r) => {
            // Promise が reject されたので cancel() を実行し全体を停止.
            // これにより他 Worker の送信済 Promise などが停止される.
            print(`handle reject(send loop) ${r}`)
            cancel()
          })
          return p
        }
      })(i)
      await ch.send(p)
    }

    ch.close()
  })()

  return workers<string>(3, ch.receiver())
}

const [cancelPromise, cancel] = emptyPromise()
cancelPromise.catch((r) => {
  print(`catch (main) ${r}`)
})

for await (let i of generateValues([cancelPromise, cancel])) {
  print(`recv ${i}`)
}

cancel()

print('done')
