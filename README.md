# 生活介護 希望の家 公式ホームページ

社会福祉法人SHIPが運営する「生活介護 希望の家」（東京都あきる野市）の公式Webサイトです。

- **公式Webサイト**: [https://kibounoie-akiruno.org/](https://kibounoie-akiruno.org/)
- **運営法人**: 社会福祉法人SHIP ([https://www.swsc-ship.com/](https://www.swsc-ship.com/))
- **ホスティング環境**: Cloudflare Workers Static Assets
- **本番ブランチ**: `main`

---

## 🏗️ システム構成とアーキテクチャ

本プロジェクトはCloudflare Workersをエッジインフラとして採用し、高いパフォーマンス、セキュリティ、堅牢性を両立しています。

1. **静的アセット配信 (Static Assets)**
   - `public/` ディレクトリ配下のHTML（10正規ページ）、CSS、JavaScript、AVIF/WebP最適化画像、`_headers`、`sitemap.xml`、`robots.txt` をCloudflareエッジから超高速配信。
   - `public/_headers` による厳格なセキュリティレスポンスヘッダー（Content-Security-Policy, HSTS, X-Content-Type-Options, X-Frame-Options, Permissions-Policy）。
   - GitHub Pagesは使用せず、完全無効化されています。
   - `workers.dev` ドメインおよびプレビューURLは無効化（`workers_dev: false`, `preview_urls: false`）され、独自ドメイン `kibounoie-akiruno.org` のみに集約。

2. **お問い合わせAPI (`/api/contact`)**
   - Cloudflare Worker (`src/index.js`) が問い合わせPOSTリクエストを受信。
   - Cloudflare Turnstileによるボット・スパム防止検証。
   - HMAC-SHA256署名による改ざん防止トークンを付与し、Google Apps Script (GAS) へ安全にリレー転送。

3. **メール通知バックエンド (Google Apps Script)**
   - `google-apps-script/Code.gs` が署名を検証し、管理者およびユーザー宛ての自動返信メールを送信。
   - 二重送信防止（冪等性キャッシュと分散ロック）。

---

## 📁 ディレクトリ構成

```text
kibounoie-hp/
├── public/                  # 公開静的アセット
│   ├── index.html           # トップページ
│   ├── about.html           # 施設について
│   ├── service.html         # サービス内容
│   ├── facility.html        # 施設案内
│   ├── guide.html           # ご利用案内
│   ├── activities.html      # 活動の様子
│   ├── faq.html             # よくある質問 (WAI-ARIA アコーディオン)
│   ├── access.html          # アクセス
│   ├── contact.html         # お問い合わせ (Cloudflare Turnstile 連携)
│   ├── privacy.html         # プライバシーポリシー
│   ├── _headers             # Cloudflare Workers 静的ヘッダー定義 (CSP等)
│   ├── robots.txt           # クローラー制御設定
│   ├── sitemap.xml          # 検索エンジン用サイトマップ
│   ├── css/style.css        # スタイルシート
│   ├── js/main.js           # 共通UIロジック (メニュー, FAQ, Lightbox等)
│   └── images/              # 画像資産 (AVIF, WebP, JPEG/PNG fallback)
├── src/
│   └── index.js             # Cloudflare Worker エントリポイント
├── google-apps-script/
│   └── Code.gs              # GAS メール配信バックエンド
├── tests/                   # 自動テストスイート
│   ├── test_frontend.mjs    # フロントエンド・DOM・FAQロジックテスト
│   ├── test_worker.mjs      # Worker API・Turnstile・CORSテスト
│   ├── test_gas.mjs         # GAS 署名検証・排他制御テスト
│   ├── test_hmac.js         # HMAC-SHA256 相互運用性検証
│   ├── test_security_headers.mjs # セキュリティヘッダー・CSP検証
│   ├── test_seo.mjs         # OGP・JSON-LD・SEO検証
│   ├── test_images.mjs      # AVIF/WebP 画像最適化検証
│   ├── test_deployment_surfaces.mjs # 公開サーフェス検証
│   ├── scan_secrets.mjs     # リポジトリ全域シークレットスキャナー
│   └── verify_assets.mjs    # 内部リンク・画像参照・境界値チェッカー
└── wrangler.jsonc           # Cloudflare Workers 設定
```

---

## 🚀 開発とテスト

### ローカルでの確認

```bash
# Wrangler ローカル開発サーバー起動 (Worker + Static Assets)
npx wrangler dev
```

### 自動テスト実行

リポジトリ内の全テストスイートを実行し、コード品質とセキュリティを検証します。

```bash
# 静的構文チェック
git diff --check
node --check public/js/main.js
node --check src/index.js

# 単体・回帰テスト
node --test tests/test_security_headers.mjs
node --test tests/test_seo.mjs
node --test tests/test_images.mjs
node --test tests/test_deployment_surfaces.mjs
node --test tests/test_frontend.mjs
node --test tests/test_worker.mjs
node --test tests/test_gas.mjs
node tests/test_hmac.js

# セキュリティスキャン & 資産整合性検証
node tests/scan_secrets.mjs
node tests/verify_assets.mjs

# Wrangler ドライラン
npx wrangler deploy --dry-run
```

---

## 🚢 デプロイフローと運用ルール

1. **自動本番デプロイ**:
   - `main` ブランチへの Pull Request がマージされると、GitHub 連携により **Cloudflare Workers Builds** が自動的にビルド・本番デプロイを実行します。
   - 通常の運用において手動の `wrangler deploy` は実行しません。

2. **Pull Request マージ方式**:
   - 履歴整合性と監査性を維持するため、**Create a merge commit** 方式を使用します（Squash / Rebase は禁止）。

3. **セキュリティ・運用の注意事項**:
   - APIキー、署名シークレット、秘密情報をリポジトリへコミットしてはいけません。
   - 本番の問い合わせフォーム送信および `/api/contact` への実POST送信は、通常の動作確認テストでは行わないでください。
