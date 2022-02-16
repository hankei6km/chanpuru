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

export function beatsGenerator(
  opts: GeneratorOpts
): [AsyncGenerator<number, number, void>, () => void] {
  const { timeout: interval, count } = Object.assign(
    generatorOptsDefault(),
    opts
  )
  let timerId: any = undefined
  let resolveWait: undefined | (() => void)
  let canceled = false
  const cancel = () => {
    canceled = true
    if (timerId !== undefined && resolveWait !== undefined) {
      clearTimeout(timerId)
      resolveWait()
      timerId = undefined
      resolveWait = undefined
    }
  }

  async function* _gen(): AsyncGenerator<number, number, void> {
    const wait = async () => {
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

    const lim = count - 1 // done を 1 回と数えるため
    let beat = 0

    while (true) {
      if (count <= 0 || beat < lim) {
        await wait()
        if (!canceled) {
          yield beat
        } else {
          break
        }
      } else {
        // 終了時もカウントを渡すので待つ.
        await wait()
        break
      }
      beat++
    }

    cancel()
    return beat
  }
  return [_gen(), cancel]
}

export function rotateGenerator<T>(
  s: T[],
  opts: GeneratorOpts
): [AsyncGenerator<T, void, void>, () => void] {
  const _opts = { ...opts }
  const [b, canceled] = beatsGenerator(_opts)
  async function* _gen(): AsyncGenerator<T, void, void> {
    const len = s.length
    let cnt = 0
    if (len > 0) {
      for await (let beat of b) {
        cnt = beat
        yield s[cnt % len]
      }
      yield s[(cnt + 1) % len]
    }
    canceled()
  }
  return [_gen(), canceled]
}
