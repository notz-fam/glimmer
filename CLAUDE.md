# 北の星をさがして (ocean-particles)

夜の海を漂う小舟の物語を、パーティクルだけで描くインタラクティブ作品。three.js + Vite、フレームワークなし、素の ES Modules。

## コマンド

- `npm run dev` — 開発サーバー (Vite)
- `npm run build` — `dist/` にビルド。テストは無いので、変更後の確認はビルドが通ること + ブラウザでの目視
- `npm run preview` — ビルド結果の確認

## 構成

- [src/main.js](src/main.js) — エントリ。renderer / camera / レイヤー作成、全オブジェクトの生成、毎フレームのループ
- [src/ParticleCreature.js](src/ParticleCreature.js) — すべての見た目の土台。点群 + ばね（指で散って元に戻る）+ presence（フェードイン/アウト）
- [src/shaders/](src/shaders/) — 共通シェーダー。頂点シェーダーの `#pragma DEFORM` / `#pragma COLORIZE` に各生き物の GLSL が差し込まれる
- [src/creatures/](src/creatures/) — 海の生き物。[pointBuilder.js](src/creatures/pointBuilder.js) で形を点として組む
- [src/environment/](src/environment/) — 海底（砂・岩・海藻・珊瑚・泡）
- [src/surface/](src/surface/) — 水面・空・星・舟・雨・漂流物・海鳥。[waves.js](src/surface/waves.js) の `waveHeight` を水面と浮かぶ物で共有
- [src/story/](src/story/) — 物語の進行。[scenes.js](src/story/scenes.js) がデータ（台詞・環境・タッチ対象）、[Story.js](src/story/Story.js) がそれを動かすエンジン

## 決まりごと

### 生き物 / オブジェクトを作るとき
- `createXxx(scale = 1)` を export し、`ParticleCreature` を返す。点の数は `Math.floor(N * scale)`（スマホは scale=0.6）
- ローカル座標は **+x が前方**
- 動きは2種類: 形の揺れは GLSL の `deform(vec3 p)`（`/* glsl */` テンプレート文字列）、位置の移動は `creature.tick = (time, dt, pointer) => {}`
- 色は `colorA` / `colorB` と点ごとの `tint`(0..1) で混ぜる
- 追加したら [main.js](src/main.js) で生成 → `setLayer(layers.xxx)` → シーンに add → `everything` に含める
- レイヤーは3つ: `above`（水面上）、`below`（水中。`below` グループは y=-16 に下げてある）、`sky`（星。`stars.object` の子にする）

### 物語を書くとき
- 台詞はすべて日本語のオリジナル文。既存作品の引用やなぞりはしない
- 流れは scenes → beats。beat は `{ say, env, events, targets, wait }`。書式は [scenes.js](src/story/scenes.js) 冒頭のコメントが正
- `targets[].key` は `Story.js` の `RADIUS` と `targetPos()`（または `ocean` のキー）に存在する名前にする
- `events` は `Story.event()` が知っている名前だけ（`appear:<key>`, `flotsam:<key>`, `shootingStar`, `farLight`, `bird`, `birdLoop`, `polaris`）

### パフォーマンス
- 毎フレーム呼ばれる処理（`update`, `tick`, `frame`）で `new THREE.Vector3()` などを作らない。モジュール先頭の `_v` などの使い回し変数を使う
- 動く点は CPU ではなくシェーダー（`deform`）で動かすのが基本
- マテリアルは加算合成・`depthWrite: false`。透過順の問題は起きない前提の作り

### コード
- コメントは英語で短く。インデント2スペース、シングルクォート、セミコロンあり（既存に合わせる）
- 新しい依存パッケージは追加しない（three と vite のみ）
