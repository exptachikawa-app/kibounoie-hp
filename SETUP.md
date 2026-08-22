# 問い合わせフォームセットアップ・本番リリース運用手順書

本ドキュメントは、生活介護 希望の家公式Webサイト（Cloudflare Workers + Google Apps Script + Cloudflare Turnstile）の構成、本番リリース手順、安全運用およびロールバック手順を定めたものです。

---

## 1. 構成概要とアーキテクチャ

1. **公式本番ドメイン**: `https://kibounoie-akiruno.org`
2. **静的サイトホスティング**: Cloudflare Workers Static Assets (`public/` ディレクトリ配下)
   - 10件の正規HTMLページ（sitemap.xml記載）
   - CSS、JavaScript
   - AVIF / WebP / JPEG / PNG 最適化画像アセット
   - `public/_headers` によるCSP、HSTS、X-Content-Type-Options、X-Frame-Options、Permissions-Policy
   - GitHub Pagesは一切使用せず、完全無効化
   - `workers.dev` およびプレビューURLは無効化（`workers_dev: false`, `preview_urls: false`）
3. **APIエンドポイント**: Cloudflare Worker (`/api/contact`)
   - 入力検証（型、文字数、文字種、制御文字、Stream 10KB上限）
   - Cloudflare Turnstile サーバーサイド認証（Bot・スパム対策）
   - HMAC-SHA256 署名生成
4. **バックエンド配信**: Google Apps Script (GAS) Webhook
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
| `APPS_SCRIPT_WEBHOOK_URL` | Secret | Cloudflare Worker | GAS ウェブアプリURL（`https://script.google.com/macros/s/{deploymentId}/exec`）。明示的ポート（`:443`等を含む）、クエリ、ハッシュ、認証情報不可。 |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Worker | Cloudflare Turnstileのサーバー検証用シークレットキー。 |
| `ALLOWED_ORIGINS` | Variable / Secret | Cloudflare Worker | CORS許可Originのカンマ区切りリスト（本番値: `https://kibounoie-akiruno.org`）。HTTPS必須（ローカル開発時のみ `http://localhost:*`, `http://127.0.0.1:*` 許容）。末尾スラッシュ、パス、クエリ、ワイルドカード禁止。プレビューURLを本番許可リストへ入れないこと。 |
| Turnstile Site Key | Public Key | `public/contact.html` | Turnstileウィジェット表示用公開キー（`data-sitekey` 属性）。公開情報。 |

---

## 3. デプロイとGit連携・シークレット操作の重要仕様

本プロジェクトのデプロイおよびシークレット設定を行う前に、以下の仕様と動作原則を必ず理解してください。

### A. Git連携（Workers Builds）による自動本番デプロイ
- 本リポジトリは Cloudflare Workers Builds と連携しています。
- **本番ブランチ（Production branch）は `main`** です。
- **PRを `main` ブランチへマージ（または `main` へPush）すると、Cloudflare上で自動的に Production Build & Deploy が発火し、本番環境へ即時リリースされます。**
- 非本番ブランチへのPushは、非本番プレビュー版（`npx wrangler versions upload` 相当）のみを発火させます。
- **したがって、PRのマージは単なるGit操作ではなく、本番リリース操作そのものです。マージ前にすべての本番前提条件が完了している必要があります。**
- 通常の本番コードリリース経路は「`main` へのPRマージによる自動デプロイ」であり、二重実行を防ぐため手動 `wrangler deploy` は通常運用で実行しません。

### B. Secret操作方式の区別と注意点

#### 1) 即時デプロイ方式 (`wrangler secret put` / `wrangler secret bulk`)
- `wrangler secret put <KEY>` や `wrangler secret bulk <FILE>` は、単にシークレットを保存するだけの操作ではありません。
- **実行すると新しい Worker Version が即座に作成され、100% の本番トラフィックへ即時デプロイ（Promotion）されます。**
- したがって、本番変更の事前承認なしに実行してはなりません。また、1件ずつ実行すると部分設定された中間バージョンが順次本番へデプロイされるため、Version準備方式の利用を推奨します。

#### 2) Version準備方式 (`wrangler versions secret bulk` / `wrangler versions upload`)
- 複数のシークレットを一つのバージョンへまとめ、本番昇格前に確認する方式です。
- 一括設定コマンドの例:
  ```bash
  # シークレット定義ファイルを指定して新バージョンを作成
  npx wrangler versions secret bulk <SECURE_FILE>
  ```
  または、コード・静的アセットとシークレットを同一バージョンに含める場合:
  ```bash
  npx wrangler versions upload --secrets-file <SECURE_FILE>
  ```
- **重要注意事項**:
  - `<SECURE_FILE>` は必ず Git 管理外（`.gitignore` 対象）に配置してください。
  - ファイル名やシークレット値を PR、Issue、ログ、画面キャプチャへ掲載しないでください。
  - 実行後は `<SECURE_FILE>` を安全かつ確実に削除してください。
  - シークレット値をコマンドライン引数へ直接渡さないでください。
  - 作成された Version ID を記録し、binding名のみを確認してください（シークレット値は出力しない）。
  - Version作成と本番昇格（Production deployment: `wrangler versions deploy`）は別々の承認対象として扱ってください。

---

## 4. 本番リリース運用手順（5段階フェーズ）

本番稼働を開始または更新する際は、以下の5段階フェーズを順に実施します。

### Phase 1: Google Apps Script (GAS) 準備
1. 管理者アカウントで Google Apps Script プロジェクトを開きます。
2. `google-apps-script/Code.gs` の内容をスクリプトエディタに配置します。
3. **プロジェクトの設定 -> スクリプトプロパティ** に以下を追加します:
   - プロパティ名: `APPS_SCRIPT_SIGNING_SECRET`
   - 値: 32文字以上の安全なランダム文字列
4. **デプロイ -> 新しいデプロイ -> 種類の選択: ウェブアプリ** を選択:
   - 次のユーザーとして実行: **「自分」**
   - アクセスできるユーザー: **「全員」**
5. 発行されたウェブアプリURL（`https://script.google.com/macros/s/{deploymentId}/exec`）を取得し、安全に記録します。

### Phase 2: Cloudflare Turnstile 準備
1. Cloudflare ダッシュボード -> Turnstile にてウィジェットを確認します。
   - ドメイン: `kibounoie-akiruno.org`
   - ウィジェットモード: Managed または Non-interactive
2. **Site Key**（公開値）を取得します。
3. **Secret Key**（機密値）を安全に控えます。
4. `public/contact.html` の `data-sitekey` に本番 Site Key を設定します。

### Phase 3: Cloudflare Worker Binding 準備
1. 4つの設定値（`TURNSTILE_SECRET_KEY`, `APPS_SCRIPT_SIGNING_SECRET`, `APPS_SCRIPT_WEBHOOK_URL`, `ALLOWED_ORIGINS`）の正式値を確認します。
2. 署名シークレット（`APPS_SCRIPT_SIGNING_SECRET`）が GAS 側と Worker 側で完全一致していることを確認します。
3. Version準備方式等を用い、一つのVersionへシークレットをまとめます。
4. 生成された Version ID と binding 名のみを記録します（シークレット値は出力・記録しない）。

### Phase 4: リリースゲート（Release Gate）
以下の条件が **すべて** 揃うまで、PR のマージ（本番デプロイ）を厳格に禁止します:
- [ ] 人手または自動テストによる完全な検証パス
- [ ] 本番デプロイ計画および実施内容の承認
- [ ] GAS のデプロイ完了および `/exec` URL の確定
- [ ] Turnstile 本番ウィジェットの正常性確認
- [ ] `public/contact.html` への本番 Site Key 反映確認
- [ ] Worker の必要な4つの binding 名が確認済みであること
- [ ] `ALLOWED_ORIGINS` が `https://kibounoie-akiruno.org` であること
- [ ] 署名シークレットの一致確認済みであること
- [ ] 全自動テストスイートが 100% PASS すること:
  - `tests/test_security_headers.mjs`
  - `tests/test_seo.mjs`
  - `tests/test_images.mjs`
  - `tests/test_deployment_surfaces.mjs`
  - `tests/test_frontend.mjs`
  - `tests/test_worker.mjs`
  - `tests/test_gas.mjs`
  - `tests/test_hmac.js`
- [ ] Secret Scanner（`tests/scan_secrets.mjs`）で未許可シークレット 0件・読込エラー 0件であること
- [ ] 資産参照検証（`tests/verify_assets.mjs`）で検出されたすべての内部参照ファイルが存在すること
- [ ] `npx wrangler deploy --dry-run` が Exit Code 0 であること
- [ ] PRマージ方式が **Create a merge commit** であること
- [ ] ロールバック先となる現在稼働中の安定本番 Version ID の記録完了

### Phase 5: 本番リリース（Production Release）
1. PR を `main` ブランチへ **Create a merge commit** 方式でマージします。
2. Cloudflare Workers Builds の Production Build & Deploy が完了したことを確認します。
3. Production commit SHA と Cloudflare Version ID を記録します。
4. 本番環境の GET/HEAD 導通確認（10正規ページ、セキュリティヘッダー、OGP、JSON-LD、AVIF/WebP、FAQ、Turnstile表示）を実施します。
5. **本番フォームの導通確認方針**:
   - 通常のリリース確認では、無用なメール送信を防止するため本番フォーム送信や `/api/contact` への実POSTは実行しません。
   - 明示的に承認された単回試験時のみ、テストデータにてブラウザから厳密に1回だけ送信テストを実施します（同一requestIdによる重複排除は自動テストで担保済み）。

---

## 5. ロールバック手順

1. **事前準備**:
   - マージ作業前に、現在安定稼働している本番 Version ID を必ず記録しておきます。
2. **ロールバックの実行**:
   ```bash
   # 特定の安定稼働バージョンへ100%トラフィックを即時切り替え
   npx wrangler versions deploy <PREVIOUS_VERSION_ID>@100%
   ```
   または
   ```bash
   npx wrangler rollback [DEPLOYMENT_ID]
   ```
3. **ロールバック後確認**:
   - ロールバック後、静的ページの GET/HEAD 導通およびログの安全性を確認します。

---

## 6. 二重送信防止（冪等性）と制限事項

1. **ベストエフォートな重複排除**:
   - フロントエンドで送信ごとに UUID v4 (`submissionId`) を生成し、GAS側で入力内容のハッシュ (`idempotencyHash`) とともに `CacheService`（保持期間: 6時間）に登録します。
   - 同一の `requestId` で同一内容が再送された場合は `DUPLICATE_ACK` を返し、メール重複送信を防ぎます。
   - 同一の `requestId` で異なる内容が送られた場合は `IDEMPOTENCY_CONFLICT` (HTTP 409) を返します。
2. **Exactly-Once 保証の制約**:
   - `CacheService` は永続ストレージではないため、障害時やキャッシュ退避時に消失する可能性があります。
   - したがって、完全な Exactly-Once を保証するものではなく、6時間以内のベストエフォート重複抑止となります。
3. **MailApp 送信制限 (Quota)**:
   - Google Workspace アカウントのメール送信上限は通常 1,500通/日（無料Gmailアカウントは 100通/日）です。スパムや大量送信による枯渇に留意してください。
