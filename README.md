# ゲーム & 九九学習アプリ + 本格そろばんツール 🍒

年長さん〜小学生向けの「そろばん総合学習 Webアプリ」です。
Astro と SVG技術を駆使し、スマホ・PC・タブレットで「本物のそろばんの操作感」を再現しています。

今回のアップデートで、学習機能とは独立した**「没入型・横画面専用そろばん (RealSoroban)」**を追加しました。

## 🌟 特徴

- **🧠 右脳を鍛える**: 数字を「文字」ではなく「玉の形（イメージ）」として捉える力を養います。
- **📱 PWA対応**: スマホのホーム画面に追加すれば、オフラインでもアプリとして動作します。
- **✨ こだわりのUI**: 
    - **学習モード**: クリーム色やパステルカラーを基調とした優しいデザイン。
    - **RealSoroban**: 余計な表示を一切排除し、道具としての「そろばん」を再現。

---

## 📂 プロジェクト構成 (全容)

```text
SOROBAN_GAME1/
├── public/               # 静的アセット（ビルドせずそのまま配信されるファイル）
│   ├── images/           # 画像素材
│   │   ├── tama.png      # そろばんの玉
│   │   └── dodai.png     # (未使用または予備)
│   ├── ABACUS2.woff      # ★重要: そろばん数字用フォントファイル
│   ├── favicon.svg       # アプリアイコン
│   └── manifest.webmanifest # PWAマニフェスト（ビルド時に自動生成される場合もあり）
│
├── src/
│   ├── components/       # UIパーツ群
│   │   ├── StartScreen.astro      # タイトル画面
│   │   ├── GameScreen.astro       # 読み取りゲーム本編
│   │   ├── KukuGame.astro         # 九九テストモード
│   │   └── ...
│   │
│   ├── layouts/          # 共通レイアウト
│   │   └── BaseLayout.astro       # PWA設定やGoogle Fonts読み込み
│   │
│   ├── pages/            # ページ定義（ルーティング）
│   │   ├── index.astro            # アプリ本体（学習・ゲーム機能まとめ）
│   │   ├── TestZero.astro         # 縦画面シミュレーター（テンキーあり）
│   │   └── RealSoroban.astro      # ★新規: 横画面・没入型そろばん（道具特化）
│   │
│   ├── scripts/          # ロジック
│   │   ├── gameController.js      # ゲーム進行管理
│   │   └── kukuData.js            # 九九の問題データ
│   │
│   └── styles/           # デザイン
│       └── global.css             # フォント定義(@font-face)・共通変数
│
├── astro.config.mjs      # Astro設定 & PWA(Service Worker)設定
├── package.json          # 依存関係定義
└── tsconfig.json         # TypeScript設定
🎮 機能一覧
A. 学習・ゲームモード (/)
読み取りゲーム: フラッシュ暗算の入門。一瞬表示されるそろばんを読み取る。

九九学習: そろばんを使い、増え方を体感しながら九九を覚える。

九九テスト: 虫食い形式のランダムテスト。

シミュレーター: 縦画面でテンキーを使って数字の動きを確認する。

B. 道具モード (/RealSoroban)
横画面専用: スマホを横にすると起動。

13桁対応: 一兆の位まで計算可能。

没入設計: 数字表示なし、テンキーなし。あるのは「ご破算ボタン」のみ。

🚀 開発と実行
インストール
Bash

npm install
ローカル開発サーバー起動
Bash

npm run dev
ブラウザで http://localhost:4321 を開いて確認。

ビルド（本番用ファイルの生成）
Bash

npm run build
dist/ フォルダに生成されます。

🛠️ 技術スタック
Framework: Astro (静的サイト生成 + PWA)

Language: TypeScript / JavaScript (Vanilla)

Styling: CSS (Scoped & Global)

Font:

UI: Zen Maru Gothic (Google Fonts)

数字: ABACUS2.woff (Local Font)