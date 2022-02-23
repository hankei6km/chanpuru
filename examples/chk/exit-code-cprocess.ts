import { spawn } from 'child_process'

const p = spawn('sleep', ['100'])

p.on('close', (code, signal) => {
  console.log('close', code, signal)
})

p.on('exit', (code, signal) => {
  console.log('exit', code, signal)
})

setTimeout(() => {
  p.kill('SIGTERM')
}, 3 * 1000)
