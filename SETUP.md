# 問い合わせフォームセットアップ手順

## 1. Cloudflare 準備
1. CloudflareダッシュボードでTurnstileウィジェットを作成し、SiteKeyを `public/contact.html` に設定してください。
2. SecretKeyを以下のコマンドでWorkerに登録します:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

## 2. Google Apps Script (GAS) 準備
1. Google WorkspaceアカウントでApps Scriptプロジェクトを作成し、`google-apps-script/Code.gs` の内容を貼り付けます。
2. プロジェクトの設定 -> スクリプトプロパティに以下を設定します:
   - プロパティ名: `APPS_SCRIPT_SIGNING_SECRET`
   - 値: **32文字以上の安全なランダム文字列**（空白文字、タブ、改行等を一切含めないこと）
3. デプロイ -> 新しいデプロイ -> 種類の選択で「ウェブアプリ」を選択:
   - 次のユーザーとして実行: 「自分」
   - アクセスできるユーザー: 「全員」
4. 発行されたウェブアプリURL（`https://script.google.com/macros/s/{deploymentId}/exec`）をコピーします。

## 3. Worker へのシークレットおよび設定値
1. GASのWebhook URLを登録します:
   ```bash
   npx wrangler secret put APPS_SCRIPT_WEBHOOK_URL
   ```
2. 2で作成した署名用シークレット（32文字以上・空白不可）をWorkerにも登録します:
   ```bash
   npx wrangler secret put APPS_SCRIPT_SIGNING_SECRET
   ```
3. CORS許可Originを追加する場合は環境変数 `ALLOWED_ORIGINS` に設定します:
   - 形式: カンマ区切りのOrigin文字列（例: `https://example.com, https://sub.example.com`）
   - HTTPSプロトコル必須（開発用の `http://localhost:*`, `http://127.0.0.1:*` のみHTTP許容）
   - パス（`/` 以外）、クエリ、ハッシュ、認証情報（ユーザー名/パスワード）は禁止

## 4. デプロイ
```bash
npx wrangler deploy
```

## 5. 本番必須作業 (レート制限)
Cloudflareダッシュボードの WAF -> Rate Limiting Rules にて、`/api/contact` に対するPOSTリクエストのレート制限（例: 1IPあたり1分間に5回まで等）を設定してください。

## 6. 二重送信防止（冪等性）とCacheServiceの仕様・制約
1. **ベストエフォートな重複防止**:
   - フォーム送信時にフロントエンドでUUID v4（`submissionId`）を発行し、Worker経由でGASへ渡します。
   - GAS側で入力内容に基づく `idempotencyHash` を計算し、`CacheService` に6時間（21600秒）保持します。
   - 同一の `requestId` で同一内容が再送された場合は `DUPLICATE_ACK` を返し、メール送信を行いません。
   - 同一の `requestId` で異なる内容が送られた場合はGASが `IDEMPOTENCY_CONFLICT` を返し、Workerがそれを受けてHTTP 409へ変換します。
2. **Exactly-Once保証に関する制約**:
   - `CacheService` は永続性を保証しない一時キャッシュであり、期限前の削除や読み書き失敗があり得ます。
   - したがって、完全なExactly-Once（厳密に1回のみ送信）を保証するものではなく、6時間以内のベストエフォート重複抑止となります。
   - 万が一キャッシュ消失後に再試行が行われた場合、極稀に重複してメール送信される可能性があります。
   - より厳密なExactly-Once保証が必要な場合は、Cloudflare D1（適切なトランザクション／一意制約）、Durable Objectsによる直列化、または強整合性と一意制約を持つ永続DBへの書き込みが必要です（Cloudflare KVは最終的整合性のため厳密な重複排除には不十分です）。

## 7. Apps Script 実ランタイム検証について
- Node.js GAS互換mockによるテストは実行済みです。
- Apps Script実ランタイムでのUtilities、CacheService、LockService、MailAppを用いた統合確認は未実施です。
- デプロイ後に所有者が非本番宛先または承認済み手順で確認してください。

## 8. 静的アセット数について
- ファイルシステム上の実ファイル数: **29件**（HTML: 10, CSS: 1, JS: 1, 画像/ファビコン: 17）
- Wranglerデプロイ時表示エントリ数: **32件**
  - `WRANGLER_LOG=debug` による実行ログにより、実ファイル29件に加えて `/css`, `/images`, `/js` の3ディレクトリエントリが資産一覧に含められて32件と報告されていることが確認されています。
  - 隠しファイルや未追跡の余分な生成ファイルが存在しないことを確認済みです。
