export type Src = [string, 'f' | 'r', number]

export const genPromose: (
  s: Src,
  printer: (msg: string) => void
) => Promise<string> = ([value, flag, timeout], printer) =>
  new Promise<string>((resolve, reject) => {
    printer(`promise start ${value}`)
    setTimeout(() => {
      if (flag === 'f') {
        resolve(value)
      } else {
        reject(`rejected: ${value}`)
      }
      printer(`promise end ${value}`)
    }, timeout)
  })

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
