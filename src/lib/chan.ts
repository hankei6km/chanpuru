export class Chan<T> {
  private bufSize = 0
  private buf!: Promise<T>[]
  private writeFunc!: (p: Promise<T>) => Promise<void>

  private bufPromise!: Promise<void>
  private bufResolve!: (value: void) => void

  private valuePromise!: Promise<T>
  private valueResolve!: (value: T) => void
  private valueReject!: (reason: any) => void

  private closed: boolean = false

  constructor(bufSize: number = 0) {
    this.bufSize = bufSize === 0 ? 1 : bufSize // バッファーサイズ 0 のときも内部的にはバッファーは必要.
    this.writeFunc = bufSize === 0 ? this._writeWithoutBuf : this._writeWithBuf
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
      this.valueReject = reject
    })
  }
  private valueRelease(v: T) {
    this.valueResolve(v)
  }
  private async _writeWithoutBuf(p: Promise<T>): Promise<void> {
    while (true) {
      if (this.buf.length === 0) {
        this.buf.push(p)
        this.bufRelease()
        await p // 外部にバッファーは存在しないことになっているので自身の処理が解決するまで待つ.
        return
      }
      await this.valuePromise
    }
  }
  private async _writeWithBuf(p: Promise<T>): Promise<void> {
    while (true) {
      if (this.buf.length < this.bufSize) {
        this.buf.push(p)
        this.bufRelease()
        return
      }
      await this.valuePromise
    }
  }
  async write(p: Promise<T>): Promise<void> {
    return this.writeFunc(p)
  }
  private async reciver(): Promise<{ value: T | undefined; done: boolean }> {
    // バッファーが埋まっていない場合は、write されるまで待つ.
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
              reject(r)
              this.valueReject(r)
            })
          })
      )
      // 待っている間に this.buf に push  されることもあるが、
      // race で返ってくる i は push される前の範囲におさまる.
      const [v, i] = await Promise.race(pa)
      this.buf.splice(i, 1)
      this.valueRelease(v)
      this.valueReset()
      return { value: v, done: false }
    }
    return { value: undefined, done: true }
  }
  async *reader(): AsyncGenerator<T, void, void> {
    try {
      while (true) {
        const i = await this.reciver()
        if (i.done) {
          return
        }
        yield i.value as any
      }
    } catch (e) {
      throw e
    }
  }
  close() {
    this.closed = true
    this.bufRelease()
  }
}
