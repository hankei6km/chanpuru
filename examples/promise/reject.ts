import { Chan } from '../../src/index.js'

console.log('--continue')
await (async () => {
  const c = new Chan<Promise<string>>(2)

  const pa = [
    Promise.resolve('0'),
    Promise.resolve('1'),
    Promise.resolve('2'),
    Promise.reject('rejected'),
    Promise.resolve('4'),
    Promise.resolve('5')
  ]
  ;(async () => {
    const len = pa.length
    for (let i = 0; i < pa.length; i++) {
      console.log(`send ${i}`)
      await c.send(pa[i])
    }
    console.log('close')
    c.close()
  })()
  await (async () => {
    for await (let i of c.receiver()) {
      console.log(`recv ${i}`)
    }
  })()
})()
console.log('')

console.log('--catch in sender side')
await (async () => {
  const c = new Chan<Promise<string>>(2)

  const pa = [
    Promise.resolve('0'),
    Promise.resolve('1'),
    Promise.resolve('2'),
    Promise.reject('rejected'),
    Promise.resolve('4'),
    Promise.resolve('5')
  ]
  ;(async () => {
    const len = pa.length
    let reason: any = undefined
    for (let i = 0; i < pa.length && reason === undefined; i++) {
      console.log(`send ${i}`)
      pa[i].catch((r) => {
        console.log(`sender catch: ${r}`)
        reason = r
        return r
      })
      await c.send(pa[i])
    }
    console.log('close')
    c.close()
  })()
  await (async () => {
    for await (let i of c.receiver()) {
      console.log(`recv ${i}`)
    }
  })()
})()
console.log('')

console.log('--catch in both sender and receiver side(anti pattern?)')
await (async () => {
  const c = new Chan<Promise<string>>(2, { rejectInReceiver: true })

  const pa = [
    Promise.resolve('0'),
    Promise.resolve('1'),
    Promise.resolve('2'),
    Promise.reject('rejected'),
    Promise.resolve('4'),
    Promise.resolve('5')
  ]
  ;(async () => {
    const len = pa.length
    let reason: any = undefined
    for (let i = 0; i < pa.length && reason === undefined; i++) {
      console.log(`send ${i}`)
      pa[i].catch((r) => {
        console.log(`sender catch: ${r}`)
        reason = r
        return r
      })
      await c.send(pa[i])
    }
    console.log('close')
    c.close()
  })()
  await (async () => {
    try {
      for await (let i of c.receiver()) {
        console.log(`recv ${i}`)
      }
    } catch (r) {
      console.log(`receiver catch: ${r}`)
    }
  })()
})()
console.log('')

console.log('--catch and continue')
await (async () => {
  const c = new Chan<() => Promise<string>>(2)

  const pa = [
    Promise.resolve('0'),
    Promise.resolve('1'),
    Promise.resolve('2'),
    Promise.reject('rejected'),
    Promise.resolve('4'),
    Promise.resolve('5')
  ]
  ;(async () => {
    const len = pa.length
    for (let i = 0; i < pa.length; i++) {
      console.log(`send ${i}`)
      pa[i].catch((r) => {
        console.log(`sender catch: ${r}`)
      })
      await c.send(() => pa[i])
    }
    console.log('close')
    c.close()
  })()
  await (async () => {
    for await (let i of c.receiver()) {
      try {
        console.log(`recv ${await i()}`)
      } catch (r) {
        console.log(`receiver catch: ${r}`)
      }
    }
  })()
})()

// $ node --loader ts-node/esm examples/promise/reject.ts
//
// --continue
// send 0
// send 1
// send 2
// recv 0
// send 3
// recv 1
// send 4
// recv 2
// send 5
// close
// recv 4
// recv 5
//
// --catch in sender side
// send 0
// send 1
// send 2
// recv 0
// send 3
// recv 1
// sender catch: rejected
// close
// recv 2
//
// --catch in both sender and receiver side(anti pattern?)
// send 0
// send 1
// send 2
// recv 0
// send 3
// recv 1
// sender catch: rejected
// close
// recv 2
// receiver catch: rejected
//
// --catch and continue
// send 0
// send 1
// send 2
// recv 0
// send 3
// sender catch: rejected
// recv 1
// send 4
// send 5
// recv 2
// close
// receiver catch: rejected
// recv 4
// recv 5
