import 'zx/globals'
import { Readable } from 'stream'
;(async () => {
  const r = Readable.from('abc')
  const sum = $`sha256sum`
  // sum.stdin.write('abc\n')
  // sum.stdin.end()
  r.pipe(sum.stdin)
  const { stdout } = await sum
  //console.log(stdout)
})()
