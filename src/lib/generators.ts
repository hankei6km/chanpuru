export type GeneratorOpts = {
  timeout: number
  count?: number
}

function generatorOptsDefault(): Required<GeneratorOpts> {
  return {
    timeout: 0,
    count: 0
  }
}
export async function* beatsGenerator(
  cancelPromise: Promise<void>,
  opts: GeneratorOpts
): AsyncGenerator<number, number, void> {
  const { timeout: interval, count } = Object.assign(
    generatorOptsDefault(),
    opts
  )
  let timerId: any = undefined
  let resolveWait: undefined | (() => void)
  let canceled = false
  let rejected = false
  let rejectedReason: any
  const _cancel = () => {
    canceled = true
    if (timerId !== undefined && resolveWait !== undefined) {
      clearTimeout(timerId)
      resolveWait()
      timerId = undefined
      resolveWait = undefined
    }
  }
  const _wait = async () => {
    // cancel() // 現状ではないが定番なのでコメントとして残す.
    return new Promise<void>((resolve) => {
      resolveWait = resolve
      timerId = setTimeout(() => {
        timerId = undefined
        resolveWait = undefined
        resolve()
      }, interval)
    })
  }
  // cancel されたらタイマーを停止しキャンセル状態にする.
  // reject だった場合はタイマー停止後に reason を throw(yield)させる.
  cancelPromise
    .then(() => _cancel())
    .catch((r) => {
      _cancel()
      rejected = true
      rejectedReason = r
    })

  const lim = count - 1 // done を 1 回と数えるため
  let beat = 0

  try {
    while (true) {
      if (count <= 0 || beat < lim) {
        await _wait()
        if (!canceled) {
          yield beat
        } else {
          break
        }
      } else {
        // 終了時もカウントを渡すので待つ.
        await _wait()
        break
      }
      beat++
    }
    if (rejected) {
      yield Promise.reject(rejectedReason)
    }
  } finally {
    _cancel()
  }
  return beat
}

export async function* rotateGenerator<T>(
  cancelPromise: Promise<void>,
  s: T[],
  opts: GeneratorOpts
): AsyncGenerator<T, void, void> {
  const _opts = { ...opts }
  const b = beatsGenerator(cancelPromise, _opts)

  const len = s.length
  let cnt = 0
  if (len > 0) {
    for await (let beat of b) {
      cnt = beat
      yield s[cnt % len]
    }
    yield s[(cnt + 1) % len]
  }

  return
}
