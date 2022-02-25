# chanpuru

Parallel processing by Promise + Async Generator.

- Sending and receiving values by `Promise` and Async Generator ([`Chan`])
- Control multiple `Promise` concurrent executions by [`Chan`] \([`workers()`] / [`payloads()`])
- Selecting and merging Async Generators with `Promise.race` ([`select()`])
- Cancellation by `Promise` and AbortController ([`abortPromise()`] etc.)

These are influenced by [Go] Channle.

## Installtion

```console
$ npm install --save chanpuru
```

## Usage

### paralle-jobs.ts

Parallelize command execution by `$` of [zx] with [`Chan`].

![External commands(sha256sum) are being executed in parallel](https://raw.githubusercontent.com/hankei6km/chanpuru/main/docs/parallel-jobs.gif)

#### Send

1. Make a Channel with a buffer
1. Asynchronously execute a loop that sends the `$` command to channel
   - send `Promise` that is returned from `$`(it returns `ProcessPromise`)
     - `$` executes commands continuously until buffer is filled
     - Buffered items will be consumed by received
   - Close Channel after sending all
1. Return Receiver of Channel

Note that the buffer size does not limit the number of `Promise` executions.
Refer [pass-promise-paralle.ts](https://github.com/hankei6km/chanpuru/blob/main/examples/README.md#pass-promise-parallelts) to details.

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

#### Receive

1. Get Receiver(Async Generator)
1. Receive results with `for await...of`
   - Each result is awaited
   - Buffer of Channel is not filled, `await send` will be released
1. Exit the loop after all commands (`Promise`) received

```ts
const recvResults = computeHash(recvFiles, workerNum)
for await (const f of recvResults) {
  console.log(chalk.blueBright(f.stdout))
}
```

### log-multiple-sources.ts

- Merge the output from `$` of [zx] with `select ()`
- Stop all commands if any command exit with error status
- Stop all commands even if timed out

![Displaying while merging the ping execution status to multiple hosts](https://raw.githubusercontent.com/hankei6km/chanpuru/main/docs/log-multpiple-sources.gif)

#### Send

1. Make a Channel to send command output
1. Execute the command asynchronously with `$`
   - Send output line by line to Channel
   - kill the process when the `cancelPromise` is settled
   - When an error occurs
     1. Send `stderr` etc. to the error channel
     1. Call `cancel ()` to notify other asynchronous functions via `cancelPromise`
1. Returns Receiver of Channe;

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
    cancelPromise
      .catch(() => {})
      .finally(() => {
        // コードが側からの kill.
        abortOwn = true
        zxProc && zxProc.kill()
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
            if (abortOwn && r.exitCode === null) {
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
        sendErr(`host: ${host}\nexitCopde: ${err.exitCode}\n${err.stderr}`)
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

#### Receive

1. Execute a loop that receives an error with an asynchronous function
   - When data is received, executed error process
1. Create an object with key and Receriver for [`select()`]
1. Receive logs via [`select()`] with `for await..of`
   - `done` is passed from each Async Generators via [`select()`]
   - Process by source key(`host`)

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
