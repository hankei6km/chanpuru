export type ChanRaceOpts = {
  rejectInRecevier?: boolean
}

export class ChanRace<T> {
  private opts: ChanRaceOpts = { rejectInRecevier: false }
  private bufSize = 0
  private buf!: Promise<T>[]
  private sendFunc!: (p: Promise<T>) => Promise<void>

  private bufPromise!: Promise<void>
  private bufResolve!: (value: void) => void

  private valuePromise!: Promise<void>
  private valueResolve!: (value: void) => void

  private closed: boolean = false

  constructor(bufSize: number = 0, opts: ChanRaceOpts = {}) {
    if (opts.rejectInRecevier !== undefined) {
      this.opts.rejectInRecevier = opts.rejectInRecevier
    }

    this.bufSize = bufSize === 0 ? 1 : bufSize // バッファーサイズ 0 のときも内部的にはバッファーは必要.
    this.sendFunc = bufSize === 0 ? this._sendWithoutBuf : this._sendWithBuf
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
  private async _sendWithoutBuf(p: Promise<T>): Promise<void> {
    while (true) {
      if (this.buf.length === 0) {
        this.buf.push(p)
        this.bufRelease()
        // バッファーは存在しないことになっているので自身の処理が解決するまで待つ.
        // ここでの reject はここまで(バッファーがあるときと挙動をあわせる).
        // reason が必要であれば send 側で catch などを付けておく.
        await p.catch((_r) => {})
        return
      }
      await this.valuePromise
    }
  }
  private async _sendWithBuf(p: Promise<T>): Promise<void> {
    while (true) {
      if (this.buf.length < this.bufSize) {
        // バッファーが存在することになっているので自身の処理を待たない.
        // よって reject されてもここでは検出できない.
        // reason が必要であれば send 側で catch などを付けておく.
        this.buf.push(p)
        this.bufRelease()
        return
      }
      await this.valuePromise
    }
  }
  async send(p: Promise<T>): Promise<void> {
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
      const pa = this.buf.map(
        (b, i) =>
          new Promise<[T, number]>((resolve, reject) => {
            b.then((v) => resolve([v, i])).catch((r) => {
              reject([r, i])
              return r
            })
          })
      )
      // 待っている間に this.buf に push  されることもあるが、
      // race で返ってくる i は push される前の範囲におさまる.
      try {
        const [v, i] = await Promise.race(pa)
        this.buf.splice(i, 1)
        // send 側へ空きができたことを通知.
        this.valueRelease()
        this.valueReset()
        return { value: v, done: false }
      } catch ([r, i]) {
        if (typeof i === 'number') {
          this.buf.splice(i, 1)
        }
        // send 側へ空きができたことを通知が目的なので reject はしない.
        //this.valueReject(r)
        this.valueRelease()
        // generator 側へは reson を渡す.
        if (!this.opts.rejectInRecevier) {
          // generator 側で reject しない場合は継続するので reset(次の準備をする).
          // 継続した後にどのように処理するかは send 側の呼び出し元による
          // (reject を catch して close か?)
          this.valueReset()
        }
        throw r
      }
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
      } catch (e) {
        if (this.opts.rejectInRecevier) {
          yield Promise.reject(e)
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
