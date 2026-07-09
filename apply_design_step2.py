import os
import re

# 1. Fix about.html labels and apply zigzag
with open('about.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Update labels for about.html
html = html.replace('<span class="section-label">Info</span><h2 class="section-title">法人理念</h2>', '<span class="section-label">Philosophy</span><h2 class="section-title">法人理念</h2>')
html = html.replace('<span class="section-label">Info</span><h2 class="section-title">運営法人について</h2>', '<span class="section-label">Organization</span><h2 class="section-title">運営法人について</h2>')
html = html.replace('<span class="section-label">Info</span><h2 class="section-title">大切にしていること</h2>', '<span class="section-label">Value</span><h2 class="section-title">大切にしていること</h2>')

# Convert split-layout to zigzag-row
html = html.replace('class="split-layout js-fade-up"', 'class="zigzag-row js-fade-up"')
html = html.replace('class="split-layout reverse js-fade-up"', 'class="zigzag-row js-fade-up"') # nth-child(even) handles reverse
html = html.replace('class="split-text"', 'class="zigzag-text"')
html = html.replace('class="split-image"', 'class="zigzag-img"')

with open('about.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Fix service.html
with open('service.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace features-grid-2x2 with zigzag rows
# Find all feature-cards in the grid
cards = re.findall(r'<div class="feature-card js-fade-up">(.*?)</div>\s*</div>', html, flags=re.DOTALL)
if cards:
    zigzag_html = ""
    for card in cards:
        img_match = re.search(r'<img src="([^"]+)" alt="([^"]+)"', card)
        title_match = re.search(r'<h3 class="feature-title">([^<]+)</h3>', card)
        text_match = re.search(r'<p class="feature-text">([^<]+)</p>', card)
        
        if img_match and title_match and text_match:
            src, alt = img_match.groups()
            title = title_match.group(1)
            text = text_match.group(1)
            zigzag_html += f'''
        <div class="zigzag-row js-fade-up">
          <div class="zigzag-img">
            <img src="{src}" alt="{alt}" loading="lazy">
          </div>
          <div class="zigzag-text">
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </div>'''
    
    # Replace the grid with zigzag_html
    html = re.sub(r'<div class="features-grid-2x2">.*?</div>\s*(<div class="section-header">)', zigzag_html + r'\n        \1', html, flags=re.DOTALL)

with open('service.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 3. Fix index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Update labels in index.html
html = html.replace('<span class="section-label">Info</span><h2 class="section-title">希望の家の特色</h2>', '<span class="section-label">Features</span><h2 class="section-title">希望の家の特色</h2>')
html = html.replace('<span class="section-label">Info</span><h2 class="section-title">一日の流れ（ダイジェスト）</h2>', '<span class="section-label">Daily Flow</span><h2 class="section-title">一日の流れ（ダイジェスト）</h2>')
html = html.replace('<span class="section-label">Info</span><h2 class="section-title">活動の様子</h2>', '<span class="section-label">Gallery</span><h2 class="section-title">活動の様子</h2>')

# Convert intro to zigzag
intro_orig = '''<p class="intro-lead">一人ひとりの『自分らしい』を大切に。</p>
          <p class="intro-text">
            「生活介護 希望の家」は、社会福祉法人SHIPが運営する生活介護事業所です。<br>
            一人ひとりの個性とペースを尊重し、日中活動を通じて自分らしく充実した日々を送れるよう、温かい支援を提供しています。<br>
            創作活動や生産活動など、多様なプログラムを通じて、皆様の「やりたい」「できた」という喜びを大切に育んでいきます。
          </p>
          <div class="btn-wrap">
            <a href="about.html" class="btn btn-outline">希望の家について詳しく見る</a>
          </div>'''

intro_new = '''<div class="zigzag-row">
            <div class="zigzag-text" style="text-align: left;">
              <h3 style="font-size: clamp(24px, 3vw, 32px); color: var(--color-main-dark); margin-bottom: 24px; font-family: var(--font-family-serif);">一人ひとりの『自分らしい』を大切に。</h3>
              <p style="line-height: 1.8;">
                「生活介護 希望の家」は、社会福祉法人SHIPが運営する生活介護事業所です。<br>
                一人ひとりの個性とペースを尊重し、日中活動を通じて自分らしく充実した日々を送れるよう、温かい支援を提供しています。<br>
                創作活動や生産活動など、多様なプログラムを通じて、皆様の「やりたい」「できた」という喜びを大切に育んでいきます。
              </p>
              <div class="btn-wrap" style="margin-top: 32px; text-align: left;">
                <a href="about.html" class="btn btn-outline">希望の家について詳しく見る</a>
              </div>
            </div>
            <div class="zigzag-img">
              <img src="images/about_mission_orange.png" alt="希望の家の様子">
            </div>
          </div>'''
html = html.replace(intro_orig, intro_new)

# Update the features numbers in index to be more premium
html = html.replace('①一人ひとりのペースを大切に', '<span style="color:var(--color-main-dark); font-family: var(--font-family-serif); font-size: 1.5rem; margin-right: 8px;">01.</span>一人ひとりのペースを大切に')
html = html.replace('②創作・生産活動', '<span style="color:var(--color-main-dark); font-family: var(--font-family-serif); font-size: 1.5rem; margin-right: 8px;">02.</span>創作・生産活動')
html = html.replace('③送迎サービスあり', '<span style="color:var(--color-main-dark); font-family: var(--font-family-serif); font-size: 1.5rem; margin-right: 8px;">03.</span>送迎サービスあり')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML structural changes applied.")
