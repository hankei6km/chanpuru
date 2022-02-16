export function cancelPromise(): [Promise<void>, () => void] {
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

  const p = new Promise<void>((resolve, reject) => {
    pickResolve = resolve
    signal.addEventListener('abort', () => {
      reject('Aborted')
    })
  })
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
