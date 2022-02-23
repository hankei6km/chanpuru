type NextPromise<T, TReturn> = {
  next: Promise<IteratorResult<T, TReturn>>
  key: string
  done: boolean
}
type NextInRace<T, TReturn> = {
  res: IteratorResult<T, TReturn>
  key: string
  idx: number
}
function next<T, TReturn, TNext>(
  key: string,
  v: AsyncGenerator<T, TReturn, TNext>
): NextPromise<T, TReturn> {
  return { next: v.next(), key, done: false }
}

/**
 * Receive in order from the value that is settled until all generators has be done.
 * @template T
 * @template TReturn
 * @template TNext
 * @param gens The object is contained generators with key name.
 * @returns Async generator to receive the value from generators that is settled with key name of generator.
 */
export async function* select<T, TReturn = void, TNext = void>(
  gens: Record<string, AsyncGenerator<T, TReturn, TNext>>
): AsyncGenerator<[string, IteratorResult<T, TReturn>], void, void> {
  // .next() と generator を関連付ける配列に変換
  const nexts: NextPromise<T, TReturn>[] = Object.entries(gens).map(([k, v]) =>
    next<T, TReturn, TNext>(k, v)
  )
  const nextsLen = nexts.length
  const nextsBottom = nextsLen - 1

  try {
    while (true) {
      // done している項目を除去し、race に渡せる配列にする.
      // resolve と reject は nexts の項目を特定できる情報を付加する.
      const arrayToRace: Promise<NextInRace<T, TReturn>>[] = []
      nexts.forEach(({ next, key, done }, idx) => {
        if (done) {
          return
        }
        arrayToRace.push(
          new Promise<NextInRace<T, TReturn>>(async (resolve, reject) => {
            try {
              resolve({ res: await next, key, idx })
            } catch (r) {
              reject({ reason: r, key, idx })
            }
          })
        )
      })
      // 配列が 0 なら終了.
      if (arrayToRace.length === 0) {
        break
      }

      try {
        const n = await Promise.race(arrayToRace)
        yield [n.key, n.res]
        if (n.res.done) {
          // done が付いていれば、対応する nexts の項目を終了させる.
          nexts[n.idx].done = true
        } else {
          // 新しい next() をセットする.
          // nexts[n.idx] = next(n.key, gens[n.key], n.idx)
          for (let idx = n.idx + 1; idx < nextsLen; idx++) {
            nexts[idx - 1] = nexts[idx]
          }
          nexts[nextsBottom] = next(n.key, gens[n.key])
        }
      } catch (r: any) {
        // エラーの対応は iterator 側のよるので select の中では継続用の処理.
        // 新しい next() をセットする.
        if (!nexts[r.idx].done) {
          nexts[r.idx] = next(r.key, gens[r.key])
        }
      }
    }
  } finally {
    for (let i of nexts) {
      if (!i.done) {
        await gens[i.key].return(undefined as any)
        i.done = true
      }
    }
  }

  return
}
