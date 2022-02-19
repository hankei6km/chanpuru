// import { AbortController } from 'abort-controller'
const AbortController =
  globalThis.AbortController ||
  (await import('abort-controller')).AbortController

export function emptyPromise(): [Promise<void>, () => void] {
  let pickResolve: () => void
  const cancel: () => void = () => {
    pickResolve()
  }

  const p = new Promise<void>((resolve, reject) => {
    pickResolve = resolve
  })
  return [p, cancel]
}

export function abortPromise(signal: AbortSignal): [Promise<void>, () => void] {
  let pickResolve: () => void
  const cancel: () => void = () => {
    pickResolve()
  }

  let pickReject: (r: any) => void
  const handleAbort = () => {
    pickReject('Aborted')
  }

  const p = new Promise<void>((resolve, reject) => {
    pickResolve = resolve
    pickReject = reject
    signal.addEventListener('abort', handleAbort)
  }).then(
    () => {
      signal.removeEventListener('abort', handleAbort)
      return
    },
    (r) => {
      signal.removeEventListener('abort', handleAbort)
      return Promise.reject(r)
    }
  )
  return [p, cancel]
}

export function timeoutPromise(timeout: number): [Promise<void>, () => void] {
  let id: any = undefined

  let pickResolve: () => void
  const cancel: () => void = () => {
    if (id !== undefined) {
      clearTimeout(id)
    }
    pickResolve()
  }

  const p = new Promise<void>((resolve, reject) => {
    pickResolve = resolve
    id = setTimeout(() => {
      id = undefined
      reject('Timeout')
    }, timeout)
  })
  return [p, cancel]
}

export function mixPromise(
  c: [Promise<void>, () => void][]
): [Promise<void>, () => void] {
  const race = Promise.race(c.map(([p]) => p))
    .then(() => cancelAll())
    .catch((r) => {
      cancelAll()
      return Promise.reject(r)
    })
  const cancelAll = () => {
    c.forEach(([_c, cancel]) => cancel())
  }
  return [race, cancelAll]
}

export function chainSignal(c: Promise<void>): [Promise<void>, AbortSignal] {
  const ac = new AbortController()
  const p = c
    .then(() => {
      ac.abort()
    })
    .catch((r) => {
      ac.abort()
      return Promise.reject(r)
    })
  return [p, ac.signal]
}
