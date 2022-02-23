import 'zx/globals'

$.verbose = false
const p = $`sleep 100`

p.then((v) => {
  console.log(`then: exitCode=${v.exitCode}`)
}).catch((r) => {
  console.log(`catch: exitCode=${r.exitCode}`)
})

p.child.on('close', (code, signal) => {
  console.log(`close: code=${code} signal=${signal}`)
})

p.child.on('SIGTERM', (a1, a2) => {
  console.log('s', a1, a2)
})

setTimeout(() => {
  p.kill('SIGTERM')
}, 2 * 1000)

// $ zx exit-code-by-kill.mjs
// catch: exitCode=null
