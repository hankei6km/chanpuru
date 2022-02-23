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
  let nextsEnd = nexts.length - 1

  try {
    while (nextsEnd >= 0) {
      // done していない項目(配列内の nextsEnd までが該当)を race に渡せる配列にする.
      // resolve と reject では nexts の項目を特定できる情報を付加する.
      const arrayToRace: Promise<NextInRace<T, TReturn>>[] = new Array(
        nextsEnd + 1
      )
      for (let idx = 0; idx <= nextsEnd; idx++) {
        const { next, key } = nexts[idx]
        arrayToRace[idx] = new Promise<NextInRace<T, TReturn>>(
          async (resolve, reject) => {
            try {
              resolve({ res: await next, key, idx })
            } catch (r) {
              reject({ reason: r, key, idx })
            }
          }
        )
      }

      try {
        const n = await Promise.race(arrayToRace)
        yield [n.key, n.res]
        // 今回 yield された next を退避してから一旦取り除く(配列をつめる).
        const save = nexts[n.idx]
        for (let idx = n.idx + 1; idx <= nextsEnd; idx++) {
          nexts[idx - 1] = nexts[idx]
        }
        if (n.res.done) {
          // done を設定し、末尾の位置をずらす.
          save.done = true
          nexts[nextsEnd] = save
          nextsEnd--
        } else {
          // 新しい next() をセットする.
          nexts[nextsEnd] = next(n.key, gens[n.key])
        }
      } catch (r: any) {
        // エラーの対応は iterator 側によるので select の中では処理を継続させる
        // 上記のような配列を組み替えることはしない(たいていは done になるはず).
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
