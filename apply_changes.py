import os
import re

# 1. Update CSS
css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Replace color variables
css = re.sub(
    r'--color-main:\s*#[a-f0-9]+;',
    '--color-main: #f5820a;',
    css
)
css = re.sub(
    r'--color-main-text:\s*#[a-f0-9]+;',
    '--color-main-dark: #c85a00;',
    css
)
css = re.sub(
    r'--color-main-button:\s*#[a-f0-9]+;',
    '--color-accent: #4bb8e3;',
    css
)
css = re.sub(
    r'--color-sub-text:\s*#[a-f0-9]+;',
    '--color-bg-light: #fff6ed;',
    css
)
css = re.sub(
    r'--color-sub:\s*#[a-f0-9]+;',
    '--color-sub: #f5820a; /* Not used directly but kept for safety, mapping to main */',
    css
)
css = re.sub(
    r'--color-bg-light:\s*#[a-f0-9]+;',
    '--color-bg-soft: #fff6ed;',
    css
)
css = re.sub(
    r'--color-muted:\s*#[a-f0-9]+;',
    '--color-text-sub: #666666;',
    css
)

# Global replaces in CSS for variable names
css = css.replace('var(--color-main-text)', 'var(--color-main-dark)')
css = css.replace('var(--color-main-button)', 'var(--color-main-dark)')
css = css.replace('var(--color-sub-text)', 'var(--color-main-dark)')
css = css.replace('var(--color-muted)', 'var(--color-text-sub)')
css = css.replace('background-color: #e5f4fa;', 'background-color: var(--color-bg-soft);')

# Ensure outline matches new color
css = css.replace('outline: 3px solid var(--color-sub);', 'outline: 3px solid var(--color-main-dark);')
# Ensure btn-hero uses main-dark for background
css = css.replace('background-color: var(--color-main-button);', 'background-color: var(--color-main-dark);')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)


# 2. HTML Replacements
html_files = [f for f in os.listdir('.') if f.endswith('.html')]

# Header / Footer replacements
header_contact = '''<div class="header-contact-pc">
        <div class="header-target-text" style="font-size: 0.8rem; color: var(--color-main-dark); margin-bottom: 4px; font-weight: bold;">あきる野市にお住まいで見学をご検討の方へ</div>
        <a href="contact.html" class="btn btn-contact">見学・お問い合わせ</a>
      </div>'''

footer_info = '''      <div class="footer-info">
        <h2 class="footer-logo"><a href="index.html">希望の家</a></h2>
        <p class="footer-address">
          あきる野市障害者通所支援施設「希望の家」<br>
          〒190-0164 東京都あきる野市五日市374-5<br>
          TEL: 042-595-2324 / FAX: 042-595-1441<br>
          定員20名 / 運営日: 月〜金 10:00〜16:00
        </p>
        <p class="footer-corp">運営法人: <a href="https://www.swsc-ship.com/" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: #fff;">社会福祉法人SHIP</a> | <a href="https://x.com/swscship" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: #fff;">公式X</a><br>
        <a href="https://www.swsc-ship.com/job-posts/" target="_blank" rel="noopener noreferrer" style="font-size: 0.85rem; color: #ddd; text-decoration: underline;">採用情報（法人サイトへ）</a></p>
      </div>'''

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()

    # Footer
    html = re.sub(r'<div class="footer-info">.*?</div>', footer_info, html, flags=re.DOTALL)
    
    # Target text in CTA section
    if '<h2 class="cta-title">見学・ご相談を随時受け付けています</h2>' in html:
        html = html.replace('<h2 class="cta-title">見学・ご相談を随時受け付けています</h2>', 
                            '<h2 class="cta-title">見学・ご相談を随時受け付けています</h2>\n          <p class="cta-target-text" style="font-weight: bold; color: var(--color-main-dark); margin-bottom: 16px;">※あきる野市にお住まいで見学・利用をご検討の方へ</p>')

    # Apply Header contact
    html = re.sub(r'<div class="header-contact-pc">\s*<a href="contact.html" class="btn btn-contact">見学・お問い合わせ</a>\s*</div>', header_contact, html)
    
    # Specific page changes
    if file == 'index.html':
        html = html.replace('images/hero_slide1.png', 'images/hero_slide1_orange.png')
        html = html.replace('images/hero_slide2.png', 'images/hero_slide2_orange.png')
        html = html.replace('images/hero_slide3.png', 'images/hero_slide3_orange.png')
        html = html.replace('<!-- TODO: 本番画像へ差し替え（顔ぼかし・加工前提） -->\n', '')
        html = re.sub(r'<div class="hero-slide( is-active)?">\s*<img src="(.*?)" alt="(.*?)">\s*</div>', 
                      r'<!-- TODO: 本番画像へ差し替え（顔ぼかし・加工前提） -->\n        <div class="hero-slide\1">\n          <img src="\2" alt="\3">\n        </div>', html)
        html = html.replace('誰もが、その人らしく輝ける場所を。', '一人ひとりの『自分らしい』を大切に。')

    if file == 'about.html':
        # Add Mission, Challenge, Value
        mission_html = '''
        <h2 class="section-title">法人理念</h2>
        <div class="content-box">
          <h3 style="color: var(--color-main-dark); margin-bottom: 8px;">【Mission ―使命―】</h3>
          <p style="margin-bottom: 16px;">わたし達は、みんなで幸せになる社会創りを使命とします。地域の社会問題と真摯に向き合い、その解決を目指します。そして、一人ひとりのニーズとデマンドを追究し、みんなが力を出し合い、みんなで幸せになる社会創りを使命とします。</p>
          <h3 style="color: var(--color-main-dark); margin-bottom: 8px;">【Challenge ―挑戦―】</h3>
          <p style="margin-bottom: 16px;">わたし達は、挑戦者です。使命を全うするために、今ある常識にとらわれず考え、リスクを恐れず突き進み、情熱をもって新たなスタンダードを創り続けます。</p>
          <h3 style="color: var(--color-main-dark); margin-bottom: 8px;">【Value ―価値―】</h3>
          <p style="margin-bottom: 16px;">わたし達には、揺るぎない価値基準があります。使命を全うするために、サービスの質、量、継続性を追究し、みんなが納得する成果を価値基準とします。</p>
          <h3 style="color: var(--color-main-dark); margin-bottom: 8px; margin-top: 24px;">SHIPの由来</h3>
          <p>Relationship（関係性）／Partnership（協力）／Leadership（指導力）。みんなで一つの船（SHIP）に乗り込み、共に進んでいくという思いが込められています。</p>
        </div>

        <h2 class="section-title">施設長からのメッセージ</h2>
        <div class="content-box">
          <p>こんにちは、「生活介護 希望の家」の施設長です。<br>
          当施設は、あきる野市からの指定管理事業として社会福祉法人SHIPが運営を開始いたしました。<br>
          「誰もが、その人らしく輝ける場所を」という理念のもと、ご本人の個性やペースを最も大切にし、無理のないスケジュールで日中活動をサポートしてまいります。</p>
          <p style="margin-top: 16px; font-weight: bold; color: var(--color-main-dark);">「委託契約期間後である5年後も続けられる施設を、利用者・保護者のみなさんと一緒につくり上げていきます。」</p>
          <p style="margin-top: 16px;">地域に根ざし、皆様が心から安心できる、温かい第二の家を目指しています。</p>
          <!-- TODO: 施設長メッセージ（本番前にご担当者様にて内容確認・修正をお願いします） -->
        </div>
        '''
        if '【Mission' not in html:
            html = html.replace('<h2 class="section-title">希望の家の理念</h2>', mission_html + '\n        <h2 class="section-title">希望の家の理念</h2>')
        
        # Image replacements
        html = html.replace('images/about_mission.png', 'images/about_mission_orange.png')
        html = html.replace('images/about_facility.png', 'images/about_facility_orange.png')

    if file == 'service.html':
        # Schedule table
        schedule_html = '''
          <h3 style="margin-bottom: 16px; color: var(--color-main-dark);">一日のスケジュール（例）</h3>
          <table class="info-table" style="margin-bottom: 32px;">
            <tr><th>8:40</th><td>送迎出発</td></tr>
            <tr><th>9:50</th><td>通所・手洗い・トイレ誘導</td></tr>
            <tr><th>10:00</th><td>始まりの挨拶・午前プログラム（運動プログラム等）</td></tr>
            <tr><th>12:00</th><td>昼食（お弁当など）</td></tr>
            <tr><th>12:30</th><td>歯磨き・昼休み</td></tr>
            <tr><th>14:00</th><td>午後プログラム（曜日別）</td></tr>
            <tr><th>15:00</th><td>帰り支度・終わりの挨拶</td></tr>
            <tr><th>16:00</th><td>送迎・帰宅</td></tr>
          </table>
          <p><strong>※日々の健康状態の確認を行う看護師が常駐しています（※医療的ケアの提供は行っていません）。</strong></p>
        '''
        if '通所・手洗い' not in html:
            html = re.sub(r'<div class="timeline">.*?</div>', schedule_html, html, flags=re.DOTALL)
        
        if '曜日別' not in html:
             html = html.replace('多彩なプログラムを用意', '曜日別プログラム（月：レクリエーション、火：音楽、水：フリーイベント、木：美術、金：運動）など、多彩なプログラムを用意')

    if file == 'guide.html':
        table_html = '''
        <table class="info-table">
          <tr><th>対象者</th><td>一般就労が難しい、知的または身体に障がいのある方（あきる野市にお住まいの方）</td></tr>
          <tr><th>定員</th><td>20名</td></tr>
          <tr><th>利用日・時間</th><td>月〜金 10:00〜16:00（祝日・年末年始は施設カレンダーによる）</td></tr>
          <tr><th>送迎</th><td>あり（あきる野市内）</td></tr>
          <tr><th>昼食</th><td>弁当注文制（自費）、または持参</td></tr>
          <tr><th>費用</th><td>障害福祉サービス費用の1割負担 ＋ お弁当代・教材費等</td></tr>
        </table>
        '''
        if '対象者' not in html:
            html = re.sub(r'<div class="step-list">.*?</div>', table_html, html, flags=re.DOTALL)

    if file == 'staff.html':
        if '国家資格' not in html:
            html = html.replace('<h2 class="section-title">スタッフ紹介</h2>', '<h2 class="section-title">スタッフ紹介</h2>\n        <p style="margin-bottom: 24px;">当施設では、<strong>公認心理師・社会福祉士・精神保健福祉士・介護福祉士・看護師</strong>などの国家資格を持つ専門スタッフが常駐し、質の高い支援を提供しています。</p>')
    
    if file == 'contact.html':
        if 'TODO: 本番のフォーム' not in html:
            html = html.replace('<form action="#"', '<!-- TODO: 本番のフォーム（Googleフォーム/Formspree等）のエンドポイントへ差し替え -->\n          <form action="#"')

    if file == 'access.html':
        html = html.replace('徒歩5分', '徒歩10〜15分（約510m）')
        if 'title="Google Map"' not in html:
            html = html.replace('<iframe src="', '<iframe title="Google Map" src="')
    
    # Generic image tag TODO injections
    if file not in ['index.html']: # already handled index
        html = re.sub(r'(?!.*<!-- TODO: 本番画像へ差し替え（顔ぼかし・加工前提） -->\s*)<img src="images/(about|activity)_[^"]+" alt="([^"]*)">', 
                      r'<!-- TODO: 本番画像へ差し替え（顔ぼかし・加工前提） -->\n            <img src="images/\1_orange.png" alt="\2">', html)

    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("HTML modifications applied.")
