import os
import re

# 1. Fix CSS focus outline box shadow
css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()
css = css.replace('rgba(26, 117, 156, 0.1)', 'rgba(200, 90, 0, 0.1)')
with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

# 2. Fix Footer
footer_info_full = '''        <div class="footer-info">
          <h2 class="footer-logo"><a href="index.html" style="color: inherit; text-decoration: none;">希望の家</a></h2>
          <p class="footer-address">
            あきる野市障害者通所支援施設「希望の家」<br>
            〒190-0164 東京都あきる野市五日市374-5<br>
            TEL: 042-595-2324 / FAX: 042-595-1441<br>
            定員20名 / 運営日: 月〜金 10:00〜16:00
          </p>
          <p class="footer-corp">運営法人: <a href="https://www.swsc-ship.com/" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: #fff;">社会福祉法人SHIP</a> | <a href="https://x.com/swscship" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: #fff;">公式X</a><br>
          <a href="https://www.swsc-ship.com/job-posts/" target="_blank" rel="noopener noreferrer" style="font-size: 0.85rem; color: #ddd; text-decoration: underline;">採用情報（法人サイトへ）</a></p>
        </div>'''

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()

    # The previous script created a nested or duplicated structure because regex wasn't quite right. 
    # Let's replace the whole footer-top content.
    # We want footer-top to only contain footer_info_full and footer-nav
    # We can use regex to replace everything inside <div class="footer-top"> up to <div class="footer-nav">
    
    html = re.sub(r'<div class="footer-info">.*?<div class="footer-nav">', footer_info_full + '\n        <div class="footer-nav">', html, flags=re.DOTALL)
    
    # Also I noticed I might have messed up the indentation of the injected target text. Let's not worry about indentation for now if it works.

    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)
print("Fixes applied.")
