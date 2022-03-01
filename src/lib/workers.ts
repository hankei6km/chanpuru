import { ChanRecv, Chan, ChanSend } from './chan.js'

/**
 * Options for worker / payloads
 */
export type WorkersOpts = {}
function workersOptsDefault(): Required<WorkersOpts> {
  return {}
}

async function worker<T>(
  send: ChanSend<Awaited<T>>,
  recv: ChanRecv<() => Promise<T>>
) {
  for await (let i of recv) {
    try {
      await send(await i())
    } catch {}
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

/**
 * Run workers instance.
 *
 * worksers run instance of `Promise` that is return from the funtcion received from receiver.
 * @template - Type of the value that will be return from instance of `Promise`.
 * @param max - Maximum number of worker to run instance of `Promise`.
 * @param recv - Receiver(Async generator) to recieve the function that is return instance of `Promise` in worker.
 * @param opts - Options.
 * @returns Receiver the value that is generated from insance of `Promise`.
 */
export function workers<T>(
  max: number,
  recv: ChanRecv<() => Promise<T>>,
  opts: WorkersOpts = {}
): ChanRecv<T> {
  const ch = new Chan<Promise<T> | Awaited<T>>(0)
  ;(async () => {
    await Promise.all(workerArray(max, worker, ch.send, recv))
    ch.close()
  })()

  return ch.receiver()
}

async function payload<T, TPayload>(
  send: ChanSend<[Awaited<T>, TPayload]>,
  recv: ChanRecv<[() => Promise<T>, TPayload]>
) {
  for await (let i of recv) {
    try {
      await send([await i[0](), i[1]])
    } catch {}
  }
}

/**
 * Run payloads instance.
 *
 * payload is receive array that is contained function(it return instance of `Promose`) and the value(payload).
 * @param max - Maximum number of payload to run instance of `Promise`.
 * @param recv - Receiver(Async generator) to receive the function that is return instance of `Promise` in payload and the value.
 * @param opts - Options.
 * @returns Receiver the value that is generated from insance of `Promise` and the value was sended payload.
 */
export function payloads<T, TPayload>(
  max: number,
  recv: ChanRecv<[() => Promise<T>, TPayload]>,
  opts: WorkersOpts = {}
): ChanRecv<[Awaited<T>, TPayload]> {
  const ch = new Chan<[Awaited<T>, TPayload]>(0)
  ;(async () => {
    await Promise.all(workerArray(max, payload, ch.send, recv))
    ch.close()
  })()

  return ch.receiver()
}
