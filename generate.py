import os

header = """  <header class="header" id="js-header">
    <div class="header-inner">
      <div class="header-logo">
        <a href="index.html">生活介護 希望の家</a>
      </div>
      <nav class="gnav" id="js-gnav">
        <ul class="gnav-list">
          <li class="gnav-item"><a href="about.html">希望の家について</a></li>
          <li class="gnav-item"><a href="service.html">サービス内容</a></li>
          <li class="gnav-item"><a href="facility.html">施設のご案内</a></li>
          <li class="gnav-item"><a href="guide.html">ご利用案内</a></li>
          <li class="gnav-item"><a href="activities.html">活動の様子</a></li>
          <li class="gnav-item"><a href="news.html">お知らせ</a></li>
          <li class="gnav-item"><a href="faq.html">よくある質問</a></li>
          <li class="gnav-item"><a href="access.html">アクセス</a></li>
        </ul>
        <div class="header-contact-sp">
          <a href="contact.html" class="btn btn-contact">見学・お問い合わせ</a>
        </div>
      </nav>
      <div class="header-contact-pc">
        <a href="contact.html" class="btn btn-contact">見学・お問い合わせ</a>
      </div>
      <button class="hamburger" id="js-hamburger" aria-label="メニューを開閉する" aria-expanded="false">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </header>"""

footer = """  <!-- ========================
       見学・お問い合わせ CTA
  ======================== -->
  <section class="section cta">
    <div class="container">
      <div class="cta-inner">
        <h2 class="cta-title">見学・ご相談を随時受け付けています</h2>
        <p class="cta-text">「どんな雰囲気なのか見てみたい」「利用について相談したい」など、まずはお気軽にお問い合わせください。</p>
        <a href="contact.html" class="btn btn-contact btn-lg">見学・お問い合わせはこちら</a>
        <p class="cta-tel">お電話でも承ります：<br class="sp-only"><a href="tel:0000000000">000-000-0000</a><br><span class="tel-note">（※電話番号は準備中／要確認）</span></p>
      </div>
    </div>
  </section>
  </main>

  <!-- ========================
       共通フッター
  ======================== -->
  <footer class="footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-info">
          <div class="footer-logo">生活介護 希望の家</div>
          <p class="footer-address">〒190-0164 東京都あきる野市五日市374-5</p>
          <p class="footer-tel">TEL: 000-000-0000<br><span class="tel-note">（※準備中／要確認）</span></p>
        </div>
        <div class="footer-links">
          <ul class="footer-nav">
            <li><a href="about.html">希望の家について</a></li>
            <li><a href="service.html">サービス内容</a></li>
            <li><a href="facility.html">施設のご案内</a></li>
            <li><a href="guide.html">ご利用案内</a></li>
          </ul>
          <ul class="footer-nav">
            <li><a href="activities.html">活動の様子</a></li>
            <li><a href="news.html">お知らせ</a></li>
            <li><a href="faq.html">よくある質問</a></li>
            <li><a href="access.html">アクセス</a></li>
            <li><a href="contact.html">お問い合わせ</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="footer-bottom-links">
          <a href="https://www.swsc-ship.com/" target="_blank" rel="noopener noreferrer">運営法人 社会福祉法人SHIP 公式サイト <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 2px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>
          <a href="privacy.html">個人情報保護方針</a>
        </div>
        <p class="copyright">&copy; 生活介護 希望の家 All Rights Reserved.</p>
      </div>
    </div>
  </footer>

  <script src="js/main.js"></script>
</body>
</html>"""

def generate_html(filename, title, desc, content):
    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{desc}">
  <title>{title} | 生活介護 希望の家 | 社会福祉法人SHIP</title>
  <!-- Google Fonts: Rubik & Noto Sans JP -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Rubik:wght@300;400;500;700&display=swap" rel="stylesheet">
  <!-- Stylesheet -->
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
{header}
  <main>
    <!-- パンくずリスト -->
    <div class="breadcrumb">
      <div class="container">
        <ul>
          <li><a href="index.html">ホーム</a></li>
          <li>&gt;</li>
          <li>{title}</li>
        </ul>
      </div>
    </div>

    <!-- ページヘッダー -->
    <section class="page-header bg-light">
      <div class="container">
        <h1 class="page-title">{title}</h1>
      </div>
    </section>

{content}

{footer}
"""
    with open(f"c:/Users/owner/Desktop/kibounoie-hp/{filename}", "w", encoding="utf-8") as f:
        f.write(html)
        
pages = {
    "about.html": {
        "title": "希望の家について",
        "desc": "生活介護事業所「希望の家」の法人理念や方針について。",
        "content": """
    <section class="section about">
      <div class="container">
        <h2 class="section-title">法人理念</h2>
        <div class="mission-wrap">
          <div class="mission-item">
            <h3>Mission</h3>
            <p>誰もが自分らしく、地域で豊かに暮らせる社会の実現</p>
          </div>
          <div class="mission-item">
            <h3>Challenge</h3>
            <p>一人ひとりの可能性を信じ、新しい支援の形に挑戦する</p>
          </div>
          <div class="mission-item">
            <h3>Value</h3>
            <p>寄り添う心、共に歩む姿勢、そして笑顔あふれる日常</p>
          </div>
        </div>
        
        <h2 class="section-title">運営法人について</h2>
        <div class="content-box">
          <p>「生活介護 希望の家」は、あきる野市からの指定管理事業として、<strong>社会福祉法人SHIP</strong>が運営を行っております。</p>
          <p>地域に根ざした福祉サービスを展開し、利用される方々が安心して自分らしく過ごせる居場所づくりに努めています。</p>
        </div>
        
        <h2 class="section-title" style="margin-top: 80px;">大切にしていること</h2>
        <div class="content-box">
          <p>私たちは、利用者様一人ひとりの「個性」と「ペース」を何よりも大切にしています。<br>
          無理のないスケジュールの中で、創作活動や生産活動を通じて「できた！」という喜びや達成感を共有し、自信へと繋げていきます。<br>
          また、利用者様だけでなく、ご家族や地域の皆様とも連携し、温かく開かれた施設づくりを目指しています。</p>
        </div>
      </div>
    </section>
        """
    },
    "service.html": {
        "title": "サービス内容",
        "desc": "生活介護 希望の家で提供しているサービス内容や一日の流れをご紹介します。",
        "content": """
    <section class="section service">
      <div class="container">
        <h2 class="section-title">生活介護とは</h2>
        <div class="content-box" style="margin-bottom: 80px;">
          <p>常に介護を必要とする方に対して、昼間、入浴・排せつ・食事の介護等を行うとともに、創作的活動や生産活動の機会を提供する障害福祉サービスです。</p>
        </div>

        <h2 class="section-title">主な活動内容</h2>
        <div class="features-grid">
          <div class="feature-card">
            <h3 class="feature-title">日常生活支援</h3>
            <p class="feature-text">食事、排泄、更衣など、日常生活を送る上で必要な支援を行います。身体機能の維持・向上を目指したサポートも行います。</p>
          </div>
          <div class="feature-card">
            <h3 class="feature-title">創作的活動</h3>
            <p class="feature-text">絵画、手芸、工作など、季節に合わせた様々なアート活動を行います。表現する楽しさを味わい、豊かな感性を育みます。</p>
          </div>
          <div class="feature-card">
            <h3 class="feature-title">生産活動</h3>
            <p class="feature-text">簡単な内職作業や園芸活動など、それぞれの能力に応じた作業を行います。働く喜びや達成感を感じていただけます。</p>
          </div>
          <div class="feature-card">
            <h3 class="feature-title">集団・余暇活動</h3>
            <p class="feature-text">音楽療法、体操、季節の行事など、仲間と一緒に楽しむ時間を大切にします。コミュニケーションの機会を増やし、社会性を育みます。</p>
          </div>
        </div>

        <h2 class="section-title" style="margin-top: 80px;">一日の流れ</h2>
        <div class="timeline detailed-timeline">
          <div class="timeline-item">
            <div class="timeline-time">8:30</div>
            <div class="timeline-content">
              <h3 class="timeline-title">送迎・お迎え</h3>
              <p>専用の送迎車でご自宅までお迎えに上がります。車椅子対応車両も完備しています。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">9:00</div>
            <div class="timeline-content">
              <h3 class="timeline-title">到着・健康チェック</h3>
              <p>施設に到着後、手洗い・うがいを行います。看護スタッフ等による毎日の体調確認をしっかりと行います。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">10:00</div>
            <div class="timeline-content">
              <h3 class="timeline-title">朝の会・午前活動</h3>
              <p>一日の予定を確認し、それぞれのプログラム（創作活動、軽作業、散歩など）に分かれて活動します。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">11:30</div>
            <div class="timeline-content">
              <h3 class="timeline-title">昼食準備・昼食</h3>
              <p>バランスの良い温かい食事を提供します。ご嚥下や咀嚼の状態に合わせた食形態にも対応いたします。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">12:30</div>
            <div class="timeline-content">
              <h3 class="timeline-title">休憩・余暇時間</h3>
              <p>食後は各自リラックスして過ごします。テレビを見たり、音楽を聴いたり、自分のペースで休養をとります。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">14:00</div>
            <div class="timeline-content">
              <h3 class="timeline-title">午後活動</h3>
              <p>全体でのレクリエーションや、音楽活動、体操など、体を動かしたり声を出したりして楽しく過ごします。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">15:30</div>
            <div class="timeline-content">
              <h3 class="timeline-title">おやつ・帰りの会</h3>
              <p>おやつを食べながら今日一日の振り返りをし、明日への期待に繋げます。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">16:00</div>
            <div class="timeline-content">
              <h3 class="timeline-title">送迎・帰宅</h3>
              <p>順次、送迎車でご自宅までお送りします。ご家族に一日の様子をお伝えします。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
        """
    },
    "facility.html": {
        "title": "施設のご案内",
        "desc": "生活介護 希望の家の施設や設備についてご紹介します。",
        "content": """
    <section class="section facility">
      <div class="container">
        <h2 class="section-title">施設紹介</h2>
        <div class="content-box">
          <p>希望の家は、明るく清潔で、利用される皆様が安全かつ快適に過ごせる環境を整えています。車椅子でも移動しやすい広々としたバリアフリー設計を採用しています。</p>
        </div>

        <div class="gallery-grid" style="margin-top: 40px;">
          <div class="gallery-item">
            <img src="images/hero.png" alt="広々とした活動スペース" loading="lazy">
          </div>
          <div class="gallery-item">
            <img src="images/activity1.png" alt="創作活動を行うテーブルエリア" loading="lazy">
          </div>
          <div class="gallery-item">
            <img src="images/activity3.png" alt="落ち着いて休める静養室・休憩スペース" loading="lazy">
          </div>
          <div class="gallery-item">
            <img src="images/activity2.png" alt="機能訓練や体操を行うスペース" loading="lazy">
          </div>
        </div>
      </div>
    </section>
        """
    },
    "guide.html": {
        "title": "ご利用案内",
        "desc": "生活介護 希望の家の対象者、利用までの流れ、料金などをご案内します。",
        "content": """
    <section class="section guide">
      <div class="container">
        <h2 class="section-title">ご利用対象者</h2>
        <div class="content-box" style="margin-bottom: 80px;">
          <p>障害支援区分が区分3（施設入所支援を利用する場合は区分4）以上である方。<br>
          ※年齢が50歳以上の場合は、障害支援区分が区分2（施設入所支援を利用する場合は区分3）以上である方。<br>
          詳細はお住まいの市区町村の障害福祉窓口にご確認ください。</p>
        </div>

        <h2 class="section-title">ご利用までの流れ</h2>
        <div class="step-list" style="margin-bottom: 80px;">
          <div class="step-item">
            <div class="step-num">Step 1</div>
            <h3>見学・お問い合わせ</h3>
            <p>まずはお電話またはお問い合わせフォームよりご連絡ください。施設のご見学やご相談の日程を調整いたします。</p>
          </div>
          <div class="step-item">
            <div class="step-num">Step 2</div>
            <h3>面談・アセスメント</h3>
            <p>ご本人様、ご家族様と面談を行い、ご希望や現在の状況、必要な支援について詳しくお伺いします。</p>
          </div>
          <div class="step-item">
            <div class="step-num">Step 3</div>
            <h3>受給者証の申請</h3>
            <p>お住まいの市区町村へ生活介護の支給申請を行っていただき、「障害福祉サービス受給者証」の交付を受けます。（既に取得済みの場合は不要です）</p>
          </div>
          <div class="step-item">
            <div class="step-num">Step 4</div>
            <h3>ご契約・利用開始</h3>
            <p>重要事項等のご説明を行い、ご納得いただいた上で契約を締結します。その後、個別支援計画を作成し、利用スタートとなります。</p>
          </div>
        </div>

        <h2 class="section-title">基本情報</h2>
        <table class="info-table">
          <tbody>
            <tr>
              <th>開所日</th>
              <td>月曜日〜金曜日（祝日も営業する場合があります。詳細はカレンダーをご確認ください）</td>
            </tr>
            <tr>
              <th>サービス提供時間</th>
              <td>9:00〜16:00</td>
            </tr>
            <tr>
              <th>休業日</th>
              <td>土曜日、日曜日、年末年始（12/29〜1/3）</td>
            </tr>
            <tr>
              <th>送迎エリア</th>
              <td>あきる野市周辺（詳細なエリアについてはお問い合わせください）</td>
            </tr>
            <tr>
              <th>ご利用料金</th>
              <td>
                障害福祉サービス費の自己負担額（所得に応じて上限月額が設定されます）。<br>
                その他、昼食代（準備中／要確認）、創作活動材料費等が別途かかります。
              </td>
            </tr>
            <tr>
              <th>持ち物</th>
              <td>上履き、着替え、お薬（必要な方）、歯ブラシセットなど</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
        """
    },
    "activities.html": {
        "title": "活動の様子",
        "desc": "生活介護 希望の家の日常の活動風景や行事をご紹介します。",
        "content": """
    <section class="section activities">
      <div class="container">
        <h2 class="section-title">年間行事（一例）</h2>
        <div class="content-box">
          <ul class="event-list">
            <li><strong>春：</strong> お花見、新入生歓迎会、散策</li>
            <li><strong>夏：</strong> 七夕、夏祭り、かき氷作り</li>
            <li><strong>秋：</strong> ハロウィン、運動会、紅葉狩り</li>
            <li><strong>冬：</strong> クリスマス会、初詣、節分、ひな祭り</li>
          </ul>
          <p class="note">※季節の行事以外にも、毎月のお誕生日会などを実施しています。</p>
        </div>

        <h2 class="section-title" style="margin-top: 80px;">日々の様子</h2>
        <div class="gallery-grid">
          <div class="gallery-item">
            <img src="images/activity1.png" alt="日々の活動の様子" loading="lazy">
          </div>
          <div class="gallery-item">
            <img src="images/activity2.png" alt="日々の活動の様子" loading="lazy">
          </div>
          <div class="gallery-item">
            <img src="images/activity3.png" alt="日々の活動の様子" loading="lazy">
          </div>
          <div class="gallery-item">
            <img src="images/hero.png" alt="日々の活動の様子" loading="lazy">
          </div>
        </div>
      </div>
    </section>
        """
    },
    "news.html": {
        "title": "お知らせ",
        "desc": "生活介護 希望の家からの最新情報やお知らせ一覧です。",
        "content": """
    <section class="section news-page">
      <div class="container">
        <ul class="news-list">
          <li class="news-item">
            <a href="news.html">
              <div class="news-meta">
                <time datetime="2026-06-01">2026.06.01</time>
                <span class="news-category">お知らせ</span>
              </div>
              <h3 class="news-title">公式ホームページを公開いたしました。</h3>
            </a>
          </li>
          <li class="news-item">
            <a href="news.html">
              <div class="news-meta">
                <time datetime="2026-05-20">2026.05.20</time>
                <span class="news-category">イベント</span>
              </div>
              <h3 class="news-title">春のレクリエーション活動のご報告</h3>
            </a>
          </li>
          <li class="news-item">
            <a href="news.html">
              <div class="news-meta">
                <time datetime="2026-04-10">2026.04.10</time>
                <span class="news-category">重要</span>
              </div>
              <h3 class="news-title">ご利用にあたっての新型コロナウイルス感染予防対策について</h3>
            </a>
          </li>
          <li class="news-item">
            <a href="news.html">
              <div class="news-meta">
                <time datetime="2026-03-15">2026.03.15</time>
                <span class="news-category">お知らせ</span>
              </div>
              <h3 class="news-title">新しい送迎車両が納車されました。</h3>
            </a>
          </li>
          <li class="news-item">
            <a href="news.html">
              <div class="news-meta">
                <time datetime="2026-02-01">2026.02.01</time>
                <span class="news-category">お知らせ</span>
              </div>
              <h3 class="news-title">2月の献立表を更新しました。</h3>
            </a>
          </li>
        </ul>
      </div>
    </section>
        """
    },
    "faq.html": {
        "title": "よくある質問",
        "desc": "生活介護 希望の家へ寄せられる、よくあるご質問と回答です。",
        "content": """
    <section class="section faq">
      <div class="container">
        <div class="accordion">
          <div class="accordion-item">
            <button class="accordion-header">Q. 見学はいつでも可能ですか？<span class="icon"></span></button>
            <div class="accordion-content">
              <p>A. はい、随時受け付けております。行事等の都合でご案内が難しい時間帯もございますので、事前にお電話またはお問い合わせフォームよりご予約をお願いいたします。</p>
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-header">Q. 送迎サービスはありますか？<span class="icon"></span></button>
            <div class="accordion-content">
              <p>A. はい、ございます。あきる野市周辺を中心に行っておりますが、詳細な送迎範囲やルートについてはご相談ください。車椅子対応の車両もご用意しております。</p>
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-header">Q. 昼食はお弁当を持参しても良いですか？<span class="icon"></span></button>
            <div class="accordion-content">
              <p>A. 施設で温かいお食事を提供しておりますが、ご希望に合わせてお弁当をご持参いただくことも可能です。アレルギー等への対応については個別にご相談ください。</p>
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-header">Q. 医療的ケアが必要ですが利用できますか？<span class="icon"></span></button>
            <div class="accordion-content">
              <p>A. 看護師を配置しておりますが、対応可能な医療的ケアの内容には限りがございます。主治医の指示書等をもとに、事前にご相談・アセスメントの上で判断させていただきます。</p>
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-header">Q. 車椅子での利用は可能ですか？<span class="icon"></span></button>
            <div class="accordion-content">
              <p>A. はい、可能です。施設内はバリアフリー設計となっており、車椅子対応トイレや特殊浴槽なども完備しておりますので安心してご利用いただけます。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
        """
    },
    "access.html": {
        "title": "アクセス",
        "desc": "生活介護 希望の家へのアクセス、地図、所在地のご案内です。",
        "content": """
    <section class="section access-page">
      <div class="container">
        <div class="access-content">
          <div class="access-info">
            <h3 class="access-name">生活介護 希望の家</h3>
            <p class="access-address">〒190-0164<br>東京都あきる野市五日市374-5</p>
            <div class="access-route">
              <h4>最寄り駅</h4>
              <p>JR五日市線「武蔵五日市駅」より徒歩約10〜15分</p>
            </div>
            <div class="access-route">
              <h4>お電話</h4>
              <p>000-000-0000 <span class="note">（※準備中／要確認）</span></p>
            </div>
            <div class="access-route">
              <h4>お車でお越しの方</h4>
              <p>施設内に駐車場がございます。</p>
            </div>
          </div>
          <div class="access-map">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12953.518659102927!2d139.213235!3d35.733615!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6019245bb388bc61%3A0xc3f58a74b121ec25!2z5p2x5Lqs6YO944GC44GN44KL6YeO5biC5LqU5pel5biC!5e0!3m2!1sja!2sjp!4v1700000000000!5m2!1sja!2sjp" width="100%" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>
      </div>
    </section>
        """
    },
    "contact.html": {
        "title": "お問い合わせ",
        "desc": "生活介護 希望の家への見学予約やお問い合わせはこちらから。",
        "content": """
    <section class="section contact">
      <div class="container">
        <div class="content-box">
          <p class="text-center" style="margin-bottom: 40px;">見学のご予約、ご利用についてのご相談など、お気軽にお問い合わせください。</p>
          
          <div class="contact-methods">
            <div class="contact-method-item">
              <h3>お電話でのお問い合わせ</h3>
              <p class="tel-number">000-000-0000</p>
              <p class="note">受付時間：月〜金 9:00〜17:00<br>（※電話番号は準備中／要確認）</p>
            </div>
          </div>

          <h3 class="form-title" style="margin-top: 60px; text-align: center; color: var(--color-main);">お問い合わせフォーム</h3>
          <!-- プレースホルダとしてのフォームUI -->
          <form class="contact-form" action="#" method="POST">
            <p class="note" style="text-align: center; margin-bottom: 24px;">※現在フォームは準備中です。本番環境ではGoogleフォーム等の外部サービスを埋め込むか、送信プログラムと連携します。</p>
            <div class="form-group">
              <label for="name">お名前 <span class="required">必須</span></label>
              <input type="text" id="name" name="name" placeholder="例：山田 太郎" required>
            </div>
            <div class="form-group">
              <label for="email">メールアドレス <span class="required">必須</span></label>
              <input type="email" id="email" name="email" placeholder="例：info@example.com" required>
            </div>
            <div class="form-group">
              <label for="tel">電話番号</label>
              <input type="tel" id="tel" name="tel" placeholder="例：000-000-0000">
            </div>
            <div class="form-group">
              <label for="category">お問い合わせ種別</label>
              <select id="category" name="category">
                <option value="">選択してください</option>
                <option value="見学について">見学について</option>
                <option value="利用に関するご相談">利用に関するご相談</option>
                <option value="採用について">採用について</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div class="form-group">
              <label for="message">お問い合わせ内容 <span class="required">必須</span></label>
              <textarea id="message" name="message" rows="6" placeholder="お問い合わせ内容をご入力ください" required></textarea>
            </div>
            <div class="btn-wrap">
              <button type="button" class="btn btn-contact btn-lg">送信する</button>
            </div>
          </form>
        </div>
      </div>
    </section>
        """
    },
    "privacy.html": {
        "title": "個人情報保護方針",
        "desc": "生活介護 希望の家の個人情報保護方針（プライバシーポリシー）について。",
        "content": """
    <section class="section privacy">
      <div class="container">
        <div class="content-box">
          <p style="margin-bottom: 32px;">社会福祉法人SHIP（以下、「当法人」といいます。）は、利用者の皆様の個人情報を適切に取り扱い、保護することが社会的責務であると認識し、以下のとおり個人情報保護方針を定めます。<br><span class="note">（※以下の文章はひな型です。本番公開前に必ず内容をご確認・修正ください）</span></p>

          <h3 class="privacy-title">1. 個人情報の取得について</h3>
          <p>当法人は、適法かつ公正な手段によって、個人情報を取得いたします。</p>

          <h3 class="privacy-title">2. 個人情報の利用目的について</h3>
          <p>当法人は、取得した個人情報を、福祉サービスの提供、利用者への連絡、お問い合わせへの対応など、当法人の事業目的を達成するために必要な範囲内で利用いたします。</p>

          <h3 class="privacy-title">3. 個人情報の第三者提供について</h3>
          <p>当法人は、法令に定める場合を除き、個人情報を、事前に本人の同意を得ることなく、第三者に提供いたしません。</p>

          <h3 class="privacy-title">4. 個人情報の管理について</h3>
          <p>当法人は、個人情報の正確性を保ち、これを安全に管理いたします。個人情報の紛失、破壊、改ざん及び漏えいなどを防止するため、不正アクセス、コンピューターウイルス等に対する適正な情報セキュリティ対策を講じます。</p>

          <h3 class="privacy-title">5. 個人情報の開示・訂正・利用停止・消去について</h3>
          <p>当法人は、本人が自己の個人情報について、開示・訂正・利用停止・消去等を求める権利を有していることを確認し、これらの要求ある場合には、異議なく速やかに対応します。</p>

          <h3 class="privacy-title">6. 組織・体制</h3>
          <p>当法人は、個人情報保護管理者を任命し、個人情報の適正な管理を実施いたします。当法人は、役員及び従業員に対し、個人情報の保護及び適正な管理方法についての研修を実施し、日常業務における個人情報の適正な取り扱いを徹底します。</p>

          <h3 class="privacy-title">7. お問い合わせ窓口</h3>
          <p>本方針に関するお問い合わせは、以下の窓口までお願いいたします。<br>
          生活介護 希望の家<br>
          〒190-0164 東京都あきる野市五日市374-5<br>
          TEL: 000-000-0000</p>
        </div>
      </div>
    </section>
        """
    }
}

for filename, data in pages.items():
    generate_html(filename, data["title"], data["desc"], data["content"])
    print(f"Generated {filename}")

css_additions = """
/* ==========================================================================
   Page Header & Breadcrumb (STEP 2 Additions)
   ========================================================================== */
.breadcrumb {
  background-color: var(--color-base);
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
  margin-top: var(--header-height-pc);
  font-size: 0.85rem;
}
.breadcrumb ul {
  display: flex;
  align-items: center;
  gap: 8px;
}
.breadcrumb a {
  color: var(--color-muted);
}
.breadcrumb a:hover {
  color: var(--color-main);
  text-decoration: underline;
}
@media screen and (max-width: 768px) {
  .breadcrumb {
    margin-top: var(--header-height-sp);
  }
}

.page-header {
  padding: 60px 0;
  text-align: center;
  border-bottom: 1px solid var(--color-border);
}
.page-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  color: var(--color-main);
  font-weight: 700;
}

/* ==========================================================================
   Generic Components (STEP 2 Additions)
   ========================================================================== */
.content-box {
  background-color: var(--color-base);
  padding: 40px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  max-width: 900px;
  margin: 0 auto;
}
.text-center { text-align: center; }

/* About Page */
.mission-wrap {
  display: flex;
  gap: 24px;
  margin-bottom: 80px;
}
.mission-item {
  flex: 1;
  background-color: var(--color-bg-light);
  padding: 32px;
  border-radius: var(--radius-md);
  text-align: center;
  border-top: 4px solid var(--color-main);
}
.mission-item h3 {
  font-size: 1.5rem;
  color: var(--color-main);
  margin-bottom: 16px;
}
@media screen and (max-width: 768px) {
  .mission-wrap { flex-direction: column; }
}

/* Guide Page (Table & Steps) */
.step-list {
  max-width: 800px;
  margin: 0 auto;
}
.step-item {
  display: flex;
  flex-direction: column;
  background-color: var(--color-base);
  padding: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  margin-bottom: 24px;
  position: relative;
}
.step-num {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-sub);
  margin-bottom: 8px;
}
.step-item h3 {
  font-size: 1.25rem;
  margin-bottom: 16px;
}

.info-table {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  border-collapse: collapse;
}
.info-table th, .info-table td {
  padding: 20px;
  border: 1px solid var(--color-border);
}
.info-table th {
  background-color: var(--color-bg-light);
  width: 30%;
  text-align: left;
  font-weight: 500;
}
@media screen and (max-width: 768px) {
  .info-table th, .info-table td {
    display: block;
    width: 100%;
  }
}

/* Activities Page */
.event-list {
  list-style: disc;
  padding-left: 24px;
  margin-bottom: 16px;
}
.event-list li {
  margin-bottom: 8px;
}
.note {
  font-size: 0.85rem;
  color: var(--color-muted);
}

/* FAQ Page (Accordion) */
.accordion {
  max-width: 800px;
  margin: 0 auto;
}
.accordion-item {
  border-bottom: 1px solid var(--color-border);
}
.accordion-header {
  width: 100%;
  text-align: left;
  padding: 24px 16px;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.accordion-header:hover {
  color: var(--color-main);
}
.accordion-header .icon {
  position: relative;
  width: 16px;
  height: 16px;
}
.accordion-header .icon::before, .accordion-header .icon::after {
  content: '';
  position: absolute;
  background-color: var(--color-main);
  transition: transform 0.3s ease;
}
.accordion-header .icon::before { top: 7px; left: 0; width: 16px; height: 2px; }
.accordion-header .icon::after { top: 0; left: 7px; width: 2px; height: 16px; }
.accordion-header.is-active .icon::after { transform: rotate(90deg); opacity: 0; }
.accordion-content {
  padding: 0 16px 24px;
  display: none;
}
.accordion-content.is-open {
  display: block;
}

/* Contact Page (Form) */
.contact-methods {
  text-align: center;
}
.contact-method-item .tel-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 8px 0;
}
.contact-form {
  max-width: 700px;
  margin: 0 auto;
}
.form-group {
  margin-bottom: 24px;
}
.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
}
.required {
  background-color: #e74c3c;
  color: white;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  vertical-align: middle;
}
.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #cccccc;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 1rem;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none;
  border-color: var(--color-main);
  box-shadow: 0 0 0 2px rgba(75,184,227,0.2);
}

/* Privacy Page */
.privacy-title {
  font-size: 1.25rem;
  color: var(--color-main);
  margin: 32px 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}
"""

with open("c:/Users/owner/Desktop/kibounoie-hp/css/style.css", "a", encoding="utf-8") as f:
    f.write(css_additions)
print("Updated style.css")

js_additions = """
  // FAQアコーディオンの開閉処理
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('is-active');
      const content = header.nextElementSibling;
      if (content.classList.contains('is-open')) {
        content.classList.remove('is-open');
      } else {
        content.classList.add('is-open');
      }
    });
  });
"""

with open("c:/Users/owner/Desktop/kibounoie-hp/js/main.js", "a", encoding="utf-8") as f:
    f.write(js_additions)
print("Updated main.js")
