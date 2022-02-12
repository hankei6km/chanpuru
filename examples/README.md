# exmaples

`promise-chan` のサンプル。

## 実行方法

```
$ node --loader ts-node/esm examples/xx/yy.ts
```

## basic

主に `Chan` を利用するためのサンプル.

### pass-string.ts

文字列を送受信.

### pass-promise.ts

Promise を送信するが、受信される値は await 済みのものになる.

オプション的にはバッファーは存在しないことになっているが、内部的なバッファーで実際には(最大で 3 つの Promise が)並列に処理される。
厳密な直列処理は `ChanRace` を利用するか `pass-promise-strict-serial.ts` のように記述。

### pass-promise-parallel.ts

上記のバッファーありバージョン。バッファーの数により同時実行数が増える。

送信と受信で順番は変動しないが、レスポンスが長い Promise があると引っ張られる.

### pass-wrapped-promise.ts

関数で囲んだ Promise を送受信。

直接 Promise を扱う場合と違いは少ないが、受信で Promise の Chain を設定できる。

### pass-wrapped-promise.ts

上記のバッファーありバージョン。

### pass-promise-strict-serial.ts

上記の変形で厳密な直列処理を行う(Promise の cb が同時に実行されない)。

### handle-reject

Promise を送受信する場合の reject ハンドリング。

`promise-chan` のデフォルトでは受信側へ Promise の reject を伝播させないので「送信側で catch し、必要であれば Channel をクローズする」が基本。

受信側で catch しない場合は「reject 発生前に Promise が Async Generator 内で await になっているか」で以下のいずれかになる。

- なっている - とくに警告などはなく reject された Promise はスキップされる
- なっていない - `UnhandledPromiseRejectionWarning` が発生する

また、reject されても Channel(Async Generator) は動作しているので、Channel をクローズしても既に送信されている値は受信側に到達する。

### handle-reject-with-receiver

Channel の設定により「受信側にも reject を伝播させる」場合のハンドリング。

受信側の Async Generator が reject を yield するので Generator が停止する。

この時点でバッファーに残っている Promise は処理を継続しているが、結果はドロップされる(受信側に到達しない)。

なお、送信側ではどの値がドロップされたかを知る方法はない。

### handle-reject-wrapped-promise

関数で囲んだ Promise の場合は Async Generator の yield を素通りするので、受信側で reject を catch できる。

受信側が for await...of 内で throw すれば `handle-reject-with-receiver` と同様の挙動となる。

### fan-out-in.ts

複数の Channel を組み合わせるサンプル。

値を順次渡していくと内容によって並列的に分岐させ、最終的に 1 つのジェネレーターから値を生成する。

複数の異なるサービスへのリクエストを実行する場合などでの利用を想定。

ただし、値の順番は保持されないのでどちらかというと `ChanRace` 向きの処理。

## race

主に `ChanRace` を利用するためのサンプル。

`Cahn` とは以下の点が異なる。

- 値の順番は保持されない
  - その代わりに値が決定した項目から受信できる
- `Promise` しか送受信できない
- バッファーサイズに厳密な同時実行数(通常は最大でバッファーサイズ + 1)

### pass-promise.ts

Promise を送信するが、受信される値は await 済みのものになる.

同時実行数は 1 になる(直前の Promise が決定されるまで次の Promise は実行されない)。

### pass-promise-parallel.ts

上記のバッファーありバージョン。バッファーの数により同時実行数が増える。

受信された値の並びは変動するが、`Chan` 利用時に比べて(同時実行数が同じなら)短時間で終了する傾向にある。

### handle-reject

受信された値の並びが変動する他は基本的に `Chan` バージョンと同様。

### handle-reject-with-receiver

受信された値の並びが変動する他は基本的に `Chan` バージョンと同様。

### fan-out-in.ts

複数の Channel を組み合わせるサンプル。

値を順次渡していくと内容によって並列的に分岐させ、最終的に 1 つのジェネレーターから値を生成する。

複数の異なるサービスへのリクエストを実行する場合などでの利用を想定。

受信された値の並びは変動するが、`Chan` 利用時に比べて(各 Channel の同時実行数が同じなら)短時間で終了する傾向にある。
