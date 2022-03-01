# chanpuru

## Table of contents

### Classes

- [CancelPromiseRejected](classes/CancelPromiseRejected.md)
- [Chan](classes/Chan.md)

### Functions

- [emptyPromise](modules.md#emptypromise)
- [abortPromise](modules.md#abortpromise)
- [timeoutPromise](modules.md#timeoutpromise)
- [mixPromise](modules.md#mixpromise)
- [chainSignal](modules.md#chainsignal)
- [beatsGenerator](modules.md#beatsgenerator)
- [rotateGenerator](modules.md#rotategenerator)
- [fromReadableStreamGenerator](modules.md#fromreadablestreamgenerator)
- [breakGenerator](modules.md#breakgenerator)
- [select](modules.md#select)
- [workers](modules.md#workers)
- [payloads](modules.md#payloads)

### Type aliases

- [ChanOpts](modules.md#chanopts)
- [ChanSend](modules.md#chansend)
- [ChanRecv](modules.md#chanrecv)
- [GeneratorOpts](modules.md#generatoropts)
- [WorkersOpts](modules.md#workersopts)

## Functions

### emptyPromise

▸ **emptyPromise**(): [`Promise`<`void`\>, () => `void`]

Make empty `Promise` instance to used trigger to cancel context.

#### Returns

[`Promise`<`void`\>, () => `void`]

- Instance of `Promise` with cancel(resolve) function ot `Promise`.

#### Defined in

[lib/cancel.ts:24](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/cancel.ts#L24)

___

### abortPromise

▸ **abortPromise**(`signal`): [`Promise`<`void`\>, () => `void`]

Make `Promise` instance with abort trigger to cancel context.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signal` | `AbortSignal` | Instance of AbortSignal to reject `Promise`. |

#### Returns

[`Promise`<`void`\>, () => `void`]

- Instance of `Promise` with cancel(resolve) function ot `Promise`.

#### Defined in

[lib/cancel.ts:41](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/cancel.ts#L41)

___

### timeoutPromise

▸ **timeoutPromise**(`timeout`): [`Promise`<`void`\>, () => `void`]

Make `Promise` instance with abort trigger to cancel context.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | `number` | Set value to timeout to reject `Promise`. |

#### Returns

[`Promise`<`void`\>, () => `void`]

- Instance of `Promise` with cancel(resolve) function ot `Promise`.

#### Defined in

[lib/cancel.ts:75](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/cancel.ts#L75)

___

### mixPromise

▸ **mixPromise**(`cancelPromises`): [`Promise`<`void`\>, () => `void`]

Make `Promise` instance that is settled by result from  `Promise.race`.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cancelPromises` | [`Promise`<`void`\>, () => `void`][] | Array that is contained instance of `Promise` with cancellation function. |

#### Returns

[`Promise`<`void`\>, () => `void`]

- Instance of `Promise` with cancel(resolve) function ot `Promise`.

#### Defined in

[lib/cancel.ts:101](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/cancel.ts#L101)

___

### chainSignal

▸ **chainSignal**(`promise`): [`Promise`<`void`\>, `AbortSignal`]

Make `AbortSignal` instance that will be abroted at `Promise` has sttled.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `promise` | `Promise`<`void`\> | Instance of `Promise` to used to abort signal. |

#### Returns

[`Promise`<`void`\>, `AbortSignal`]

- Instance of `Promise` with signal that will be aborted at `Promise` has sttled.

#### Defined in

[lib/cancel.ts:121](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/cancel.ts#L121)

___

### beatsGenerator

▸ **beatsGenerator**(`cancelPromise`, `opts`): `AsyncGenerator`<`number`, `number`, `void`\>

Increment values at specied intervals.
It also count return value.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cancelPromise` | `Promise`<`void`\> | Instance of promise to cancel generator. |
| `opts` | [`GeneratorOpts`](modules.md#generatoropts) | options. |

#### Returns

`AsyncGenerator`<`number`, `number`, `void`\>

Async Generator

#### Defined in

[lib/generators.ts:29](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/generators.ts#L29)

___

### rotateGenerator

▸ **rotateGenerator**<`T`\>(`cancelPromise`, `source`, `opts`): `AsyncGenerator`<`T`, `void`, `void`\>

Generate values from array.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cancelPromise` | `Promise`<`void`\> | Instance of promise to cancel generator. |
| `source` | `T`[] | Array that is contained valus. |
| `opts` | [`GeneratorOpts`](modules.md#generatoropts) | options. |

#### Returns

`AsyncGenerator`<`T`, `void`, `void`\>

Async Generator

#### Defined in

[lib/generators.ts:108](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/generators.ts#L108)

___

### fromReadableStreamGenerator

▸ **fromReadableStreamGenerator**<`T`\>(`stream`): `AsyncGenerator`<`T`, `void`, `void`\>

Generate values from readable stream.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `ReadableStream`<`T`\> |

#### Returns

`AsyncGenerator`<`T`, `void`, `void`\>

Async Generator.

#### Defined in

[lib/generators.ts:159](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/generators.ts#L159)

▸ **fromReadableStreamGenerator**<`T`\>(`stream`): `AsyncGenerator`<`string` \| `Buffer`, `void`, `void`\>

Generate values from readable stream.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `ReadableStream` |

#### Returns

`AsyncGenerator`<`string` \| `Buffer`, `void`, `void`\>

Async Generator.

#### Defined in

[lib/generators.ts:163](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/generators.ts#L163)

___

### breakGenerator

▸ **breakGenerator**<`T`, `TReturn`, `TNext`\>(`signal`, `srcGenerator`, `retrunValue?`): `AsyncGenerator`<`T`, `TReturn`, `TNext`\>

Generate values from source generator until cancled.
It will not throw any value when rejected(aborted).

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |
| `TReturn` | `any` |
| `TNext` | `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `signal` | `AbortSignal` | Instamce of `AbortSignal` that is used to trigger cancellation. |
| `srcGenerator` | `AsyncGenerator`<`T`, `TReturn`, `TNext`\> | Generator used to generate values. |
| `retrunValue?` | `TReturn` | The value to return at cancelled. |

#### Returns

`AsyncGenerator`<`T`, `TReturn`, `TNext`\>

Async Generator.

#### Defined in

[lib/generators.ts:186](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/generators.ts#L186)

▸ **breakGenerator**<`T`, `TReturn`, `TNext`\>(`cancelPromise`, `srcGenerator`, `retrunValue?`): `AsyncGenerator`<`T`, `TReturn`, `TNext`\>

Generate values from source generator until cancled.
It will not throw any value when rejected(aborted).

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |
| `TReturn` | `any` |
| `TNext` | `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cancelPromise` | `Promise`<`void`\> | Intstance of `Promise` that is used to trigger cancellation. |
| `srcGenerator` | `AsyncGenerator`<`T`, `TReturn`, `TNext`\> | Generator used to generate values. |
| `retrunValue?` | `TReturn` | The value to return at cancelled. |

#### Returns

`AsyncGenerator`<`T`, `TReturn`, `TNext`\>

Async Generator.

#### Defined in

[lib/generators.ts:194](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/generators.ts#L194)

___

### select

▸ **select**<`T`, `TReturn`, `TNext`\>(`gens`): `AsyncGenerator`<[`string`, `IteratorResult`<`T`, `TReturn`\>], `void`, `void`\>

Receive in order from the value that is settled until all generators has be done.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `TReturn` | `void` |
| `TNext` | `void` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `gens` | `Record`<`string`, `AsyncGenerator`<`T`, `TReturn`, `TNext`\>\> | The object is contained generators with key name. |

#### Returns

`AsyncGenerator`<[`string`, `IteratorResult`<`T`, `TReturn`\>], `void`, `void`\>

Async generator to receive the value from generators that is settled with key name of generator.

#### Defined in

[lib/select.ts:26](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/select.ts#L26)

___

### workers

▸ **workers**<`T`\>(`max`, `recv`, `opts?`): [`ChanRecv`](modules.md#chanrecv)<`T`\>

Run workers instance.

worksers run instance of `Promise` that is return from the funtcion received from receiver.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `max` | `number` | Maximum number of worker to run instance of `Promise`. |
| `recv` | `AsyncGenerator`<() => `Promise`<`T`\>, `void`, `void`\> | Receiver(Async generator) to recieve the function that is return instance of `Promise` in worker. |
| `opts` | [`WorkersOpts`](modules.md#workersopts) | Options. |

#### Returns

[`ChanRecv`](modules.md#chanrecv)<`T`\>

Receiver the value that is generated from insance of `Promise`.

#### Defined in

[lib/workers.ts:45](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/workers.ts#L45)

___

### payloads

▸ **payloads**<`T`, `TPayload`\>(`max`, `recv`, `opts?`): [`ChanRecv`](modules.md#chanrecv)<[`Awaited`<`T`\>, `TPayload`]\>

Run payloads instance.

payload is receive array that is contained function(it return instance of `Promose`) and the value(payload).

#### Type parameters

| Name |
| :------ |
| `T` |
| `TPayload` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `max` | `number` | Maximum number of payload to run instance of `Promise`. |
| `recv` | `AsyncGenerator`<[() => `Promise`<`T`\>, `TPayload`], `void`, `void`\> | Receiver(Async generator) to receive the function that is return instance of `Promise` in payload and the value. |
| `opts` | [`WorkersOpts`](modules.md#workersopts) | Options. |

#### Returns

[`ChanRecv`](modules.md#chanrecv)<[`Awaited`<`T`\>, `TPayload`]\>

Receiver the value that is generated from insance of `Promise` and the value was sended payload.

#### Defined in

[lib/workers.ts:79](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/workers.ts#L79)

## Type aliases

### ChanOpts

Ƭ **ChanOpts**: `Object`

Options for Chan.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `rejectInReceiver?` | `boolean` | Yield reject to iterator if the value is rejected in receiver(generator). |

#### Defined in

[lib/chan.ts:4](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/chan.ts#L4)

___

### ChanSend

Ƭ **ChanSend**<`T`\>: [`Chan`](classes/Chan.md)<`T`\>[``"send"``]

Type of send method Chan class.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[lib/chan.ts:168](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/chan.ts#L168)

___

### ChanRecv

Ƭ **ChanRecv**<`T`\>: `ReturnType`<[`Chan`](classes/Chan.md)<`T`\>[``"receiver"``]\>

Type of async generator that is returned from receiver method of Chan class.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[lib/chan.ts:172](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/chan.ts#L172)

___

### GeneratorOpts

Ƭ **GeneratorOpts**: `Object`

Options for generator.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | `number` | The value to timeout to yield next value. |
| `count?` | `number` | Maximux count to generate values. |

#### Defined in

[lib/generators.ts:4](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/generators.ts#L4)

___

### WorkersOpts

Ƭ **WorkersOpts**: `Object`

Options for worker / payloads

#### Defined in

[lib/workers.ts:6](https://github.com/hankei6km/chanpuru/blob/214aeb1/src/lib/workers.ts#L6)
