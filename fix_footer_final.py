import os
import re

footer_info_full = '''      <div class="footer-top">
        <div class="footer-info">
          <h2 class="footer-logo"><a href="index.html" style="color: inherit; text-decoration: none;">希望の家</a></h2>
          <p class="footer-address">
            あきる野市障害者通所支援施設「希望の家」<br>
            〒190-0164 東京都あきる野市五日市374-5<br>
            TEL: 042-595-2324 / FAX: 042-595-1441<br>
            定員20名 / 運営日: 月〜金 10:00〜16:00
          </p>
          <p class="footer-corp">運営法人: <a href="https://www.swsc-ship.com/" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: #fff;">社会福祉法人SHIP</a> | <a href="https://x.com/swscship" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: #fff;">公式X</a><br>
          <a href="https://www.swsc-ship.com/job-posts/" target="_blank" rel="noopener noreferrer" style="font-size: 0.85rem; color: #ddd; text-decoration: underline;">採用情報（法人サイトへ）</a></p>
        </div>
        <div class="footer-links">'''

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()

    # The current state has:
    # <div class="footer-top">
    #   <div class="footer-info">...</div>
    #   <p class="footer-address">...</p>
    #   <p class="footer-tel">...</p>
    # </div>
    # <div class="footer-links">
    
    html = re.sub(r'<div class="footer-top">.*?<div class="footer-links">', footer_info_full, html, flags=re.DOTALL)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)
print("Footer fully fixed.")
