export type ChanOpts = {
  rejectInReceiver?: boolean
}

export class Chan<T> {
  protected opts: ChanOpts = { rejectInReceiver: false }
  protected bufSize = 0
  protected buf!: T[]
  protected sendFunc!: (p: T) => Promise<void>

  protected bufPromise!: Promise<void>
  protected bufResolve!: (value: void) => void

  protected valuePromise!: Promise<void>
  protected valueResolve!: (value: void) => void

  protected generatorClosed: boolean = false
  protected closed: boolean = false

  constructor(bufSize: number = 0, opts: ChanOpts = {}) {
    if (opts.rejectInReceiver !== undefined) {
      this.opts.rejectInReceiver = opts.rejectInReceiver
    }
    this.bufSize = bufSize === 0 ? 1 : bufSize // バッファーサイズ 0 のときも内部的にはバッファーは必要.
    this.sendFunc = bufSize === 0 ? this._sendWithoutBuf : this._sendWithBuf
    this.buf = []
    this.bufReset()
    this.valueReset()
  }
  protected bufReset() {
    this.bufPromise = new Promise((resolve) => {
      this.bufResolve = resolve
    })
  }
  protected bufRelease() {
    this.bufResolve()
  }
  protected valueReset() {
    this.valuePromise = new Promise((resolve, reject) => {
      this.valueResolve = resolve
    })
  }
  protected valueRelease() {
    this.valueResolve()
  }
  protected async _sendWithoutBuf(p: T): Promise<void> {
    while (!this.generatorClosed) {
      if (this.buf.length < this.bufSize) {
        this.buf.push(p)
        this.bufRelease()
        await this.valuePromise
        return
      }
      await this.valuePromise
    }
  }
  protected async _sendWithBuf(p: T): Promise<void> {
    while (!this.generatorClosed) {
      if (this.buf.length < this.bufSize) {
        this.buf.push(p)
        this.bufRelease()
        return
      }
      await this.valuePromise
    }
  }
  readonly send = async (p: T): Promise<void> => {
    if (this.closed) {
      throw new Error('panic: send on closed channel')
    }
    // TOOD: generatorClosed でループを抜けたかのステータスを返すか検討.
    // rejectInReceiver が有効だとバッファーに乗っているものでもドロップするので、
    // (yeield で reject を for await...of などに渡すと finally が実行されるので)
    // ここのステータスだけわかってもあまり意味はないか.
    return this.sendFunc(p)
  }
  private async gate(): Promise<{ done: boolean }> {
    // バッファーが埋まっていない場合は、send されるまで待つ.
    // close されていれば素通し.
    while (this.buf.length < this.bufSize && !this.closed) {
      await this.bufPromise
      this.bufReset()
    }
    // バッファーを消費していたら終了.
    // 通常は消費しない、close されていれば何度か呼びだされるうちに消費される.
    if (this.buf.length > 0) {
      return { done: false }
    }
    return { done: true }
  }
  async *receiver(): AsyncGenerator<Awaited<T>, void, void> {
    try {
      while (true) {
        try {
          const i = await this.gate()
          if (i.done) {
            return
          }
          yield this.buf[0]
        } catch (e) {
          if (this.opts.rejectInReceiver) {
            // value が Promise だった場合、receiver 側の for await...of などに reject を伝播させる.
            yield Promise.reject(e)
          }
        } finally {
          this.buf.shift()
          // send 側へ空きができたことを通知.
          this.valueRelease()
          this.valueReset()
        }
      }
    } finally {
      this.generatorClosed = true
      this.clean()
    }
  }
  protected clean() {
    this.bufRelease()
    this.valueRelease()
  }
  close() {
    this.closed = true
    this.clean()
  }
}

export type ChanSend<T> = Chan<T>['send']
export type ChanRecv<T> = ReturnType<Chan<T>['receiver']>
