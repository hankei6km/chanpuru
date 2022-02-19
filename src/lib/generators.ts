import { send } from 'process'
import { Chan } from './chan.js'

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

export async function* _fromReadableStreamGenerator<T>(
  s: ReadableStream<T>
): AsyncGenerator<T, void, void> {
  const reader = s.getReader()
  let r = await reader.read()
  while (!r.done) {
    yield r.value
  }
}

export async function* _fromNodeJsReadableStreamGenerator(
  s: NodeJS.ReadableStream
): AsyncGenerator<string | Buffer, void, void> {
  for await (let i of s) {
    yield i
  }
}

function isReadableStream(
  s: ReadableStream | NodeJS.ReadableStream
): s is ReadableStream {
  if (typeof ReadableStream !== 'undefined' && s instanceof ReadableStream) {
    return true
  }
  return false
}

export function fromReadableStreamGenerator<T>(
  s: ReadableStream<T>
): AsyncGenerator<T, void, void>

export function fromReadableStreamGenerator<T>(
  s: NodeJS.ReadableStream
): AsyncGenerator<string | Buffer, void, void>

export function fromReadableStreamGenerator<T>(
  s: ReadableStream<T> | NodeJS.ReadableStream
): AsyncGenerator<T, void, void> | AsyncGenerator<string | Buffer, void, void> {
  if (isReadableStream(s)) {
    return _fromReadableStreamGenerator(s)
  }
  // NodeJS.ReadableStream は for await...of で使えるから Generator 化は必須ではないが、
  // fetch で使うかもしれないので.
  return _fromNodeJsReadableStreamGenerator(s)
}

export function breakGenerator<T = unknown, TReturn = any, TNext = unknown>(
  signal: AbortSignal,
  srcGenerator: AsyncGenerator<T, TReturn, TNext>,
  retrunValue?: TReturn
): AsyncGenerator<T, TReturn, TNext>
export function breakGenerator<T = unknown, TReturn = any, TNext = unknown>(
  cancelPromise: Promise<void>,
  srcGenerator: AsyncGenerator<T, TReturn, TNext>,
  retrunValue?: TReturn
): AsyncGenerator<T, TReturn, TNext>
export async function* breakGenerator<
  T = unknown,
  TReturn = any,
  TNext = unknown
>(
  sc: AbortSignal | Promise<void>,
  srcGenerator: AsyncGenerator<T, TReturn, TNext>,
  retrunValue?: TReturn
): AsyncGenerator<T, TReturn, TNext> {
  let breaked = false
  const handleCancel = () => {
    breaked = true
  }
  const cleanup = () => {
    if (!(sc instanceof Promise)) {
      sc.removeEventListener('abort', handleCancel)
    }
  }
  try {
    if (!(sc instanceof Promise)) {
      sc.addEventListener('abort', handleCancel)
    } else {
      // reject でもループを終了するだけ.
      // エラー処理はループ終了は別に行う(はず).
      sc.then(() => handleCancel()).catch((r) => handleCancel())
    }
    // 最初の next() 前に終了していた場合.
    if (!breaked) {
      let v = await srcGenerator.next()
      while (!v.done && !breaked) {
        const n = yield v.value
        v = await srcGenerator.next(n)
      }
      if (!breaked) {
        // 外部から終了されていなかったらクリーンアップして最後の値を return する.
        return v.value as any
      }
    }
  } finally {
    // 外部から終了されていた場合の処理.
    // 上から処理が流れてきた場合と、外部で return() が実行された場合がある.
    cleanup()
  }
  return (await srcGenerator.return(retrunValue as any)).value as any
}
