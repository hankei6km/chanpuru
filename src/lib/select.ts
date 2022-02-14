type NextPromise<T, TReturn> = {
  next: Promise<IteratorResult<T, TReturn>>
  key: string
  idx: number
  done: boolean
}
function next<T, TReturn, TNext>(
  key: string,
  v: AsyncGenerator<T, TReturn, TNext>,
  idx: number
): NextPromise<T, TReturn> {
  return { next: v.next(), key, idx, done: false }
}

export async function* select<T, TReturn = void, TNext = void>(
  gens: Record<string, AsyncGenerator<T, TReturn, TNext>>
): AsyncGenerator<[string, IteratorResult<T, TReturn>], void, void> {
  // .next() と generator を関連付ける配列に変換
  const nexts: NextPromise<T, TReturn>[] = Object.entries(gens).map(
    ([k, v], i) => next<T, TReturn, TNext>(k, v, i)
  )

  while (true) {
    // done している項目を除去し、race に渡せる配列にする.
    // resolve と reject は nexts の項目を特定できる情報を付加する.
    const pa = nexts
      .filter(({ done }) => !done)
      .map(
        ({ next, key, idx }) =>
          new Promise<{
            res: IteratorResult<T, TReturn>
            key: string
            idx: number
          }>(async (resolve, reject) => {
            try {
              resolve({ res: await next, key, idx })
            } catch (r) {
              reject({ reason: r, key, idx })
            }
          })
      )
    // 配列が 0 なら終了.
    if (pa.length === 0) {
      break
    }

    try {
      const n = await Promise.race(pa)
      yield [n.key, n.res]
      if (n.res.done) {
        // done が付いていれば、対応する nexts の項目を終了させる.
        nexts[n.idx].done = true
      } else {
        // 新しい next() をセットする.
        nexts[n.idx] = next(n.key, gens[n.key], n.idx)
      }
    } catch (r: any) {
      // エラーの対応は iterator 側のよるので select の中では継続用の処理.
      // 新しい next() をセットする.
      if (!nexts[r.idx].done) {
        nexts[r.idx] = next(r.key, gens[r.key], r.idx)
      }
    }
  }

  return
}
