import os
import re

service_html = 'service.html'
with open(service_html, 'r', encoding='utf-8') as f:
    html = f.read()

new_timeline = '''<div class="timeline detailed-timeline">
          <div class="timeline-item">
            <div class="timeline-time">8:40〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">送迎出発</h3>
              <p>ご自宅までお迎えに上がります（対応エリア：あきる野市内）。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">9:50〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">通所・手洗い・トイレ誘導</h3>
              <p>施設に到着後、手洗いやうがいを行い、一息つきます。日々の健康状態を確認する看護師が常駐（※医療的ケアの提供は行っていません）しており、体調管理に努めます。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">10:00〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">始まりの挨拶・午前プログラム</h3>
              <p>一日の予定を確認し、運動プログラム等で体を動かします。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">12:00〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">昼食</h3>
              <p>昼食は弁当の注文制（自費）となっています（ご持参も可能です）。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">12:30〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">歯磨き・昼休み</h3>
              <p>食後は各自リラックスして過ごします。テレビを見たり、音楽を聴いたり、自分のペースで休養をとります。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">14:00〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">午後プログラム</h3>
              <p>曜日別の活動（月＝レクリエーション、火＝音楽、水＝フリーイベント、木＝美術、金＝運動）を行います。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">15:00〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">帰り支度・終わりの挨拶</h3>
              <p>今日一日の振り返りをし、明日への期待に繋げます。</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">16:00〜</div>
            <div class="timeline-content">
              <h3 class="timeline-title">送迎・帰宅</h3>
              <p>順次、送迎車でご自宅まで安全にお送りします。</p>
            </div>
          </div>
        </div>'''

html = re.sub(r'<div class="timeline detailed-timeline">.*?</div>\s*</div>\s*</section>', new_timeline + '\n      </div>\n    </section>', html, flags=re.DOTALL)

with open(service_html, 'w', encoding='utf-8') as f:
    f.write(html)
