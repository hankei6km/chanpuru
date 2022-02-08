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
      console.log(`write ${i}`)
      await c.write(pa[i])
    }
    console.log('close')
    c.close()
  })()
  await (async () => {
    for await (let i of c.reader()) {
      console.log(`read  ${i}`)
    }
  })()
})()
console.log('')

console.log('--catch in writer side')
await (async () => {
  const c = new Chan<Promise<string>>(3)

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
      console.log(`write ${i}`)
      pa[i].catch((r) => {
        console.log(`writer catch: ${r}`)
        reason = r
        return r
      })
      await c.write(pa[i])
    }
    console.log('close')
    c.close()
  })()
  await (async () => {
    for await (let i of c.reader()) {
      console.log(`read  ${i}`)
    }
  })()
})()
console.log('')

console.log('--catch in both writer and reader side(anti pattern?)')
await (async () => {
  const c = new Chan<Promise<string>>(2, { rejectInReader: true })

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
      console.log(`write ${i}`)
      pa[i].catch((r) => {
        console.log(`writer catch: ${r}`)
        reason = r
        return r
      })
      await c.write(pa[i])
    }
    console.log('close')
    c.close()
  })()
  await (async () => {
    try {
      for await (let i of c.reader()) {
        console.log(`read  ${i}`)
      }
    } catch (r) {
      console.log(`reader catch: ${r}`)
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
      console.log(`write ${i}`)
      pa[i].catch((r) => {
        console.log(`writer catch: ${r}`)
      })
      await c.write(() => pa[i])
    }
    console.log('close')
    c.close()
  })()
  await (async () => {
    for await (let i of c.reader()) {
      try {
        console.log(`read  ${await i()}`)
      } catch (r) {
        console.log(`reader catch: ${r}`)
      }
    }
  })()
})()

// $ node --loader ts-node/esm examples/promise/reject.ts
//
// --continue
// write 0
// write 1
// write 2
// read  0
// write 3
// read  1
// write 4
// read  2
// write 5
// close
// read  4
// read  5
//
// --catch in writer side
// write 0
// write 1
// write 2
// write 3
// read  0
// writer catch: rejected
// close
// read  1
// read  2
//
// --catch in both writer and reader side(anti pattern?)
// write 0
// write 1
// write 2
// read  0
// write 3
// read  1
// writer catch: rejected
// close
// read  2
// reader catch: rejected
//
// --catch and continue
// write 0
// write 1
// write 2
// read  0
// write 3
// writer catch: rejected
// read  1
// write 4
// write 5
// read  2
// close
// reader catch: rejected
// read  4
// read  5
