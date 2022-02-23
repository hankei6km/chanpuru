import { default as fetch } from 'node-fetch'
import {
  ChanSend,
  Chan,
  ChanRecv,
  workers,
  abortPromise,
  timeoutPromise,
  mixPromise
} from '../../src/index.js'
const sp = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']

function fetchWork(
  cancelPromise: Promise<void>,
  max: number,
  url: string[],
  sendStat: ChanSend<string>,
  sendErr: ChanSend<any>
): ChanRecv<void> {
  const ch = new Chan<() => Promise<void>>()
  ;(async () => {
    const ac = new AbortController() // ループ全体と各 fetch を Aobrt させるコントローラー.
    // 全体のキャンセル処理にあわせて abort させる.
    cancelPromise.catch((r) => {
      ac.abort()
      aborted = true // Abort されたらフラグを変更しループ停止.
    })
    let aborted = false
    for (let u of url) {
      if (aborted) {
        // Abort されているのでループを停止.
        break
      }
      const p = (t: string) => {
        return async () => {
          // workers 内で実行される非同期関数(Promise)
          await sendStat(`start ${t}`)
          try {
            // fetch 開始.
            const resp = await fetch(t, { signal: ac.signal })
            if (resp.ok && resp.body) {
              let err: any = undefined
              resp.body.on('error', (e) => {
                err = e
              })
              // readable ストリームで受信.
              // 今回は空読みするだけ.
              for await (let i of resp.body) {
                // 進捗状況を送信.
                await sendStat(`recv ${t}`)
              }
              if (err) {
                throw err
              }
              await sendStat(`end ${t}`)
            } else {
              // ok でなければ throw し外側の catch で処理.
              throw new Error(`Fetch error ${resp.statusText}`)
            }
          } catch (e) {
            // 進捗状況にエラーを送信.
            // 親の cancelPromise が abort される.
            // 結果として ac.abort が実行され、ループも break される.
            await sendErr(`error ${t} ${e}`)
            // throw e
          }
        }
      }
      await ch.send(p(u))
    }
    ch.close()
  })()
  return workers(max, ch.receiver())
}

;(async () => {
  const ac = new AbortController()
  const [promise, cancelTimeout] = mixPromise([
    timeoutPromise(500), // 全体のタイムアウト.
    abortPromise(ac.signal)
  ])
  promise.catch(async (r) => {
    await errCh.send(r)
  })
  const statCh = new Chan<string>(3) // 進捗状況などを受け取る.
  const errCh = new Chan<string>() // エラーの収集.
  const recv = fetchWork(
    promise,
    3,
    [
      // $ docker run --rm -p 9000:80 kennethreitz/httpbin
      // $ docker run --rm -p 9001:80 kennethreitz/httpbin
      //'https://httpbin.org/stream-bytes/50',
      'http://localhost:9000/stream-bytes/10000',
      //'http://localhost:9000/status/404',
      'http://localhost:9001/stream-bytes/150000',
      'http://localhost:9000/stream-bytes/50000',
      'http://localhost:9001/stream-bytes/90000',
      'http://localhost:9000/stream-bytes/30000',
      'http://localhost:9001/stream-bytes/70000',
      'http://localhost:9000/stream-bytes/40000'
    ],
    statCh.send, // Channel の送信側を渡すことで進捗状況を送信してもらう.
    errCh.send // エラーの収集用.
  )
  ;(async () => {
    // 進捗状況を受信し表示する.
    for await (let i of statCh.receiver()) {
      console.log(i)
    }
  })()
  ;(async () => {
    // エラーを受信し表示と abort を行う.
    for await (let i of errCh.receiver()) {
      ac.abort()
      console.error(i)
    }
  })()
  // 今回は結果を受け取らないので単純な Wait 状態.
  for await (let i of recv) {
  }
  await statCh.send('=== done ===')
  statCh.close() // 進捗状況の送受信 Channel を閉じる.
  errCh.close() // エラー収集の送受信 Channel を閉じる.
  cancelTimeout() // タイムアウトをキャンセルする.
})()
