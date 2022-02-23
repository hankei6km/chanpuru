import { opendir } from 'fs/promises'
import { join } from 'path'
import { ProcessOutput } from 'zx'
import 'zx/globals'
import { Chan, ChanRecv } from '../../src/index.js'

/**
 * ディレクトリーに含まれるファイルのファイル名を生成する
 * https://gist.github.com/lovasoa/8691344
 * @param dir - ファイル一覧を取得するディレクトリーの名前(PATH).
 * @returns
 */
async function* walk(dir: string): AsyncGenerator<string, void, void> {
  for await (const d of await opendir(dir)) {
    const entry = join(dir, d.name)
    if (d.isDirectory()) {
      yield* walk(entry)
    } else if (d.isFile()) {
      yield entry
    }
  }
}

/**
 * ファイル名を受信したら Hash 値を計算し結果を送信する.
 *
 * Hash の計算は `sha256sum` コマンドを利用する.
 * コマンドは複数同時に実行される.
 * @param recvFiles - ファイル名を受け取る.
 * @param workerNum - Hash を計算する Worker の数.
 * @returns 送信された Hash 値を受信する Receiver.
 */
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

$.verbose = false
const now = Date.now()
const workerNum = 3

console.log('start')

const recvFiles = walk('./examples')
const recvResults = computeHash(recvFiles, workerNum)
for await (const f of recvResults) {
  console.log(chalk.blueBright(f.stdout))
}

console.log(`elapsed time ${Date.now() - now}`)
