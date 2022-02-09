import { Chan, CahnSend, CahnRecv } from '../../src/index.js'

async function proc1(
  recv: CahnRecv<() => Promise<number>>,
  send: CahnSend<() => Promise<string>>
) {
  for await (let ip of recv) {
    const p = new Promise<string>(async (resolve) => {
      const i = await ip()
      console.log(`proc1 start: ${i} * 100`)
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 120))
      console.log(`proc1 done : ${i} * 100 = ${i * 100}`)
      resolve(`proc1 = ${i * 100}`)
    })
    await send(() => p)
  }
}

async function proc2(
  recv: CahnRecv<() => Promise<number>>,
  send: CahnSend<() => Promise<string>>
) {
  for await (let ip of recv) {
    const i = await ip()
    const p = new Promise<string>(async (resolve) => {
      console.log(`proc2 start: ${i} * 10`)
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 150))
      console.log(`proc2 done : ${i} * 10 = ${i * 10}`)
      resolve(`proc2 = ${i * 10}`)
    })
    await send(() => p)
  }
}

const ch1 = new Chan<() => Promise<number>>(2)
const ch2 = new Chan<() => Promise<number>>(2)

const chIn = new Chan<() => Promise<string>>(3)

;(async () => {
  for (let i of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const p = Promise.resolve(i)
    if (i % 2 === 0) {
      await ch1.send(() => p)
    } else {
      await ch2.send(() => p)
    }
  }
  console.log('close ch1')
  ch1.close()
  console.log('close ch2')
  ch2.close()
})()
;(async () => {
  await Promise.all([
    proc1(ch1.receiver(), chIn.send),
    proc2(ch2.receiver(), chIn.send)
  ])
  セレクト使わなくてもいけるよな
  console.log('close chIn')
  chIn.close()
})()
await (async () => {
  for await (let i of chIn.receiver()) {
    console.log(`recv: start`)
    console.log(`recv: ${await i()}`)
  }
})()
