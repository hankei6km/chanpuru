import 'zx/globals'
import { Readable } from 'stream'
import {
  abortPromise,
  breakGenerator,
  chainSignal,
  Chan,
  ChanRecv,
  ChanSend,
  fromReadableStreamGenerator,
  mixPromise,
  timeoutPromise,
  workers
} from '../../src/index.js'
import { ProcessOutput, ProcessPromise } from 'zx'
const AbortController =
  globalThis.AbortController ||
  (await import('abort-controller')).AbortController

function fetchWork(
  cancelPromise: Promise<void>,
  max: number,
  url: string[],
  sendStat: ChanSend<string>,
  sendErr: ChanSend<any>
): ChanRecv<[string, ChanRecv<Uint8Array>]> {
  // worker(fetch) の同時実行数を管理するための Channel.
  const wokerCh = new Chan<() => Promise<void>>()
  // URL と URL から受信したデータを流し込む pipe用 Channel を送信するための Channel.
  const sendPipeCh = new Chan<[string, ChanRecv<Uint8Array>]>(0)
  ;(async () => {
    // 全体のキャンセル処理にあわせて abort させる.
    const [triggerPromise, signal] = chainSignal(cancelPromise)
    triggerPromise.catch((r) => {
      aborted = true // Abort されたらフラグを変更しループ停止.
    })
    let aborted = false
    for (let u of url) {
      if (aborted) {
        // Abort されているのでループを停止.
        break
      }
      // fetch した内容を pipe でつなげるための channel
      const pipeCh = new Chan<Uint8Array>()
      const p = (t: string, pipeCh: Chan<Uint8Array>) => {
        return async () => {
          // workers 内で実行される非同期関数(Promise)
          await sendStat(`fetch start ${t}`)
          try {
            const resp = await fetch(t, { signal: signal })
            if (resp.ok && resp.body) {
              let err: any = undefined
              // readable ストリームで受信.
              for await (let i of fromReadableStreamGenerator<Uint8Array>(
                resp.body
              )) {
                // 進捗状況を送信.
                await sendStat(`fetch recv ${t}`)
                // ストリームで受信した内容を pipe へ送信.
                await pipeCh.send(i)
              }
              if (err) {
                throw err
              }
              await sendStat(`fetch end ${t}`)
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
          } finally {
            // pipe は必ず閉じる.
            pipeCh.close()
          }
        }
      }
      // fetch 前に pipe を送信しておく.
      await sendPipeCh.send([u, pipeCh.receiver()])
      await wokerCh.send(p(u, pipeCh))
    }
    wokerCh.close()
    sendPipeCh.close()
  })()
  ;(async () => {
    for await (let _i of workers(max, wokerCh.receiver())) {
      // worker を実行させるためのループ
    }
  })()
  return sendPipeCh.receiver()
}

function hashWork(
  cancelPromise: Promise<void>,
  max: number,
  recv: ChanRecv<[string, ChanRecv<Uint8Array>]>,
  sendStat: ChanSend<string>,
  sendErr: ChanSend<any>
): ChanRecv<[string, string]> {
  const ch = new Chan<() => Promise<[string, string]>>()
  ;(async () => {
    const [triggerPromise, signal] = chainSignal(cancelPromise)
    triggerPromise.catch(() => {})
    // URL と  Channel を受信する.
    for await (let [url, i] of breakGenerator(signal, recv)) {
      const p = (url: string, t: ChanRecv<Uint8Array>) => {
        return async (): Promise<[string, string]> => {
          let ret: string = ''
          // workers 内で実行される非同期関数(Promise)
          await sendStat(`sha256sum start ${url}`)
          let sum: ProcessPromise<ProcessOutput>
          const handleAbort = () => {
            // 親が Abort されたら子プロセスを終了させる
            sum.kill()
          }
          try {
            // 受信した Channel から Reader を作成し sha256sum へ pipe をつなげる.
            const r = Readable.from(t)
            sum = $`sha256sum --`
            signal.addEventListener('abort', handleAbort)
            r.pipe(sum.stdin)
            const { stdout } = await sum
            ret = stdout
          } catch (e) {
            // 進捗状況にエラーを送信.
            // 親の cancelPromise が abort される.
            // 結果として ac.abort が実行され、ループも break される.
            await sendErr(`hash error ${url} ${e}`)
            // throw e
          } finally {
            signal.removeEventListener('abort', handleAbort)
          }
          await sendStat(`sha256sum end ${url}`)
          return [url, ret]
        }
      }
      await ch.send(p(url, i))
    }
    ch.close()
  })()
  return workers(max, ch.receiver())
}

;(async () => {
  const ac = new AbortController()
  // エラーのときに停止させるための Promise.
  const [promise, cancelAll] = mixPromise([
    timeoutPromise(5000), // 全体のタイムアウト.
    abortPromise(ac.signal) // 全体の abort
  ])
  promise.catch(async (r) => {
    await errCh.send(r)
  })
  const workerNum = 3
  const statCh = new Chan<string>(3) // 進捗状況などを受け取る.
  const errCh = new Chan<string>(3) // エラーの収集.
  const recvFromFetch = fetchWork(
    promise,
    workerNum,
    [
      // $ docker run --rm -p 9000:80 kennethreitz/httpbin
      // $ docker run --rm -p 9001:80 kennethreitz/httpbin
      //'https://httpbin.org/stream-bytes/50',
      // 'http://localhost:9000/stream-bytes/10000',
      // 'http://localhost:9001/stream-bytes/150000',
      // 'http://localhost:9000/stream-bytes/50000',
      // 'http://localhost:9001/stream-bytes/90000',
      // 'http://localhost:9000/status/404',
      // 'http://localhost:9000/stream-bytes/30000',
      // 'http://localhost:9001/stream-bytes/70000',
      // 'http://localhost:9000/stream-bytes/40000',
      'http://localhost:9000/image/jpeg',
      'http://localhost:9001/image/png',
      'http://localhost:9000/status/404',
      'http://localhost:9000/image/svg',
      'http://localhost:9001/image/webp',
      'http://localhost:9000/json'
    ],
    statCh.send, // Channel の送信側を渡すことで進捗状況を送信してもらう.
    errCh.send // エラーの収集用.
  )
  const recv = hashWork(
    promise,
    workerNum,
    recvFromFetch,
    statCh.send,
    errCh.send
  )

  ;(async () => {
    // 進捗状況を受信し表示する.
    for await (let i of statCh.receiver()) {
      console.log(i)
    }
  })()
  ;(async () => {
    // エラーを受信したら abort を行う(あわせて表示も).
    for await (let i of errCh.receiver()) {
      ac.abort() // 停止用の Promise が reject されるので catch している waorker なども止まる.
      console.error(i)
    }
  })()

  const hash: [string, string][] = []
  for await (let i of recv) {
    hash.push(i)
  }
  if (!ac.signal.aborted) {
    // abort していなければ結果を表示.
    console.log(hash)
    await statCh.send('=== done ===')
  }
  statCh.close() // 進捗状況の送受信 Channel を閉じる.
  errCh.close() // エラー収集の送受信 Channel を閉じる.
  cancelAll() // 停止用 Promise をキャンセルさせる
})()
