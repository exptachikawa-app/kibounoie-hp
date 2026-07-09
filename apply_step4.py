import os
import re

# 1. Update CSS
css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Adjust gnav gap
css = css.replace('gap: clamp(10px, 1.2vw, 24px);', 'gap: clamp(16px, 1.8vw, 32px);')
# Adjust gnav font-size
css = css.replace('font-size: clamp(13px, 1.1vw, 15px);', 'font-size: clamp(14px, 1.2vw, 16px);')
# Adjust contact margin-left
css = css.replace('margin-left: clamp(16px, 2vw, 32px);', 'margin-left: clamp(24px, 3vw, 48px);')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)


# 2. HTML Replacements
html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()

    # Remove news from header/footer nav
    html = re.sub(r'\s*<li class="gnav-item"><a href="news\.html">お知らせ</a></li>', '', html)
    html = re.sub(r'\s*<li><a href="news\.html">お知らせ</a></li>', '', html)
    
    # Remove any staff link just in case
    html = re.sub(r'\s*<li class="gnav-item"><a href="staff\.html">スタッフ紹介</a></li>', '', html)
    html = re.sub(r'\s*<li><a href="staff\.html">スタッフ紹介</a></li>', '', html)
    
    # Telephone number updates
    html = html.replace('000-000-0000', '042-595-2324')
    html = html.replace('tel:0000000000', 'tel:0425952324')
    html = html.replace('<br><span class="tel-note">（※電話番号は準備中／要確認）</span>', '')
    html = html.replace('<br class="sp-only"><span class="tel-note">（※電話番号は準備中／要確認）</span>', '')
    html = html.replace('<span class="tel-note">（※準備中／要確認）</span>', '')
    
    # Clean up empty br left behind possibly
    html = html.replace('042-595-2324<br></p>', '042-595-2324</p>')

    # Remove target restriction text
    html = re.sub(r'\s*<div class="header-target-text".*?>あきる野市にお住まいで見学をご検討の方へ</div>', '', html)
    html = re.sub(r'\s*<p class="cta-target-text".*?>※あきる野市にお住まいで見学・利用をご検討の方へ</p>', '', html)

    # Specific page updates
    if file == 'index.html':
        # Remove news section block
        # Match from <!-- ====== お知らせ ====== --> to right before <!-- ====== 見学・お問い合わせ CTA ====== -->
        html = re.sub(r'<!-- =+[\r\n\s]+お知らせ[\r\n\s]+=+ -->[\r\n\s]+<section class="section news js-fade-up">.*?</section>[\r\n\s]+', '', html, flags=re.DOTALL)
        
        # In index, replace daily flow
        # "8:30お迎え／9:00健康チェック／11:30昼食" (old values if any, but the previous script already changed service.html, let's make sure index is correct)
        # Actually in step 1, index had a daily flow section. Let's replace the whole timeline in index.html just to be sure.
        schedule_html = '''
        <div class="timeline">
          <div class="timeline-item">
            <div class="timeline-time">8:40〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">送迎出発</h3>
              <p class="timeline-text">ご自宅までお迎えに上がります（あきる野市内）。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">10:00〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">始まりの挨拶・午前プログラム</h3>
              <p class="timeline-text">体調確認後、運動プログラム等で体を動かします。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">12:00〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">昼食</h3>
              <p class="timeline-text">お弁当（注文制）またはご持参いただいた昼食をとります。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">14:00〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">午後プログラム</h3>
              <p class="timeline-text">曜日別の活動（レクリエーション、音楽、美術、運動など）を行います。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">16:00〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">送迎・帰宅</h3>
              <p class="timeline-text">ご自宅まで安全にお送りします。</p>
            </div>
          </div>
        </div>
        '''
        if '<div class="timeline">' in html:
            html = re.sub(r'<div class="timeline">.*?</div>\s*</div>\s*</section>', schedule_html + '\n        </div>\n      </div>\n    </section>', html, flags=re.DOTALL)
        
    if file == 'service.html':
        # "栄養バランスを考えた温かいお食事を提供" -> "昼食は弁当の注文制（自費）またはご持参"
        html = re.sub(r'栄養バランスを考えた温かいお食事を提供.*?。', '昼食は弁当の注文制（自費）となっています（ご持参も可能です）。', html)

    if file == 'guide.html':
        # "車椅子対応の車両もご用意" -> "ご自宅から事業所まで送迎（対応エリア：あきる野市内）"
        # Since I replaced it with a table in step 3, let's just make sure "車椅子対応の車両もご用意" is gone.
        html = html.replace('車椅子対応の車両もご用意', 'ご自宅から事業所まで送迎（対応エリア：あきる野市内）')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Updates applied.")
