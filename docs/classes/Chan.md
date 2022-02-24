# Class: Chan<T\>

Class reperesenting a channel.

## Type parameters

| Name | Description |
| :------ | :------ |
| `T` | Type of the value that will be send via Channel. |

## Table of contents

### Constructors

- [constructor](Chan.md#constructor)

### Methods

- [send](Chan.md#send)
- [receiver](Chan.md#receiver)
- [close](Chan.md#close)

## Constructors

### constructor

• **new Chan**<`T`\>(`bufSize?`, `opts?`)

Make a channel.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `bufSize` | `number` | `0` | size of buffer in channel. |
| `opts` | [`ChanOpts`](../modules.md#chanopts) | `{}` | options. |

#### Defined in

[lib/chan.ts:35](https://github.com/hankei6km/chanpuru/blob/510182c/src/lib/chan.ts#L35)

## Methods

### send

▸ `Readonly` **send**(`value`): `Promise`<`void`\>

Send the value to receiver via channel.
This method required to call with `await`.
It will be blocking durring buffer is filled.
```
await ch.send(value)
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `value` | `T` | the value |

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/chan.ts:92](https://github.com/hankei6km/chanpuru/blob/510182c/src/lib/chan.ts#L92)

___

### receiver

▸ **receiver**(): `AsyncGenerator`<`Awaited`<`T`\>, `void`, `void`\>

Get async generator to receive the value was sended.

#### Returns

`AsyncGenerator`<`Awaited`<`T`\>, `void`, `void`\>

- Async Generator.

#### Defined in

[lib/chan.ts:120](https://github.com/hankei6km/chanpuru/blob/510182c/src/lib/chan.ts#L120)

___

### close

▸ **close**(): `void`

Close channel.

#### Returns

`void`

#### Defined in

[lib/chan.ts:159](https://github.com/hankei6km/chanpuru/blob/510182c/src/lib/chan.ts#L159)
