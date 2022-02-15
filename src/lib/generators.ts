export type GeneratorOpts = {
  interval: number
  count?: number
}

function generatorOptsDefault(): Required<GeneratorOpts> {
  return {
    interval: 0,
    count: 0
  }
}

export async function* beatsGenerator(
  opts: GeneratorOpts
): AsyncGenerator<number, number, boolean | void> {
  const { interval, count } = Object.assign(generatorOptsDefault(), opts)

  let beatResolve: () => void // = () => {} // 現状では同期的に Promise の cb まで実行されるのでコメントアウト.
  const intervalId = setInterval(() => beatResolve(), interval)

  const lim = count - 1 // done を 1 回と数えるため
  let beat = 0

  while (true) {
    if (count <= 0 || beat < lim) {
      await new Promise<void>((resolve) => (beatResolve = resolve))
      if (yield beat) {
        break
      }
    } else {
      // 終了時もカウントを渡すので待つ.
      await new Promise<void>((resolve) => (beatResolve = resolve))
      break
    }
    beat++
  }

  clearInterval(intervalId)
  return beat
}

export async function* rotateGenerator<T>(
  s: T[],
  opts: GeneratorOpts
): AsyncGenerator<T, void, boolean | void> {
  const len = s.length
  if (len > 0) {
    const _opts = { ...opts }
    if (typeof _opts.count === 'number') {
      _opts.count = _opts.count + 1
    }
    const b = beatsGenerator(_opts)
    let beat = await b.next()
    while (!beat.done) {
      const done = yield s[beat.value % len]
      beat = await b.next(done)
    }
  }
}
