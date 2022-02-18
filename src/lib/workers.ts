import { ChanRecv, Chan, ChanSend } from './chan.js'

export type WorkersOpts = {
  keepOrder?: boolean
}
function workersOptsDefault(): Required<WorkersOpts> {
  return {
    keepOrder: false
  }
}

async function workerOVertake<T>(
  send: ChanSend<Awaited<T>>,
  recv: ChanRecv<() => Promise<T>>
) {
  for await (let i of recv) {
    try {
      await send(await i())
    } catch {}
  }
}

async function worker<T>(
  send: ChanSend<Promise<T>>,
  recv: ChanRecv<() => Promise<T>>
) {
  for await (let i of recv) {
    await send(i())
  }
}

function workerArray<TSend, TRecv>(
  max: number,
  f: (send: ChanSend<TSend>, recv: ChanRecv<TRecv>) => Promise<void>,
  send: ChanSend<TSend>,
  recv: ChanRecv<TRecv>
): Promise<void>[] {
  const w: Promise<void>[] = []
  for (let i = 0; i < max; i++) {
    w.push(f(send, recv))
  }
  return w
}

export function workers<T>(
  max: number,
  recv: ChanRecv<() => Promise<T>>,
  opts: WorkersOpts = {}
): ChanRecv<T> {
  const { keepOrder } = Object.assign(workersOptsDefault(), opts)

  const ch = new Chan<Promise<T> | Awaited<T>>(0)
  ;(async () => {
    await Promise.all(
      workerArray(max, opts.keepOrder ? worker : workerOVertake, ch.send, recv)
    )
    ch.close()
  })()

  return ch.receiver()
}

async function payloadOvertake<T, TPayload>(
  send: ChanSend<[Awaited<T>, TPayload]>,
  recv: ChanRecv<[() => Promise<T>, TPayload]>
) {
  for await (let i of recv) {
    try {
      await send([await i[0](), i[1]])
    } catch {}
  }
}

async function payload<T, TPayload>(
  send: ChanSend<[Promise<T>, TPayload]>,
  recv: ChanRecv<[() => Promise<T>, TPayload]>
) {
  for await (let i of recv) {
    await send([i[0](), i[1]])
  }
}

export function _payloadsOverTake<T, TPayload>(
  max: number,
  recv: ChanRecv<[() => Promise<T>, TPayload]>,
  opts: WorkersOpts
): ChanRecv<[Awaited<T>, TPayload]> {
  const ch = new Chan<[Awaited<T>, TPayload]>(0)
  ;(async () => {
    await Promise.all(workerArray(max, payloadOvertake, ch.send, recv))
    ch.close()
  })()

  return ch.receiver()
}

export function _payloads<T, TPayload>(
  max: number,
  recv: ChanRecv<[() => Promise<T>, TPayload]>,
  opts: WorkersOpts
): ChanRecv<[Awaited<T>, TPayload]> {
  const awaitCh = new Chan<[Promise<T> | Awaited<T>, TPayload]>(0)
  const ch = new Chan<[Awaited<T>, TPayload]>(0)
  ;(async () => {
    await Promise.all(
      workerArray(
        max - 1, // awaitCh で 1 つ実行状態になるので -1 する.
        payload,
        awaitCh.send,
        recv
      )
    )
    awaitCh.close()
  })()
  ;(async () => {
    for await (let i of awaitCh.receiver()) {
      try {
        ch.send([await i[0], i[1]])
      } catch {}
    }
    ch.close()
  })()

  return ch.receiver()
}

export function payloads<T, TPayload>(
  max: number,
  recv: ChanRecv<[() => Promise<T>, TPayload]>,
  opts: WorkersOpts = {}
): ChanRecv<[Awaited<T>, TPayload]> {
  const { keepOrder } = Object.assign(workersOptsDefault(), opts)

  if (keepOrder && max > 1) {
    // 同時実行数 1 では対応できない.
    // (1 なら順庵はかわらないので _payloadsOverTake を利用)
    return _payloads(max, recv, opts)
  }
  return _payloadsOverTake(max, recv, opts)
}
