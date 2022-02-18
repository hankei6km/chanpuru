import EventEmitter from 'events'

class DummySignal extends EventEmitter {
  addEventListener(...args: any[]) {
    this.addListener(args[0], args[1])
  }
  removeEventListener(...args: any[]) {
    this.removeListener(args[0], args[1])
  }
}
export const getSignalAndAbort = (): [
  AbortSignal,
  AbortController['abort']
] => {
  const forceDummy = false
  if (forceDummy || typeof AbortController === 'undefined') {
    const signal = new DummySignal()
    return [signal as any, () => signal.emit('abort')]
  }
  const a = new AbortController()
  return [a.signal, () => a.abort()]
}
