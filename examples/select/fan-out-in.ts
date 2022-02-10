import { Chan, CahnSend, CahnRecv } from '../../src/index.js'

async function proc1(
  send: CahnSend<() => Promise<string>>,
  recv: CahnRecv<() => Promise<number>>
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
  send: CahnSend<() => Promise<string>>,
  recv: CahnRecv<() => Promise<number>>
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

function run(input: number[]): Chan<() => Promise<string>> {
  const ch1 = new Chan<() => Promise<number>>(2)
  const ch2 = new Chan<() => Promise<number>>(2)
  const chIn = new Chan<() => Promise<string>>(3)

  ;(async () => {
    for (let i of input) {
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
      proc1(chIn.send, ch1.receiver()),
      proc2(chIn.send, ch2.receiver())
    ])
    console.log('close chIn')
    chIn.close()
  })()

  return chIn
}

await (async () => {
  const ch = run([1, 2, 3, 4, 5, 6, 7, 8, 9])
  for await (let i of ch.receiver()) {
    console.log(`recv: start`)
    console.log(`recv: ${await i()}`)
  }
})()
