# Class: CancelPromiseRejected

Class reperesenting a error that is thrown when Cancel Promise is rejected.

## Hierarchy

- `Error`

  ↳ **`CancelPromiseRejected`**

## Table of contents

### Constructors

- [constructor](CancelPromiseRejected.md#constructor)

### Accessors

- [reason](CancelPromiseRejected.md#reason)

## Constructors

### constructor

• **new CancelPromiseRejected**(`message`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `string` |

#### Overrides

Error.constructor

#### Defined in

[lib/cancel.ts:10](https://github.com/hankei6km/chanpuru/blob/fd2b423/src/lib/cancel.ts#L10)

## Accessors

### reason

• `get` **reason**(): `string`

#### Returns

`string`

#### Defined in

[lib/cancel.ts:15](https://github.com/hankei6km/chanpuru/blob/fd2b423/src/lib/cancel.ts#L15)
