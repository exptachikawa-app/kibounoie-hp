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
| `APPS_SCRIPT_WEBHOOK_URL` | Secret | Cloudflare Worker | GAS ウェブアプリURL（`https://script.google.com/macros/s/{deploymentId}/exec`）。明示的ポート（`:443`等を含む）、クエリ、ハッシュ、認証情報不可。 |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Worker | Cloudflare Turnstileのサーバー検証用シークレットキー。 |
| `ALLOWED_ORIGINS` | Env / Secret | Cloudflare Worker | CORS許可Originのカンマ区切りリスト（例: `https://kibounoie.swsc-ship.com`）。HTTPS必須（ローカル開発時のみ `http://localhost:*`, `http://127.0.0.1:*` 許容）。末尾スラッシュ、パス、クエリ、ワイルドカード禁止。 |
| Turnstile Site Key | Public Key | `public/contact.html` | Turnstileウィジェット表示用公開キー（`data-sitekey` 属性）。公開情報。 |

---

## 3. デプロイとGit連携の重要仕様

本プロジェクトのデプロイおよびシークレット設定を行う前に、以下の Cloudflare 公式仕様を必ず理解してください。

### A. Git連携（Workers Builds）による自動本番デプロイ
- 本リポジトリは Cloudflare Workers Builds と連携しています。
- **本番ブランチ（Production branch）は `main`** です。
- **PRを `main` ブランチへマージ（または `main` へ直接Push）すると、Cloudflare上で自動的に Production Build & Deploy が発火し、本番環境へ即時リリースされます。**
- 非本番ブランチ（`feature/*` 等）へのPushは、非本番プレビュー版（`npx wrangler versions upload` 相当）のみを発火させます。
- **したがって、PRのマージは単なるGit操作ではなく、本番リリースそのものです。マージ前にすべての本番前提条件（Secrets設定、GASデプロイ、Site Key反映）が完了している必要があります。**
- 通常の本番コードリリース経路は「`main` へのPRマージによる自動デプロイ」であり、手動 `wrangler deploy` は二重実行を避けるため通常運用では実行しません（緊急時の代替手段としてのみ使用）。

### B. `wrangler secret put` の即時デプロイ副作用
- Cloudflare公式仕様において、`wrangler secret put <KEY>` は単にシークレットを保存するだけのコマンドではありません。
- **`wrangler secret put` を実行すると、新しい Worker Version が即座に作成され、100% の本番トラフィックへ即時デプロイ（Promotion）されます。**
- 3つのシークレットを1件ずつ `wrangler secret put` した場合、部分設定状態の中間バージョンが順次本番へデプロイされます（Worker側の Fail-Closed 実装により外部誤送信は防がれますが、本番バージョンが切り替わる事実は変わりません）。
- したがって、シークレットの設定・変更は「事前準備」ではなく「本番デプロイ操作」として事前承認の上で実施してください。

### C. 安全なシークレット設定の選択肢
本番環境にシークレットを設定・更新する際は、次のいずれかの方式を選択します。

#### 選択肢 1: `wrangler secret put`（標準方式）
- コマンドを実行し、プロンプトに対象シークレットの値を安全に入力します。
  ```bash
  npx wrangler secret put TURNSTILE_SECRET_KEY
  npx wrangler secret put APPS_SCRIPT_SIGNING_SECRET
  npx wrangler secret put APPS_SCRIPT_WEBHOOK_URL
  ```
- 各実行が新バージョンの即時デプロイを伴うことを認識した上で実施してください。

#### 選択肢 2: Version ワークフロー（一括設定方式）
- Wrangler の Versions API を利用してシークレットを定義したバージョンを作成し、後から本番昇格（Deploy）させる方式です。
  - 例: `npx wrangler versions secret put` 等を利用してバージョンを準備し、準備完了後に `npx wrangler versions deploy` で本番へ反映。
  - ローカルシークレットファイルを使用する場合は、絶対にGit管理外（`.gitignore` 対象）に置き、ログやPRに含めず、使用後直ちに安全に削除してください。

---

## 4. 本番デプロイ手順（推奨実行順序）

本番稼働を開始する際は、必ず以下の順序で作業を実施してください。

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
   - ドメイン: 本番ドメイン（例: `kibounoie.swsc-ship.com`）および必要に応じてプレビュードメインを登録
   - ウィジェットモード: Managed または Non-interactive
2. 発行された **Site Key** を取得します。
3. 発行された **Secret Key** を控えます。

### ステップ 3: 正しい Site Key の反映とPR準備
1. `public/contact.html` の `data-sitekey` にステップ2で取得した本番 Site Key を設定します（Site Keyは公開情報です。Secret KeyをHTMLに記載しないでください）。
2. 変更をコミットし、PRの更新・レビューを行います。

### ステップ 4: Cloudflare Worker へのシークレット登録
ステップ3の選択肢1（または2）に従い、Worker環境へ3つのシークレット（`TURNSTILE_SECRET_KEY`, `APPS_SCRIPT_SIGNING_SECRET`, `APPS_SCRIPT_WEBHOOK_URL`）および `ALLOWED_ORIGINS` を設定します。

### ステップ 5: 本番リリース直前ゲート（Production Release Gate）
マージ直前に以下をすべて確認し、本番リリース担当者の明示的な承認を得てください:
- [ ] PRの全コードレビューが承認されていること
- [ ] GitHub checks（Workers Builds 等）が全件 Success であること
- [ ] コンフリクトがなく、`auto-merge` が無効（null）であること
- [ ] GASウェブアプリがデプロイ済みで、URL形式が正しいこと
- [ ] GASスクリプトプロパティに `APPS_SCRIPT_SIGNING_SECRET` が設定済みであること
- [ ] Worker側に3つのシークレットが登録済みであること
- [ ] `public/contact.html` の Site Key が有効な公開キーになっていること
- [ ] `ALLOWED_ORIGINS` に本番Originが含まれていること
- [ ] 現在稼働中の安定本番 Version ID を記録していること（ロールバック用）
- [ ] **PRを `main` へマージすることにより、自動的に本番デプロイが発火することを関係者が明示承認していること**

### ステップ 6: PRのマージ（本番自動デプロイの発火）
GitHub上で PR を `main` ブランチへマージします。Cloudflare Workers Builds により本番デプロイが自動実行されます。

### ステップ 7: WAF レート制限の設定
Cloudflare ダッシュボード -> **Security -> WAF -> Rate Limiting Rules** にて、`/api/contact` に対するPOSTリクエストのレート制限（例: 1つのIPアドレスあたり1分間に5回まで等）を設定してください。

---

## 5. 本番リリース後確認手順（Post-Release Verification）

本番デプロイ完了後、以下の検証を順次実施してください。

1. **デプロイ状態の確認**:
   - Cloudflare ダッシュボードで Workers Builds のビルドステータスが Success となり、マージコミットの SHA で本番 Version が作成・昇格されたことを確認。
   - 本番カスタムドメインおよびルートが正しく関連付けられていることを確認。
2. **静的ページ・アセット導通確認 (GET)**:
   - トップページ (`/`)、問い合わせページ (`/contact.html`)、CSS、JS、画像が HTTP 200 で返却され、文字化け（U+FFFD）がないことを確認。
   - Turnstile ウィジェットが正常にロード・表示されることを確認。
3. **本番フォーム実送信確認 (POST)**:
   - **個人情報（氏名、私用メールアドレス、電話番号等）を含まない承認済みテストデータ** を用い、本番フォームからテスト送信を1回のみ実施。
   - 送信成功メッセージが表示されること、および Gmail 宛先へのメール配信を確認。
   - 送信直後に同一内容で再送信を試み、二重送信防止（重複抑止）が機能することを確認。
4. **ログ安全性確認**:
   - Cloudflare Workers のログおよび GAS の実行ログを確認し、テストデータや個人情報（PII）、シークレットが平文出力されていないことを確認。

---

## 6. プレビュー環境の仕様と注意事項

1. **プレビューURLの公開性**:
   - Cloudflare Workers のプレビューURL（`*.workers.dev`）は、アクセス制限（Cloudflare Access等）が明示的に設定されていない限り、インターネットからアクセス可能です。
2. **Preview Version と Secrets の関係**:
   - Worker Version はコード、静的アセット、Bindings（Secretsを含む）の完全なスナップショットです。
   - 監査時点のプレビュー版（Secrets未設定時）は Fail-Closed により外部送信を行いませんが、将来 Worker にシークレットが設定された後に生成された Version や環境設定によっては、プレビュー環境でもシークレットがバインドされる可能性があります。
   - プレビュー環境からの予期せぬ本番GAS送信を防ぐため、`ALLOWED_ORIGINS` による制限（プレビューOriginを除外）、または環境の完全分離（ステージング用GAS/Turnstileの利用）を徹底してください。

---

## 7. 二重送信防止（冪等性）と制限事項

1. **ベストエフォートな重複排除**:
   - フロントエンドで送信ごとに UUID v4 (`submissionId`) を生成し、GAS側で入力内容のハッシュ (`idempotencyHash`) とともに `CacheService`（保持期間: 6時間）に登録します。
   - 同一の `requestId` で同一内容が再送された場合は `DUPLICATE_ACK` を返し、メール重複送信を防ぎます。
   - 同一の `requestId` で異なる内容が送られた場合は `IDEMPOTENCY_CONFLICT` (HTTP 409) を返します。
2. **Exactly-Once 保証の制約**:
   - `CacheService` は永続ストレージではないため、障害時やキャッシュ退避時に消失する可能性があります。
   - したがって、完全な Exactly-Once を保証するものではなく、6時間以内のベストエフォート重複抑止となります。
3. **MailApp 送信制限 (Quota)**:
   - Google Workspace アカウントのメール送信上限は通常 1,500通/日（無料Gmailアカウントは 100通/日）です。スパムや大量送信による枯渇に留意してください。

---

## 8. セキュリティ・運用保守ガイドライン

1. **個人情報 (PII) の保護**:
   - Cloudflare Workers のログおよび Apps Script の実行ログに、名前、メールアドレス、電話番号、問い合わせ本文を出力しないこと。
2. **シークレットのローテーション手順**:
   - `APPS_SCRIPT_SIGNING_SECRET` を更新する場合:
     1. GASのスクリプトプロパティの値を新シークレットに変更し、新バージョンをデプロイ。
     2. 直ちに `npx wrangler secret put APPS_SCRIPT_SIGNING_SECRET` で Worker 側を新シークレットに更新。
     3. ※一時的に鍵不一致が発生した場合は Worker が 500 (`SERVER_CONFIG_ERROR`) または GAS が `INVALID_SIGNATURE` で安全に拒否します。
3. **障害時の緊急停止・ロールバック手順**:
   - **緊急停止**:
     - GASのデプロイをアーカイブまたはアクセス権を「自分のみ」に変更する、あるいは Cloudflare ダッシュボードで Worker ルートを無効化することで即座に外部送信を遮断できます。
   - **ロールバック**:
     - ロールバックは本番環境のトラフィックを過去の Version ID へ即座に切り替える操作です。事前承認なしに実行しないでください。
     - Wrangler CLI によるロールバック実行例:
       ```bash
       # 特定の安定稼働バージョンへ100%トラフィックを即時切り替え
       npx wrangler versions deploy <PREVIOUS_VERSION_ID>@100%
       ```
       または
       ```bash
       npx wrangler rollback [DEPLOYMENT_ID]
       ```
     - ※Worker のロールバックを行っても、GAS、Turnstile、外部シークレットの設定は自動的には戻りません。外部リソースの整合性を確認してください。

---

## 9. 静的アセット数について
- ファイルシステム上の実ファイル数: **29件**（HTML: 10, CSS: 1, JS: 1, 画像/ファビコン: 17）
- Wranglerデプロイ時表示エントリ数: **32件**
  - `WRANGLER_LOG=debug` による実行ログにより、実ファイル29件に加えて `/css`, `/images`, `/js` の3ディレクトリエントリが資産一覧に含められて32件と報告されていることが確認されています。
  - 隠しファイルや未追跡の余分な生成ファイルが存在しないことを確認済みです。
