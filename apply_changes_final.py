import os
import re

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Parking
    content = content.replace(
        '<p>施設内に駐車場がございます。</p>',
        '<p>施設内に1～2台分の駐車場がございます。台数に限りがあるため、お車でお越しの際は事前にお問い合わせください。</p>'
    )
    
    # 2. Holiday
    content = content.replace(
        '<td>月曜日〜金曜日（祝日も営業する場合があります。詳細はカレンダーをご確認ください）</td>',
        '<td>月曜日〜金曜日（祝日は基本的に休業です。ただし、イベント等により一時的に営業する場合があります）</td>'
    )
    content = content.replace(
        '<td>土曜日、日曜日、年末年始（12/29〜1/3）</td>',
        '<td>土曜日、日曜日、祝日、年末年始（12月29日〜1月3日）<br>※イベント等により、祝日に一時的に営業する場合があります。</td>'
    )
    # Footer
    content = content.replace(
        '運営日: 月〜金 10:00〜16:00',
        '運営日: 月〜金（祝日は原則休業）10:00〜16:00'
    )
    
    # 3. Walk time
    content = content.replace('JR五日市線「武蔵五日市駅」より徒歩約10〜15分', 'JR五日市線「武蔵五日市駅」より徒歩約10分')
    content = content.replace('JR五日市線「武蔵五日市駅」より徒歩約10～15分', 'JR五日市線「武蔵五日市駅」より徒歩約10分')
    content = content.replace('徒歩約10〜15分', '徒歩約10分')
    content = content.replace('徒歩約10～15分', '徒歩約10分')
    content = content.replace('徒歩15分', '徒歩10分')
    
    # 4. Bathing
    content = content.replace(
        '<p>常に介護を必要とする方に対して、昼間、入浴・排せつ・食事の介護等を行うとともに、創作的活動や生産活動の機会を提供する障害福祉サービスです。</p>',
        '<p>常に介護を必要とする方に対して、昼間、排せつ・食事などの日常生活上の支援を行うとともに、創作的活動や生産活動の機会を提供する障害福祉サービスです。</p>'
    )
    
    # Images in index.html and activities.html (gallery)
    old_gallery = """        <div class="gallery-grid">
          <div class="gallery-item">
            <img src="images/activity1.png" alt="創作活動の様子" loading="lazy">
          </div>
          <div class="gallery-item">
            <img src="images/activity2.png" alt="送迎車両と事業所の外観" loading="lazy">
          </div>
          <div class="gallery-item">
            <img src="images/activity3.png" alt="リラックスできる屋内スペース" loading="lazy">
          </div>
          <div class="gallery-item">
            <img src="images/hero.png" alt="明るい施設内の様子" loading="lazy">
          </div>
        </div>"""
        
    old_gallery_activities = """        <div class="gallery-grid">
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
        </div>"""

    new_gallery = """        <div class="gallery-grid">
          <div class="gallery-item">
            <img src="images/photo-creative-support.jpg" alt="職員と利用者が創作活動に取り組む様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-daily-support.jpg" alt="口腔・生活支援の様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-drum-activity.jpg" alt="和太鼓の活動を行う様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-recreation.jpg" alt="ボッチャなどのレクリエーションを行う様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-group-exercise.jpg" alt="椅子に座って集団体操を行う様子" loading="lazy" width="800" height="533">
          </div>
        </div>"""

    if filepath == 'index.html':
        content = content.replace('<img src="images/hero_slide1_orange.png" alt="希望の家の清潔で明るい施設内観">', '<img src="images/photo-facility-exterior.jpg" alt="希望の家の建物外観" width="800" height="533">')
        content = content.replace('<img src="images/hero_slide2_orange.png" alt="職員が利用者に優しく寄り添い支援する様子">', '<img src="images/photo-creative-support.jpg" alt="職員と利用者が創作活動に取り組む様子" width="800" height="533">')
        content = content.replace('<img src="images/hero_slide3_orange.png" alt="和やかな雰囲気で創作活動を行う様子">', '<img src="images/photo-group-exercise.jpg" alt="椅子に座って集団体操を行う様子" width="800" height="533">')
        content = content.replace('<img src="images/about_mission_orange.png" alt="希望の家の様子">', '<img src="images/photo-facility-entrance.jpg" alt="希望の家の入口" loading="lazy" width="800" height="533">')
        content = content.replace(old_gallery, new_gallery)
        
    elif filepath == 'about.html':
        content = content.replace('<img src="images/about_facility_orange.png" alt="希望の家の清潔で温かい施設内観" loading="lazy">', '<img src="images/photo-facility-exterior.jpg" alt="希望の家の建物外観" loading="lazy" width="800" height="533">')
        content = content.replace('<img src="images/about_mission_orange.png" alt="スタッフが利用者に優しく寄り添う様子" loading="lazy">', '<img src="images/photo-creative-support.jpg" alt="職員と利用者が創作活動に取り組む様子" loading="lazy" width="800" height="533">')
        
    elif filepath == 'service.html':
        content = content.replace('<img src="images/activity_daily_orange.png" alt="日常生活支援の様子" loading="lazy">', '<img src="images/photo-daily-support.jpg" alt="口腔・生活支援の様子" loading="lazy" width="800" height="533">')
        content = content.replace('<img src="images/activity_creative_orange.png" alt="創作的活動の様子" loading="lazy">', '<img src="images/photo-art-activity.jpg" alt="ペンを使った創作活動に取り組む様子" loading="lazy" width="800" height="533">')
        content = content.replace('<img src="images/activity_productive_orange.png" alt="生産活動の様子" loading="lazy">', '<img src="images/photo-creative-support.jpg" alt="新聞紙などを使用した生産活動の様子" loading="lazy" width="800" height="533">')
        content = content.replace('<img src="images/activity_leisure_orange.png" alt="集団・余暇活動の様子" loading="lazy">', '<img src="images/photo-drum-activity.jpg" alt="和太鼓の活動を行う様子" loading="lazy" width="800" height="533">')
        
    elif filepath == 'facility.html':
        content = content.replace('<img src="images/hero.png" alt="広々とした活動スペース" loading="lazy">', '<img src="images/photo-facility-exterior.jpg" alt="希望の家の建物外観" loading="lazy" width="800" height="533">')
        content = content.replace('<img src="images/activity1.png" alt="創作活動を行うテーブルエリア" loading="lazy">', '<img src="images/photo-facility-entrance.jpg" alt="希望の家の入口" loading="lazy" width="800" height="533">')
        content = content.replace('<img src="images/activity3.png" alt="落ち着いて休める静養室・休憩スペース" loading="lazy">', '<img src="images/photo-recreation.jpg" alt="ボッチャなどのレクリエーションを行う様子" loading="lazy" width="800" height="533">')
        content = content.replace('<img src="images/activity2.png" alt="機能訓練や体操を行うスペース" loading="lazy">', '<img src="images/photo-group-exercise.jpg" alt="椅子に座って集団体操を行う様子" loading="lazy" width="800" height="533">')
        
    elif filepath == 'activities.html':
        content = content.replace(old_gallery_activities, new_gallery)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

html_files = [f for f in os.listdir('.') if f.endswith('.html')]
for file in html_files:
    update_file(file)
