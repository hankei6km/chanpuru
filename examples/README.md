# exmaples

## basic

主に `Chan` のサンプル.

### pass-string.ts

文字列を送受信.

### pass-promise.ts

Promise を送信するが、受信される値は await 済みのものになる.

内部的なバッファーで実際には並列に処理される。厳密な直列処理は `pass-promise-strict-serial.ts` で記述。

### pass-promise-parallel.ts

上記のバッファーありバージョン。バッファーの数により並列処理数が増える。

送信と受信で順番は変動しないが、レスポンスが長い Promise があると引っ張られる.

### pass-wrapped-promise.ts

関数で囲んだ Promise を送受信。

直接 Promise を扱う場合と違いは少ないが、受信側にも reject が伝播する.

### pass-wrapped-promise.ts

上記のバッファーありバージョン。

### pass-promise-strict-serial.ts

上記の変形で厳密な直列処理を行う(Promise の cb が同時に実行されない)。

### handle-reject-in-generator

### fan-out-in.ts

複数の Chan の組み合わせでファンアウト - イン.

これも送信と受信で順番は変動しないが、レスポンスが長い Promise があると引っ張られる.
