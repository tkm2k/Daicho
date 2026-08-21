# Daicho. - 割り勘・貸し借り・勝ち負け精算アプリ

## プロジェクト概要

イベント（旅行・飲み会等）の割り勘を管理するWebアプリ。3種類の取引（立替・貸し借り・勝ち負け）を記録し、最少回数の精算方法を算出する。

## 技術スタック

- **フロントエンド**: バニラJS（ES Modules）、ビルドツールなし
- **バックエンド**: Supabase（PostgreSQL + RPC関数）
- **デプロイ**: GitHub Pages（mainブランチへのpushで自動デプロイ）
- **CDN依存**: `@supabase/supabase-js@2`（index.htmlのscriptタグ経由）

## ディレクトリ構成

```
index.html          # SPA全体のHTML（全ビューをdivで定義）
css/style.css       # 全スタイル（CSS変数でテーマ定義）
js/
  app.js            # エントリポイント、タブ切り替え、初期化
  config.js         # Supabase接続情報
  state.js          # グローバル状態（eventId, members, transactions等）
  utils.js          # DOM操作、フォーマット、UUID生成等のヘルパー
  db/
    index.js        # Store選択（Supabase or localStorage）
    supabase-store.js  # Supabase RPC呼び出し
    local-store.js     # localStorageフォールバック
  logic/
    settlement.js   # 精算ロジック（残高計算、最少回数精算、立替分割）
    history.js      # 最近のイベント履歴（localStorage）
  views/
    home.js         # ホーム画面（イベント作成）
    tx-list.js      # 記録一覧タブ
    tx-form.js      # 追加/編集フォームタブ
    settle-view.js  # 精算タブ
    summary-view.js # メンバー別収支サマリービュー
    members.js      # メンバー管理タブ
supabase_*.sql      # DBマイグレーション用SQL
.github/workflows/keepalive.yml  # Supabase無料枠スリープ防止
```

## アーキテクチャ

### ルーティング
- URLクエリパラメータ `?e=<uuid>` でイベントを識別
- `?e=` なし → ホーム画面、あり → イベント画面（4タブ+サマリー）

### データモデル
- **Transaction.lines**: `[{member_id, delta}]` の配列。全linesのdeltaの合計は必ず0
  - 立替: 支払者に `+amount`、対象者に `-share`
  - 貸し借り: 貸した人 `+amount`、借りた人 `-amount`
  - 勝ち負け: 各メンバーの±。合計0を強制

### セキュリティ
- テーブルへの直接アクセスは不可（SELECTも不可）
- すべて `SECURITY DEFINER` のRPC関数経由
- イベントUUIDを知っている人だけがアクセス可能

## 開発の進め方

### ローカル実行
```bash
python -m http.server 8080
# http://localhost:8080 で確認
```

### テスト
- テストフレームワークは未導入。ブラウザでの手動テスト
- 既存イベントURLでアクセスして動作確認

### デプロイ
- `main` ブランチにpushするとGitHub Pagesで自動デプロイ

### DB変更
- SQL変更は `supabase_*.sql` ファイルとして追加
- Supabaseダッシュボードの SQL Editor で手動実行

## コーディング規約

- ビューモジュールは `setup(appRef)` と `render()` をexportするパターン
- `app.js` の `appController` 経由でビュー間を連携（`refresh`, `switchTab`, `renderAll`, `editTx`）
- DOM要素は `id` で管理し、`$()` ヘルパー（`document.getElementById`）でアクセス
- 金額フォーマットは `yen()` 関数、HTMLエスケープは `esc()` 関数を使用
- タブ切り替えは `switchTab(tabName)` で `tab-{name}` の表示/非表示を制御
