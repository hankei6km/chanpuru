export type ChanOpts = {
  rejectInReceiver?: boolean
}

export class Chan<T> {
  private opts: ChanOpts = { rejectInReceiver: false }
  private bufSize = 0
  private buf!: T[]
  private sendFunc!: (p: T) => Promise<void>

  private bufPromise!: Promise<void>
  private bufResolve!: (value: void) => void

  private valuePromise!: Promise<void>
  private valueResolve!: (value: void) => void

  private closed: boolean = false

  constructor(bufSize: number = 0, opts: ChanOpts = {}) {
    if (opts.rejectInReceiver !== undefined) {
      this.opts.rejectInReceiver = opts.rejectInReceiver
    }
    this.bufSize = bufSize === 0 ? 1 : bufSize // バッファーサイズ 0 のときも内部的にはバッファーは必要.
    this.sendFunc = this._sendWithBuf
    this.buf = []
    this.bufReset()
    this.valueReset()
  }
  private bufReset() {
    this.bufPromise = new Promise((resolve) => {
      this.bufResolve = resolve
    })
  }
  private bufRelease() {
    this.bufResolve()
  }
  private valueReset() {
    this.valuePromise = new Promise((resolve, reject) => {
      this.valueResolve = resolve
    })
  }
  private valueRelease() {
    this.valueResolve()
  }
  private async _sendWithBuf(p: T): Promise<void> {
    while (true) {
      if (this.buf.length < this.bufSize) {
        this.buf.push(p)
        this.bufRelease()
        return
      }
      await this.valuePromise
    }
  }
  async send(p: T): Promise<void> {
    if (this.closed) {
      throw new Error('panic: send on closed channel')
    }
    return this.sendFunc(p)
  }
  private async _receiver(): Promise<{ value: T | undefined; done: boolean }> {
    // バッファーが埋まっていない場合は、send されるまで待つ.
    // close されていれば素通し.
    while (this.buf.length < this.bufSize && !this.closed) {
      await this.bufPromise
      this.bufReset()
    }
    // バッファーを消費していたら終了.
    // 通常は消費しない、close されていれば何度か呼びだされるうちに消費される.
    if (this.buf.length > 0) {
      const v = this.buf.shift()
      // send 側へ空きができたことを通知.
      this.valueRelease()
      this.valueReset()
      return { value: v, done: false }
    }
    this.clean()
    return { value: undefined, done: true }
  }
  async *receiver(): AsyncGenerator<T, void, void> {
    while (true) {
      try {
        const i = await this._receiver()
        if (i.done) {
          return
        }
        yield i.value as any
      } catch (r) {
        // T が Promise のときは yield で待つようなので catch する.
        if (this.opts.rejectInReceiver) {
          this.clean() // ここで Promise の処理入れたくないのだが.
          yield Promise.reject(r)
        }
      }
    }
  }
  private clean() {
    this.bufRelease()
    this.valueRelease()
  }
  close() {
    this.closed = true
    this.clean()
  }
}
