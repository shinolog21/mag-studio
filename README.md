# MAG STUDIO

雑誌風画像エディタ。テンプレートのスロットに文字と写真を流し込み、4:5(1080×1350)の誌面画像PNG(書き出し2160×2700)を作る。仕様は `magazine-editor-requirements.md`(~/Downloads)を参照。

**公開URL: https://shinolog21.github.io/mag-studio/** (GitHub Pages / gh-pagesブランチ配信)

**実装状況: Phase 1〜3 完了(2026-07-22)、公開済み(2026-07-23)**

- テンプレート3型(表紙型 / 特集エッセイ型 / 商品スペック型)+4型目を追加しやすいレジストリ構造
- 号一覧(作成・複製・削除・JSONバックアップ入出力)、号編集(メタ情報・ページ並べ替え/複製/削除)
- ページ編集(文字数カウンタ、写真取り込み+ドラッグ/ピンチ/ホイール/スライダーでトリミング、PRバッジ)
- PNG書き出し(個別 / 号一括zip)、Xクロップガイド(1:1 / 16:9)、iOS共有シート対応
- note用テキスト書き出し(Markdown、コピー/.md保存)
- PWA(全資産プリキャッシュでオフライン動作、ホーム画面追加、更新トースト)

## 開発

```bash
npm install
npm run dev      # http://localhost:5173 (--host付き: 同一LANの実機からアクセス可)
npm run build    # 型チェック + dist/ビルド(PWAのSW生成込み)
npm run preview  # ビルド版の確認(SW/オフラインの検証はこちらで)
```

## デプロイ(GitHub Pages)

リポジトリ: https://github.com/shinolog21/mag-studio (main=ソース、gh-pages=ビルド成果物)

```bash
GH_TOKEN=<トークン> bash tools/deploy.sh   # ビルドしてgh-pagesへforce push
```

このMacには永続的なGitHub認証がないため、トークンはOAuthデバイスフロー
(gh公式client_id `178c6fc778ccc68e1d6a`、scope=repo)で都度取得する。
※ Actionsのworkflowはscope=repoではpushできないため使っていない(gh-pages直接push方式)。

## 検証用URLパラメータ(開発用)

- `?debugExport=1` — 書き出し結果をダウンロードせず画面にオーバーレイ表示(実機での品質確認用)
- `&auto=1` — ロード後に書き出しを自動実行(クリック不要)
- `?seed=1` — デモデータ(テキスト+生成画像)を自動投入。入力済みページには何もしない

iPhone/iPad実機での確認: Macと同じWi-Fiに繋ぎ、`http://<MacのIP>:5173/?seed=1&debugExport=1&auto=1` を開く。

## フォント

Shippori Mincho B1 (700) / Zen Kaku Gothic New (400, 500, 700) を `public/fonts/` に同梱(SIL OFL)。
ウェイト追加・再取得は `scripts/fetch-fonts.mjs` の `FAMILIES` を編集して:

```bash
node scripts/fetch-fonts.mjs
```

## 実装メモ(確定した設計判断)

- **書き出し**: html-to-imageは `toSvg`(DOM→SVG化)のみ使用。`toPng` は img.decode() 失敗を捕捉せず、
  requestAnimationFrame 待ちのためバックグラウンドタブで永久ハングするため、SVG→canvasのラスタライズは
  `src/export/exportPng.ts` で自前実装している。
- **WebKit対策**: SafariはSVG foreignObject内の`<img>`を遅延デコードし、1回目のdrawImageで写真が欠ける。
  写真があるページは1回目の描画でロードをトリガーし、400ms後に必ず描き直す(全ブラウザ共通・実測で解消を確認)。
  ピクセル判定でのスキップは、表紙型のグラデーションを写真と誤認したため廃止した。
- **フォント埋め込み**: 書き出しSVGへは「ロード済みのフォントスライスのみ」をdata URL化して埋め込む
  (全485ファイルを埋め込むとSVGが十数MBになりiOSで失敗リスク)。誌面表示済みの文字は必ずロード済み。
- **トリミング**: crop値は「cover配置基準の拡大率+枠中心からの平行移動(キャンバス座標)」。
  プレビューと書き出しが同じ `coverLayout()` を通るため必ず一致する。
- **テンプレート**: `src/templates/` にスロット定義+Reactコンポーネントで追加し、`index.ts` のレジストリに
  登録する。誌面のスタイルはすべてinline style(書き出しの外部CSS非依存を保つこと)。
  固定要素は `chrome: 'page' | 'cover'` で出し分け(通常ページ=フッター、表紙=上部大ロゴ)。
- **書き出しステージ**: 現在の号の全ページを非表示で常設レンダリング(`ExportStage`)。
  書き出し時のレンダー待ちが不要になり、必要なフォントスライスも表示時点でロード済みになる。
- **文字数上限の仮調整**(要件からの変更、実物レビューで再調整可):
  - エッセイ型: 写真エリア 約55% → 50%(675px)、body 300字 → 200字、lead 80字 → 60字
  - スペック型: comment 200字 → 140字(2カラム構成のため)
  - 理由: 1080×1350で「写真面積・本文28px以上・行間1.9」をすべて満たすと元の字数は物理的に収まらないため。
    値は `src/templates/*.tsx` の定義で変更可能。

## 既知の注意点

- 検証用に投入したデモ号(ワイヤレスイヤホン特集)が残っている場合は、ライブラリから削除してよい
- IndexedDBはブラウザ(オリジン)ごとに独立。端末間の移行はJSONバックアップを使う
