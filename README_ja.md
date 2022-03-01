# chanpuru

Promise と Async Generator で並列的な処理を行う。

- `Promise` と Async Generator による値の送受信([`Chan`])
- [`Chan`] による `Promise` の同時実行制御([`workers()`]/[`payloads()`])
- `Promise.race` による Async Generator の選択とマージ([`select()`])
- `Promise` と AbortController によるキャンセル処理([`abortPromise()`]など)

これらは [Go] の Channle から影響を受けています。

## Installtion

```console
$ npm install --save chanpuru
```

## Usage

### paralle-jobs.ts

[`Chan`] で [zx] の `$` によるコマンド実行を並列化する。

![外部コマンドが並列的に実行されている様子](https://raw.githubusercontent.com/hankei6km/chanpuru/main/images/parallel-jobs.gif)

#### 送信

1. バッファーを確保した Channel を作成する
1. [zx] の `$` によるコマンド実行を送信するループを非同期で実行しておく
   - `$` は `Promise`(を拡張したオブジェクト)を返すので送信する
     - バッファーが埋まるまで `$` は連続して実行される
     - 受信されるとバッファーが空く
   - すべて送信したら Channel を閉じる
1. Chennl の Receiver を返す

バッファーサイズは `Promise` の実行数を制限していないので注意。
詳細は[pass-promise-paralle.ts](https://github.com/hankei6km/chanpuru/blob/main/examples/README.md#pass-promise-parallelts)を参照。

```ts
function computeHash(
  recvFiles: AsyncGenerator<string, void, void>,
  workerNum: number
): ChanRecv<ProcessOutput> {
  const ch = new Chan<Promise<ProcessOutput>>(workerNum - 1)

  ;(async () => {
    try {
      for await (const file of recvFiles) {
        console.log(chalk.greenBright(`start - ${file}`))
        await ch.send($`sha256sum ${file}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      ch.close()
    }
  })()

  return ch.receiver()
}
```

#### 受信

1. Receiver(Async Generator) を取得する
1. `for await...of` で結果を受信する
   - 結果は awaited になっている
   - バッファーが空くので送信側のブロックが解除される
1. すべてのコマンド(`Promise`)の結果を受信したらループを抜ける

```ts
const recvResults = computeHash(recvFiles, workerNum)
for await (const f of recvResults) {
  console.log(chalk.blueBright(f.stdout))
}
```

### log-multiple-sources.ts

- [zx] の `$` からの出力を `select()` でマージする
- いずれかのコマンドがエラーになればすべてのコマンドを停止する
- タイムアウトでも全てのコマンドを停止する

![複数ホストへの ping 実行状況をマージしながら表示している](https://raw.githubusercontent.com/hankei6km/chanpuru/main/images/log-multpiple-sources.gif)

#### 送信

1. コマンド出力を送信する Channel を作成
1. `$` でコマンドを非同期で実行しておく
   - 出力を行単位で Channel から送信する
   - cancel 用 `Promise`の決定されたらプロセスを kill する
   - エラー発生時
     1. エラー用 Channel へ `stderr` などを送信
     1. `cancel()` を実行し他の非同期関数に通知する
1. Chennl の Receiver を返す

```ts
function ping(
  [cancelPromise, cancel]: [Promise<void>, () => void],
  sendErr: ChanSend<any>,
  host: string
) {
  const ch = new Chan<string | Buffer>()
  ;(async () => {
    let zxProc: ProcessPromise<ProcessOutput> | undefined = undefined
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
```

#### 受信

1. 非同期関数でエラーを受信するループを実行しておく
   - データを受信したらエラー用処理を実行
1. [`select()`] 用にキーと Receriver を設定したオブジェクトを作成
1. `for await..of` で [`select()`] からログを受信する
   - [`select()`] では各 Async Generator からの `done` が渡されるので除外
   - 送信元(`host`) 別に処理を行う(今回は `decorate()` で実施)

```ts
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
    console.log(`[${decorate(host)(host)}] ${value.value.toString('utf-8')}`)
  }
}
```

## Examples

[Further examples](https://github.com/hankei6km/chanpuru/blob/main/examples/README.md)

## API

[API document](https://github.com/hankei6km/chanpuru/blob/main/docs/modules.md)

## License

MIT License

Copyright (c) 2022 hankei6km

[go]: https://go.dev/
[`chan`]: https://github.com/hankei6km/chanpuru/blob/main/docs/classes/Chan.md
[`workers()`]: https://github.com/hankei6km/chanpuru/blob/main/docs/modules.md#workers
[`payloads()`]: https://github.com/hankei6km/chanpuru/blob/main/docs/modules.md#payloads
[`select()`]: https://github.com/hankei6km/chanpuru/blob/main/docs/modules.md#select
[`abortpromise()`]: https://github.com/hankei6km/chanpuru/blob/main/docs/modules.md#abortpromise
[zx]: https://github.com/google/zx
