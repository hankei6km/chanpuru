import { AbortController as pAbortController } from 'abort-controller'
const AbortController = globalThis.AbortController || pAbortController

/**
 * Class reperesenting a error that is thrown when Cancel Promise is rejected.
 */
export class CancelPromiseRejected extends Error {
  constructor(message: string) {
    //https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    super(message)
    Object.setPrototypeOf(this, CancelPromiseRejected.prototype)
  }
  get reason() {
    return this.message
  }
}

/**
 * Make empty `Promise` instance to used trigger to cancel context.
 * @returns - Instance of `Promise` with cancel(resolve) function ot `Promise`.
 */
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

/**
 * Make `Promise` instance with abort trigger to cancel context.
 * @param signal - Instance of AbortSignal to reject `Promise`.
 * @returns - Instance of `Promise` with cancel(resolve) function ot `Promise`.
 */
export function abortPromise(signal: AbortSignal): [Promise<void>, () => void] {
  let pickResolve: () => void
  const cancel: () => void = () => {
    pickResolve()
  }

  let pickReject: (r: any) => void
  const handleAbort = () => {
    pickReject(new CancelPromiseRejected('Aborted'))
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

/**
 *
 * Make `Promise` instance with abort trigger to cancel context.
 * @param timeout - Set value to timeout to reject `Promise`.
 * @returns - Instance of `Promise` with cancel(resolve) function ot `Promise`.
 */
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
      reject(new CancelPromiseRejected('Timeout'))
    }, timeout)
  })
  return [p, cancel]
}

/**
 * Make `Promise` instance that is settled by result from  `Promise.race`.
 * @param cancelPromises - Array that is contained instance of `Promise` with cancellation function.
 * @returns - Instance of `Promise` with cancel(resolve) function ot `Promise`.
 */
export function mixPromise(
  cancelPromises: [Promise<void>, () => void][]
): [Promise<void>, () => void] {
  const race = Promise.race(cancelPromises.map(([p]) => p))
    .then(() => cancelAll())
    .catch((r) => {
      cancelAll()
      return Promise.reject(r)
    })
  const cancelAll = () => {
    cancelPromises.forEach(([_c, cancel]) => cancel())
  }
  return [race, cancelAll]
}

/**
 * Make `AbortSignal` instance that will be abroted at `Promise` has sttled.
 * @param promise - Instance of `Promise` to used to abort signal.
 * @returns - Instance of `Promise` with signal that will be aborted at `Promise` has sttled.
 */
export function chainSignal(
  promise: Promise<void>
): [Promise<void>, AbortSignal] {
  const ac = new AbortController()
  const p = promise
    .then(() => {
      ac.abort()
    })
    .catch((r) => {
      ac.abort()
      return Promise.reject(r)
    })
  return [p, ac.signal]
}
