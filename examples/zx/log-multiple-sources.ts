import { createInterface } from 'readline'
import { $, chalk, ProcessOutput, ProcessPromise } from 'zx'
import {
  Chan,
  ChanRecv,
  ChanSend,
  select,
  timeoutPromise
} from '../../src/index.js'

$.verbose = false

const timeout = 1000 * 7
const hosts = {
  HOST1: 'google.com',
  HOST2: 'github.com',
  HOST3: 'yahoo.com'
}

/**
 * ログ出力として ping を実行する.
 * @param param0 - キャンセル用 Promise と cancel 関数.
 * @param sendErr - エラー用 Channel へエラーを送信するための関数.
 * @param host - ping の宛先ホスト.
 * @returns 送信されれた ping のログを受信する Receiver.
 */
function ping(
  [cancelPromise, cancel]: [Promise<void>, () => void],
  sendErr: ChanSend<any>,
  host: string
) {
  const ch = new Chan<string | Buffer>()
  ;(async () => {
    let zxProc: ProcessPromise | undefined = undefined
    // cancel されたときの処理.
    let abortOwn = false
    const signalName = 'SIGTERM'
    cancelPromise
      .catch(() => {})
      .finally(() => {
        // コードが側からの kill.
        abortOwn = true
        zxProc && zxProc.kill(signalName)
      })
    try {
      // ping 開始(await しない).
      zxProc = $`ping -c 7 ${host}`
      // ping の stdout を行単位での読み取り行う.
      const rl = createInterface({
        input: zxProc.stdout,
        crlfDelay: Infinity
      })
      for await (const s of rl) {
        // 読み取った行をログとして送信する.
        ch.send(s)
      }
      // プロセスの完了を待つ.
      // この時点で reject されていれば throw される.
      await zxProc
        .catch((r) => {
          if (r instanceof ProcessOutput) {
            if (abortOwn && r.exitCode === null && r.signal === signalName) {
              // 今回はコード側からの kill はエラーとしない.
              ch.send(`aborted`)
              return
            }
          }
          throw r
        })
        .finally(() => {
          zxProc = undefined
        })
    } catch (err) {
      if (err instanceof ProcessOutput) {
        // プロセスの異常終了.
        sendErr(
          `host: ${host}\nexitCopde: ${err.exitCode}\nsignal: ${err.signal}\n${err.stderr}`
        )
      } else {
        // その他のエラー.
        sendErr(`host: ${host}, err: ${err}`)
      }
      cancel() // 全体の処理をキャンセルさせる.
    } finally {
      // 後処理.
      ch.close()
    }
  })()

  return ch.receiver()
}

/**
 * ログに色を付ける関数を取得する.
 * @param host - ログの key 名.
 * @returns 色を付ける関数.
 */
function decorate(host: string) {
  switch (host) {
    case 'HOST1':
      return chalk.greenBright
    case 'HOST2':
      return chalk.blueBright
    case 'HOST3':
      return chalk.magentaBright
  }
  return chalk.gray
}

// 終了時のステータス.
// エラーが発生したら 0 以外に設定される.
let exitStatus = 0

// エラーを送受信する Channel.
const errCh = new Chan<any>()

// 一定時間で cancel させる Promise.
const [cancelPromise, cancel] = timeoutPromise(timeout)
cancelPromise.catch((r) => {
  // タイムアウトのエラーを送信(表示).
  errCh.send('Reached the deadline')
})

// エラーを受信するループ.
// 非同期に実行させておく.
;(async () => {
  for await (const err of errCh.receiver()) {
    console.error(chalk.redBright(`${err}`))
    // エラーだったのでコードを変更.
    exitStatus = 1
  }
})()

// select に渡す key と Async Generator をセットするオブジェクト.
const jobs: Record<string, ChanRecv<string | Buffer>> = {}
// ping から送信されるログの Receiver(Async Generator) をセットする.
Object.entries(hosts).forEach(([k, v]) => {
  jobs[k] = ping([cancelPromise, cancel], errCh.send, v)
})

// ログを受信するループ.
for await (const [host, value] of select(jobs)) {
  if (!value.done) {
    console.log(
      `[${decorate(host)(host)}] ${decorate(host)(
        value.value.toString('utf-8')
      )}`
    )
  }
}

// 後処理.
errCh.close()
cancel()

if (exitStatus != 0) {
  process.exit(exitStatus)
}
