export function log() {
  const saveNow = Date.now()
  return {
    print(msg: string) {
      console.log(` ${`${Date.now() - saveNow}`.padStart(4, '0')}: ${msg}`)
    },
    printElapsed(prefix: string, suffix?: string) {
      console.log(
        `${prefix}: ${`${Date.now() - saveNow}`.padStart(4, '0')}${
          suffix ? ` ${suffix}` : ''
        }`
      )
    }
  }
}
