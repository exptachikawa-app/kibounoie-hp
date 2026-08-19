# 問い合わせフォームセットアップ・本番リリース運用手順書

本ドキュメントは、生活介護 希望の家ウェブサイトにおける問い合わせフォーム機能（Cloudflare Workers + Google Apps Script + Cloudflare Turnstile）の構成、本番リリース手順、安全運用およびロールバック手順を定めたものです。

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
| `ALLOWED_ORIGINS` | Variable / Secret | Cloudflare Worker | CORS許可Originのカンマ区切りリスト（例: `https://kibounoie.swsc-ship.com`）。HTTPS必須（ローカル開発時のみ `http://localhost:*`, `http://127.0.0.1:*` 許容）。末尾スラッシュ、パス、クエリ、ワイルドカード禁止。ワイルドカードやPreview URLを本番許可リストへ入れないこと。 |
| Turnstile Site Key | Public Key | `public/contact.html` | Turnstileウィジェット表示用公開キー（`data-sitekey` 属性）。公開情報。 |

---

## 3. デプロイとGit連携・シークレット操作の重要仕様

本プロジェクトのデプロイおよびシークレット設定を行う前に、以下の仕様と動作原則を必ず理解してください。

### A. Git連携（Workers Builds）による自動本番デプロイ
- 本リポジトリは Cloudflare Workers Builds と連携しています。
- **本番ブランチ（Production branch）は `main`** です。
- **PRを `main` ブランチへマージ（または `main` へ直接Push）すると、Cloudflare上で自動的に Production Build & Deploy が発火し、本番環境へ即時リリースされます。**
- 非本番ブランチ（`feature/*` 等）へのPushは、非本番プレビュー版（`npx wrangler versions upload` 相当）のみを発火させます。
- **したがって、PRのマージは単なるGit操作ではなく、本番リリース操作そのものです。マージ前にすべての本番前提条件が完了している必要があります。**
- 通常の本番コードリリース経路は「`main` へのPRマージによる自動デプロイ」であり、二重実行を防ぐため手動 `wrangler deploy` は重複実行しません。

### B. Secret操作方式の区別と注意点

#### 1) 即時デプロイ方式 (`wrangler secret put` / `wrangler secret bulk`)
- `wrangler secret put <KEY>` や `wrangler secret bulk <FILE>` は、単にシークレットを保存するだけの操作ではありません。
- **実行すると新しい Worker Version が即座に作成され、100% の本番トラフィックへ即時デプロイ（Promotion）されます。**
- したがって、本番変更の事前承認なしに実行してはなりません。また、1件ずつ実行すると部分設定された中間バージョンが順次本番へデプロイされるため、後述のVersion準備方式の利用を推奨します。

#### 2) Version準備方式 (`wrangler versions secret bulk` / `wrangler versions upload`)
- 複数のシークレットを一つのバージョンへまとめ、本番昇格前に確認する方式です。
- 個別の `versions secret put` を順次実行するのではなく、一括設定コマンドの使用を推奨します:
  ```bash
  # 推奨例: シークレット定義ファイルを指定して新バージョンを作成
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
  - 未デプロイVersionのシークレットが、後続のGit自動ビルドへ自動継承されると仮定しないでください。

### C. プレビュー環境の仕様と注意事項
- Cloudflare Workers のプレビューURL（`*.workers.dev`）は、アクセス制限が明示的に設定されていない限り、インターネットから公開アクセス可能です。
- Worker Version はコード、静的アセット、Bindings（Secretsを含む）の完全な状態を表します。
- 将来 Worker にシークレットが設定された後に作成されるプレビュー環境での予期せぬ本番GAS送信を防ぐため、`ALLOWED_ORIGINS` による制限（プレビューOriginを除外）、または環境分離を徹底してください。

---

## 4. 本番リリース運用手順（5段階フェーズ）

本番稼働を開始する際は、必ず以下の5段階フェーズを順に実施してください。

### Phase 1: Google Apps Script (GAS) 準備
1. 管理者アカウントで Google Apps Script プロジェクトを新規作成します。
2. `google-apps-script/Code.gs` の内容をスクリプトエディタに配置します。
3. **プロジェクトの設定 -> スクリプトプロパティ** に以下を追加します:
   - プロパティ名: `APPS_SCRIPT_SIGNING_SECRET`
   - 値: 32文字以上のランダム文字列（例: `openssl rand -base64 32` 等で生成）
4. **デプロイ -> 新しいデプロイ -> 種類の選択: ウェブアプリ** を選択:
   - 次のユーザーとして実行: **「自分」**
   - アクセスできるユーザー: **「全員」**
5. 発行されたウェブアプリURL（`https://script.google.com/macros/s/{deploymentId}/exec`）を取得し、安全に記録します。
6. URL形式、アクセス権限、実行ユーザー設定を2名体制で相互確認します。

### Phase 2: Cloudflare Turnstile 準備
1. Cloudflare ダッシュボード -> Turnstile にて新しいウィジェットを作成します。
   - ホスト名: 本番ドメイン（例: `kibounoie.swsc-ship.com`）を登録
   - ウィジェットモード: Managed または Non-interactive
   - ※プレビューホストを許可する場合は、本番許可とは分けて管理します。
2. 発行された **Site Key**（公開値）を取得します。
3. 発行された **Secret Key**（機密値）を安全に控えます。
4. `public/contact.html` の `data-sitekey` に本番 Site Key を設定したコミットを作成し、PRレビューを行います（Secret Key をHTMLに記載してはなりません）。

### Phase 3: Cloudflare Worker Binding 準備
1. 4つの設定値（`TURNSTILE_SECRET_KEY`, `APPS_SCRIPT_SIGNING_SECRET`, `APPS_SCRIPT_WEBHOOK_URL`, `ALLOWED_ORIGINS`）の正式値を承認します。
2. 署名シークレット（`APPS_SCRIPT_SIGNING_SECRET`）が GAS 側と Worker 側で完全一致していることを確認します。
3. 第3章BのVersion準備方式（`npx wrangler versions secret bulk <SECURE_FILE>` 等）を用い、一つのVersionへシークレットをまとめます。
4. 生成された Version ID と binding 名のみを記録します（シークレット値は出力・記録しない）。
5. **この段階では Production へ昇格（Deploy）しません。**

### Phase 4: リリースゲート（Release Gate）
以下の条件が **すべて** 揃うまで、PR のマージ（本番デプロイ）を厳格に禁止します:
- [ ] 人手によるコードレビューの承認（Human code review approval）
- [ ] 本番デプロイ計画および実施日時の承認（Production deployment plan approval）
- [ ] GAS のデプロイ完了および `/exec` URL の確定
- [ ] Turnstile 本番ウィジェットの作成完了
- [ ] `public/contact.html` への本番 Site Key の反映およびレビュー済みであること
- [ ] Worker の必要な4つの binding 名（`TURNSTILE_SECRET_KEY`, `APPS_SCRIPT_SIGNING_SECRET`, `APPS_SCRIPT_WEBHOOK_URL`, `ALLOWED_ORIGINS`）がすべて確認済みであること
- [ ] `ALLOWED_ORIGINS` の正式値（本番カスタムドメインOrigin）の確認済みであること
- [ ] 署名シークレットの一致確認済みであること
- [ ] TAPテスト 48/48 PASS（Worker: 21, GAS: 18, Frontend: 9）
- [ ] Secret Scanner 19/19 PASS および ワークスペース内未許可シークレット 0件・読込エラー 0件
- [ ] アセット参照検証 332/332 PASS および 境界テスト 7/7 PASS
- [ ] HMAC-SHA256 相互検証 PASS
- [ ] `npx wrangler deploy --dry-run` が Exit Code 0 であること
- [ ] 非本番プレビュー環境の GET/HEAD 導通確認 PASS
- [ ] 残存 BLOCKER: 0件、残存 MAJOR: 0件
- [ ] 本番リリース担当者による明示的なマージ承認
- [ ] マージにより自動本番デプロイが発火することへの関係者の明示承認
- [ ] ロールバック先となる現在稼働中の安定本番 Version ID の記録完了

### Phase 5: 本番リリース（Production Release）
> **注意**: 本フェーズはリリースの事前承認後にのみ実施する手順であり、開発フェーズでは実行しません。

1. 承認された手順に基づき、Worker bindings を本番環境へ反映します。
2. binding 名と本番状態を確認します。
3. PR #1 を `main` ブランチへマージします。
4. Cloudflare Workers Builds の Production Build & Deploy が完了したことを確認します。
5. Production commit SHA と Cloudflare Version/Deployment ID を記録します。
6. 本番環境の GET/HEAD 導通確認（静的アセット、`/contact.html`、Turnstile表示、文字化けなし）を実施します。
7. **本番フォームの導通確認 (POST)**:
   - **実在利用者の個人情報を含まない承認済みテストデータ** を使用します。
   - API POST は重複送信確認を含めて **最大2回** 実施します:
     - 1回目: 正常送信テスト（送信成功メッセージの表示、および Gmail 宛先へのメール配信1通を確認）
     - 2回目: 同一リクエストでの重複送信抑止テスト（二重送信防止機能によりメール配信が抑止されることを確認）
   - ※実際のメール配送が厳密に **1通のみ** であることを確認します。
   - テスト完了後、受信したテストメールを適切に削除します。
8. Cloudflare Workers および GAS のログを確認し、個人情報（PII）やシークレットが出力されていないことを確認します。
9. Cloudflare ダッシュボード -> **Security -> WAF -> Rate Limiting Rules** にて、`/api/contact` に対するPOSTリクエストのレート制限ルールを設定・有効化します。

---

## 5. ロールバック手順

1. **事前準備**:
   - マージ作業前に、現在安定稼働している本番 Version ID を必ず記録しておきます。安定Versionが不明な場合は作業を開始してはなりません。
2. **ロールバックの実行原則**:
   - ロールバックは本番環境のトラフィックを過去の Version ID へ即座に切り替える本番変更操作です。事前承認なしに実行してはなりません。
3. **ロールバックコマンド例**:
   ```bash
   # 特定の安定稼働バージョンへ100%トラフィックを即時切り替え
   npx wrangler versions deploy <PREVIOUS_VERSION_ID>@100%
   ```
   または
   ```bash
   npx wrangler rollback [DEPLOYMENT_ID]
   ```
4. **ロールバックの制約事項と外部リソース**:
   - Worker のロールバックを実行しても、GAS、Turnstile、外部シークレットの設定は自動的には元に戻りません。
   - 削除・変更された binding 先リソースがある場合、過去バージョンへのロールバックが正常に動作しない可能性があります。
   - HMAC Secret 不一致等の障害時は、外部送信を即座に遮断（GASウェブアプリの非公開化またはWorkerルート無効化）した上で復旧順序を決定してください。
5. **ロールバック後確認**:
   - ロールバック後、静的ページの GET/HEAD 導通、API の Fail-Closed 動作、およびログの安全性を確認します。

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

---

## 7. 静的アセット数について
- ファイルシステム上の実ファイル数: **29件**（HTML: 10, CSS: 1, JS: 1, 画像/ファビコン: 17）
- Wranglerデプロイ時表示エントリ数: **32件**
  - `WRANGLER_LOG=debug` による実行ログにより、実ファイル29件に加えて `/css`, `/images`, `/js` の3ディレクトリエントリが資産一覧に含められて32件と報告されていることが確認されています。
  - 隠しファイルや未追跡の余分な生成ファイルが存在しないことを確認済みです。
