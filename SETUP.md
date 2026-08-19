# 問い合わせフォームセットアップ・運用手順書

本ドキュメントは、生活介護 希望の家ウェブサイトにおける問い合わせフォーム機能（Cloudflare Workers + Google Apps Script + Cloudflare Turnstile）の構成、本番デプロイ手順、安全運用およびロールバック手順を定めたものです。

---

## 1. 構成概要とアーキテクチャ

1. **静的サイトホスティング**: Cloudflare Workers Static Assets (`public/` ディレクトリ内の29ファイル / 32エントリ)
2. **APIエンドポイント**: Cloudflare Worker (`/api/contact`)
   - 入力検証（型、文字数、文字種、制御文字、Stream 10KB上限）
   - Cloudflare Turnstile サーバーサイド認証（Bot対策）
   - HMAC-SHA256 署名生成
3. **バックエンド配信**: Google Apps Script (GAS) Webhook
   - HMAC-SHA256 署名検証（共有秘密鍵）
   - タイムスタンプ鮮度検証（リプレイ保護: ±5分以内）
   - UUID v4 (`submissionId` / `requestId`) と `idempotencyHash` による二重送信防止（ベストエフォート）
   - Gmail 送信 (`MailApp.sendEmail`)

---

## 2. パラメータ・環境変数一覧

> **重要**: シークレットや認証情報を Git リポジトリ内にコミットしないでください。

| 設定項目 | 種別 | 設定先 | 説明・制約 |
| :--- | :--- | :--- | :--- |
| `APPS_SCRIPT_SIGNING_SECRET` | Secret | GAS & Worker | 32文字以上の安全なランダム文字列（英数字記号、空白・タブ・改行不可）。HMAC署名生成および検証に使用。 |
| `APPS_SCRIPT_WEBHOOK_URL` | Secret | Cloudflare Worker | GAS ウェブアプリURL（`https://script.google.com/macros/s/{deploymentId}/exec`）。明示的ポート、クエリ、ハッシュ、認証情報不可。 |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Worker | Cloudflare Turnstileのサーバー検証用シークレットキー。 |
| `ALLOWED_ORIGINS` | Env / Secret | Cloudflare Worker | CORS許可Originのカンマ区切りリスト（例: `https://kibounoie.swsc-ship.com`）。HTTPS必須（ローカル開発時のみ `http://localhost:*`, `http://127.0.0.1:*` 許容）。 |
| Turnstile Site Key | Public Key | `public/contact.html` | Turnstileウィジェット表示用公開キー（`data-sitekey` 属性）。 |

---

## 3. 本番デプロイ手順（推奨実行順序）

必ず以下の順序で作業を実施してください。

### ステップ 1: Google Apps Script (GAS) の準備とデプロイ
1. 管理者アカウントで Google Apps Script プロジェクトを新規作成します。
2. `google-apps-script/Code.gs` の内容をスクリプトエディタに配置します。
3. **プロジェクトの設定 -> スクリプトプロパティ** に以下を追加します:
   - プロパティ名: `APPS_SCRIPT_SIGNING_SECRET`
   - 値: 32文字以上のランダム文字列（例: `openssl rand -base64 32` 等で生成）
4. **デプロイ -> 新しいデプロイ -> 種類の選択: ウェブアプリ** を選択:
   - 次のユーザーとして実行: **「自分」**
   - アクセスできるユーザー: **「全員」**
5. 発行されたウェブアプリURL（`https://script.google.com/macros/s/{deploymentId}/exec`）を取得します。

### ステップ 2: Cloudflare Turnstile ウィジェットの作成
1. Cloudflare ダッシュボード -> Turnstile にて新しいウィジェットを作成します。
   - ドメイン: 本番ドメインおよび必要に応じてプレビュードメインを登録
   - ウィジェットモード: Managed または Non-interactive
2. 発行された **Site Key** を `public/contact.html` の `data-sitekey` に設定します。
3. 発行された **Secret Key** を控えます。

### ステップ 3: Cloudflare Worker へのシークレットおよび設定値の登録
Wrangler CLI を用いて本番環境にシークレットを登録します:
```bash
# 1. Turnstile シークレットキー
npx wrangler secret put TURNSTILE_SECRET_KEY

# 2. GAS 署名用シークレットキー (ステップ1と同一の値)
npx wrangler secret put APPS_SCRIPT_SIGNING_SECRET

# 3. GAS Webhook URL (ステップ1で取得したURL)
npx wrangler secret put APPS_SCRIPT_WEBHOOK_URL
```

CORS許可Originを制限する場合は、`wrangler.jsonc` または環境変数 `ALLOWED_ORIGINS` を設定します。

### ステップ 4: 本番デプロイ前チェックリスト
- [ ] ローカルテスト（TAP 48件、Secret Scan、Asset Verification）が全件 PASS していること
- [ ] `npx wrangler deploy --dry-run` が Exit Code 0 であること
- [ ] 本番シークレット3種がすべて設定されていること
- [ ] `public/contact.html` の Site Key が有効なキーになっていること

### ステップ 5: 本番デプロイ
```bash
npx wrangler deploy
```

### ステップ 6: WAF レート制限の設定
Cloudflare ダッシュボード -> **Security -> WAF -> Rate Limiting Rules** にて、`/api/contact` に対するPOSTリクエストのレート制限（例: 1つのIPアドレスあたり1分間に5回まで等）を設定してください。

---

## 4. プレビュー環境（非本番ブランチ）の仕様と注意点

1. **Git連携自動プレビュー**:
   - `main` 以外のブランチへのPushにより、Cloudflare Workers Builds が自動的に `npx wrangler versions upload` を実行し、プレビューURL（`https://<version-id>-kibounoie-hp.utility-co-jp-tokyo.workers.dev`）が生成されます。
   - これは**非本番プレビュー**であり、本番トラフィック（Production promotion）には影響しません。
2. **プレビュー環境でのフォーム送信制限**:
   - プレビュー環境では本番シークレットが注入されないため、`/api/contact` へのPOSTリクエストは Fail-Closed 設計により HTTP 500 (`SERVER_CONFIG_ERROR`) となり、外部GASやメール送信は行われません。

---

## 5. 二重送信防止（冪等性）と制限事項

1. **ベストエフォートな重複排除**:
   - フロントエンドで送信ごとに UUID v4（`submissionId`）を生成し、GAS側で入力内容のハッシュ（`idempotencyHash`）とともに `CacheService`（保持期間: 6時間）に登録します。
   - 同一の `requestId` で同一内容が再送された場合は `DUPLICATE_ACK` を返し、メール重複送信を防ぎます。
   - 同一の `requestId` で異なる内容が送られた場合は `IDEMPOTENCY_CONFLICT` (HTTP 409) を返します。
2. **Exactly-Once 保証の制約**:
   - `CacheService` は永続ストレージではないため、障害時やキャッシュ退避時に消失する可能性があります。
   - したがって、完全な Exactly-Once を保証するものではなく、6時間以内のベストエフォート重複抑止となります。
3. **MailApp 送信制限 (Quota)**:
   - Google Workspace アカウントのメール送信上限は通常 1,500通/日（無料Gmailアカウントは 100通/日）です。スパムや大量送信による枯渇に留意してください。

---

## 6. セキュリティ・運用保守ガイドライン

1. **個人情報 (PII) の保護**:
   - Cloudflare Workers のログおよび Apps Script の実行ログに、名前、メールアドレス、電話番号、問い合わせ本文を出力しないこと。
2. **シークレットのローテーション手順**:
   - `APPS_SCRIPT_SIGNING_SECRET` を更新する場合:
     1. GASのスクリプトプロパティの値を新シークレットに変更し、新バージョンをデプロイ。
     2. 直ちに `npx wrangler secret put APPS_SCRIPT_SIGNING_SECRET` で Worker 側を新シークレットに更新。
3. **障害時の緊急停止・ロールバック手順**:
   - **緊急停止**:
     - GASのデプロイをアーカイブまたはアクセス権を「自分のみ」に変更する、あるいは Cloudflare ダッシュボードで Worker ルートを無効化することで即座に外部送信を遮断できます。
   - **ロールバック**:
     - 前回の安定稼働バージョンIDに対して以下を実行します:
       ```bash
       npx wrangler rollback [DEPLOYMENT_ID]
       ```
       または
       ```bash
       npx wrangler versions deploy <PREVIOUS_VERSION_ID>@100%
       ```

---

## 7. 静的アセット数について
- ファイルシステム上の実ファイル数: **29件**（HTML: 10, CSS: 1, JS: 1, 画像/ファビコン: 17）
- Wranglerデプロイ時表示エントリ数: **32件**
  - `WRANGLER_LOG=debug` による実行ログにより、実ファイル29件に加えて `/css`, `/images`, `/js` の3ディレクトリエントリが資産一覧に含められて32件と報告されていることが確認されています。
  - 隠しファイルや未追跡の余分な生成ファイルが存在しないことを確認済みです。
