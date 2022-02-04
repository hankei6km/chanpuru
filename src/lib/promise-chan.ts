export class Make<T> {
  private bufSize = 0
  private buf!: Promise<T>[]
  private idx = 0

  private promise!: Promise<void>
  private resolve!: (value: void) => void

  private closed: boolean = false

  constructor(bufSize: number = 0) {
    this.bufSize = bufSize + 1 // バッファーサイズ 0 のときも内部的にはバッファーは必要.
    this.reset()
  }
  private reset() {
    this.buf = []
    this.idx = 0
    this.promise = new Promise((resolve) => {
      this.resolve = resolve
    })
  }
  private release() {
    this.resolve()
  }
  async write(p: Promise<T>): Promise<void> {
    // TODO: push() を使わない処理変更.
    // push() を使わない場合、close() での release でバッファーを詰める必要がある.
    this.buf.push(p)
    this.idx++
    if (this.idx >= this.bufSize) {
      await Promise.all(this.buf)
      this.release()
    }
    return
  }
  async *reader(): AsyncGenerator<T, void, void> {
    while (true) {
      await this.promise
      for (let c of this.buf) {
        yield await c // write からの release() では pendingd でない、close からの release() では pending.
      }
      if (this.closed) {
        break
      }
      this.reset()
    }
  }
  close() {
    this.closed = true
    this.release()
  }
}
