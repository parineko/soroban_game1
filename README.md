# 🧮 そろばん かんたん ゲーム ✨

小学生向けの「そろばん読み取りゲーム」を Astro で実装した Web アプリです。

## 特徴

- 🌸 かわいい UI（クリーム × パステルカラー × 絵文字多め）
- 📱 ひらがな主体で子ども向け
- 🎮 3つの難易度レベル（初級・中級・上級）+ カスタム設定
- 📊 リアルタイムでそろばんを表示
- 🎯 各レベル10問の問題
- 🔢 そろばんテストページで自由に数字を入力して練習可能

## セットアップ

### 必要な環境

- Node.js 18以上
- npm または yarn

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:4321` を開いてください。

### ビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

## プロジェクト構成

```
src/
├── layouts/          # レイアウトコンポーネント
│   └── BaseLayout.astro
├── components/       # UIコンポーネント
│   ├── StartScreen.astro      # スタート画面
│   ├── LevelSelect.astro      # レベル選択画面
│   ├── GameScreen.astro       # ゲーム画面
│   ├── ResultScreen.astro     # 結果画面
│   └── AbacusDisplay.astro    # そろばん表示コンポーネント（テスト用）
├── pages/            # ページファイル
│   ├── index.astro            # メインページ
│   ├── TestZero.astro         # そろばんテストページ
│   └── TestAbacus.astro       # 開発用テストページ
├── scripts/          # JavaScriptロジック
│   ├── gameController.js      # ゲーム状態管理
│   └── levelConfig.js          # レベル設定
└── styles/           # スタイルシート
    └── global.css
```

## ゲームの流れ

1. **スタート画面**: ゲーム開始またはそろばんテストを選択
2. **レベル選択**: 初級・中級・上級から選択、またはカスタム設定
3. **ゲーム画面**: 
   - そろばんが一定時間表示される
   - 表示された数字を右側のテンキーで入力
   - 上下ボタンで数字を増減（長押しで連続増減）
4. **結果画面**: 正答率とコメントを表示

## 機能

### ゲームモード
- **初級**: 1桁、表示時間2秒、10問
- **中級**: 2桁、表示時間1.5秒、10問
- **上級**: 3桁、表示時間1秒、10問
- **カスタム**: 1-4桁、表示時間0.1-10秒、10問

### そろばんテストページ
- 0-9999の数字を自由に入力
- リアルタイムでそろばんが更新
- テンキーまたは上下ボタンで入力可能

## 技術スタック

- **Astro**: 静的サイトジェネレーター
- **TypeScript**: 型安全性
- **Vanilla JavaScript**: ゲームロジック
- **CSS**: カスタムスタイル

## デプロイ

### Vercel にデプロイ

1. [Vercel](https://vercel.com) にアカウントを作成
2. GitHubリポジトリを接続
3. プロジェクトをインポート（自動的に `vercel.json` を認識）

または、Vercel CLIを使用：

```bash
npm i -g vercel
vercel
```

### Netlify にデプロイ

1. [Netlify](https://www.netlify.com) にアカウントを作成
2. GitHubリポジトリを接続
3. ビルド設定：
   - Build command: `npm run build`
   - Publish directory: `dist`

または、Netlify CLIを使用：

```bash
npm i -g netlify-cli
netlify deploy --prod
```

### GitHub Pages にデプロイ

1. GitHub Actions を使用して自動デプロイを設定
2. `.github/workflows/deploy.yml` を作成（必要に応じて）

## ライセンス

MIT
