export class WaitCnt {
  private cnt = 0
  private waitPromise!: Promise<void>
  private waitResolve!: () => void
  constructor() {
    this.waitPromise = new Promise<void>((resolve) => {
      this.waitResolve = resolve
    })
  }
  add(n: number) {
    this.cnt = this.cnt + n
  }
  done() {
    this.cnt--
    if (this.cnt <= 0) {
      this.waitResolve()
    }
  }
  async wait() {
    await this.waitPromise
  }
}
