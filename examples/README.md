# exmaples

chanpuru のサンプル。

## 実行方法

```
$ node --loader ts-node/esm examples/xx/yy.ts
```

## basic

`Chan` のサンプル。

### [`pass-string.ts`](basic/pass-string.ts)

文字列を送受信。

### [`pass-promise.ts`](basic/pass-promise.ts)

Promise を送信する。

受信される値は Async Generator の挙動により await 済みのものになる。

### [`pass-promise-parallel.ts`](basic/pass-promise-parallele.ts)

上記のバッファーありバージョン。
バッファーを増やしても送信と受信で順番は変動しないが、処理時間の長い Promise が 1 つでもあると受信がブロックされる。

なお、バッファーの数により送信の順番待ちは制御されるが、**Promise の同時実行数は制限されない**ので注意が必要。

以下のようなループの場合は `await send()` の前で `Promise` が作成されているので、同時実行数は「最大でバッファーサイズ +1」となる。

```ts
while (true) {
  const p = new Promise(cb)
  await c.send(p)

  // ....
}
```

同時実行数を制御するサンプルは [`pass-promise-strict-serial.ts`](#pass-promise-strict-serialts) と [`workers`](#workers) で記述。

### [`pass-promise-multiple-sender.ts`](basic/pass-promise-multiple-senders.ts)

上記の送信側が複数存在するバージョン。

複数箇所からの送信も受信可能。

なお、前述のように `await c.send()` の前に Promise を作成している場合は、同時実行数は増加していく。

### [`pass-wrapped-promise.ts`](basic/pass-wrapped-promise.ts)

関数で囲んだ Promise を送受信。

Async Generator 内で await にならないので 、受信側で Promise を扱うことができる。

その代わりに Promise が実行されている箇所が増えるので同時実行数も増加する。

なお、受信側で Chain を設定できるがこれは送信側には Chain されない。

また、受信側でも reject を扱う必要がある。reject 対応は [`handle-reject-wrapped-promise.ts`](#handle-reject-wrapped-promisets) で記述。

### [`pass-wrapped-promise-parallele.ts`](basic/pass-wrapped-promise-parallele.ts)

上記のバッファーありバージョン。

### [`pass-promise-strict-serial.ts`](basic/pass-promise-strict-serial.ts)

上記の変形で、「`send` に渡した関数が実行されてから Promise を生成」させる。

これにより、受信側が関数を実行するまで Promise の生成が遅延されるので、Promise は同時に 1 つしか実行されなくなる。

```ts
const c = new Chan<() => Promise<string>>(3)

// ...

const p = () => new Primise(cb)
await c.send(p)

// ...

for await (let i of c.receiver()) {
  print(`recv value: ${await i()}`)
}
```

なお、Channel のバッファーを増やしても送信の順番待ちが減るだけなので同時実行数は 1 のままとなる。

また、送信側を増やしても同様に同時実行数は 1 を維持する。

`n > 1` の場合での同時実行数については [`workers`](#workers) に記述。

### [`pass-promise-strict-serial-with-args.ts`](basic/pass-promise-strict-serial-with-args.ts)

上記の Promise 生成関数に引数を持たせる。

これにより受信側が Promise の生成に関与できる。

### [`handle-reject.ts`](basic/handle-reject.ts)

Promise を送受信する場合の reject ハンドリング。

`Chan` のデフォルトでは受信側へ Promise の reject を伝達させないので「送信側で catch し、必要であれば Channel をクローズする」が基本。

受信側で catch しない場合は「reject 発生前に Promise が Channel 内で await になっているか」で以下のいずれかになる(外部からそれを知る方法なない)。

- なっている - とくに警告などはなく reject された Promise はスキップされる
- なっていない - `UnhandledPromiseRejectionWarning` が発生する

また、reject されても Channel(Async Generator) は動作しているので、Channel をクローズしても既に送信されている値は受信側に到達する。

### [`handle-reject-with-receiver.ts`](basic/handle-reject-with-receiver.ts)

Channel の設定により「受信側にも reject を伝達させる」場合のハンドリング。

送信側の Async Generator が reject を yield するので受信側に reject が伝達する。

この時点でバッファーに残っている Promise は処理を継続しているが、Generator を停止(`return()` 実行など)すると結果はドロップされる(受信側に到達しない)。

なお、送信側ではどの値がドロップされたかを知る方法はない。

### [`handle-reject-wrapped-promise.ts`](basic/handle-reject-wrapped-promise.ts)

関数で囲んだ Promise の場合は Async Generator の yield を素通りするので、受信側で reject を catch できる。

[`handle-reject-with-receiver.ts`](#handle-reject-with-receiverts) と同様の挙動だが、関数から受け取った Promise で reject されるので Chain 設定の自由度は上がると思われる。

## workers

`workers()` と `palyoads()` のサンプル。

### [`workers.ts`](workers/workers.ts)

`workers()` を利用して同時に 3 つの Promise が実行される。

`Chan` を利用する場合に比べて以下の違いがある。

- 送信できる型は `() => Promise<T>` のみ
- 送信された関数は `workers()` が内部で実行する
- `Promise` を関数実行まで遅延させていると同時実行数は指定された値を超えない
- 生成される値の順番は変動する

### [`payloads-send-string.ts`](workers/payloads-send-string.ts)

`payloads()` により送信側から受信側へ Promise とその他のデータを送信する。

基本的な構造は上記の `workers()` を利用する場合と同じ。

## select

`select()` のサンプル。

### [`select-multiple-senders.ts`](select/select-multiple-senders.ts)

複数の Channel から送信された値を `select()` でマージする。

基本的には [`pass-promise-multiple-senders.ts`](#pass-promise-multiple-senderts) と同じだが、`select()` の場合は異なる Async generator から受信できる。また、送信元の判別も可能。

### [`spinner.ts`](select/spinner.ts)

Channel とともに一定間隔で値を生成する Async generator を `select()` へ設定することでスピナーを実装する。

```ts
for await (let [s, v] of select<Awaited<string>>({
  ch1: ch1.receiver(),
  ch2: ch2.receiver(),
  spinner: spinner
})) {
  if (s === `spinner`) {
    if (!v.done && v.value) {
      // draw spinner...
    }
  } else {
    // channels...
  }
}
```

## cancel

キャンセル用の Promise と `AbortControler` を扱うサンプル。

### [`timeout.ts`](cancel/timeout.ts)

タイムアウトを設定したキャンセル用 `Promise` で送信側の処理を停止する。

なお、送信済の `Promise` は停止されないので受信側へ到達する。

### [`propagate_reject.ts`](cancel/propagate_reject.ts)

Worker 内で発生した reject からキャンセル用の `Promise` を経由して送信側の処理を停止する。

これも、送信済の `Promise` は停止されないので受信側へ到達する。

### [`abort-promise`](cancel/abort-promise.ts)

キャンセル用 `Promise` に `AbortSignal` を chain し、送信済の `Promise` を停止する。

送信される `Promise` の数量は不定なのでハンドラーを明示的に開放できる `AbortSignal` を利用。

## zx

zx で利用する場合のサンプル。

### [`parallel-jobs.ts`](zx/parallel-jobs.ts)

外部コマンドを並列実行する。

引数や結果の受け渡しは Channel で行い、同時実行数を `workers` で制御する。

### [`log-multiple-sources.ts`](zx/log-multiple-sources.ts)

複数ソースから送信されるログを表示。

- ping をログ代わりとする
- ログの送信元(ping の実行)を複数作成する
- ログ送信元毎に色を付ける
- 1 つの送信元でエラーが発生したらすべて停止させる
- 所定の時間内に完了しなければエラーとする
