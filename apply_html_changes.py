import os
import re

favicon_tags = """  <link rel="icon" href="favicon.ico?v=2" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="images/favicon-32x32.png?v=2">
  <link rel="icon" type="image/png" sizes="16x16" href="images/favicon-16x16.png?v=2">
  <link rel="apple-touch-icon" sizes="180x180" href="images/apple-touch-icon.png?v=2">
"""

html_files = [
    'index.html', 'about.html', 'service.html', 'facility.html',
    'guide.html', 'activities.html', 'faq.html', 'access.html',
    'contact.html', 'privacy.html'
]

# 1. Add Favicons to all HTMLs
for html_file in html_files:
    if os.path.exists(html_file):
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'favicon.ico' not in content:
            # Insert before </head>
            content = content.replace('</head>', favicon_tags + '</head>')
            
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)

# 2. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    idx = f.read()

# Update Gallery Title
idx = idx.replace(
    '<div class="section-header"><span class="section-label">Gallery</span><h2 class="section-title">活動の様子</h2></div>',
    '<div class="section-header"><span class="section-label">INFO</span><h2 class="section-title">日々の様子</h2></div>'
)

# New 4 images block with buttons for lightbox
old_gallery_block = re.search(r'<div class="gallery-grid">.*?</div>\s*<div class="btn-wrap">', idx, flags=re.DOTALL)
if old_gallery_block:
    new_gallery = """<div class="gallery-grid">
          <button type="button" class="gallery-item lightbox-trigger" aria-label="職員と利用者が向き合って活動する様子を拡大表示" data-lightbox-index="0" data-caption="職員と利用者が向き合って活動する様子">
            <img src="images/photo-interaction-support.jpg" alt="職員と利用者が向き合って活動する様子" loading="lazy">
          </button>
          <button type="button" class="gallery-item lightbox-trigger" aria-label="職員と利用者が創作活動に取り組む様子を拡大表示" data-lightbox-index="1" data-caption="職員と利用者が創作活動に取り組む様子">
            <img src="images/photo-creative-support-water.jpg" alt="職員と利用者が共同で創作活動に取り組む様子" loading="lazy">
          </button>
          <button type="button" class="gallery-item lightbox-trigger" aria-label="和太鼓の活動を拡大表示" data-lightbox-index="2" data-caption="和太鼓の活動">
            <img src="images/photo-drum-activity.jpg" alt="和太鼓の活動を行う様子" loading="lazy">
          </button>
          <button type="button" class="gallery-item lightbox-trigger" aria-label="集団体操の様子を拡大表示" data-lightbox-index="3" data-caption="集団体操の様子">
            <img src="images/photo-group-exercise.jpg" alt="椅子に座って集団体操を行う様子" loading="lazy">
          </button>
        </div>
        <div class="btn-wrap">"""
    idx = idx.replace(old_gallery_block.group(0), new_gallery)

# Add lightbox HTML to the end of index.html
lightbox_html = """
    <!-- Lightbox Modal -->
    <div id="lightbox" class="lightbox" role="dialog" aria-modal="true" aria-label="活動写真の拡大表示" hidden>
      <div class="lightbox-overlay" id="lightboxOverlay"></div>
      <div class="lightbox-content-wrapper">
        <button type="button" class="lightbox-close" id="lightboxClose" aria-label="閉じる">×</button>
        <div class="lightbox-img-container">
          <button type="button" class="lightbox-prev" id="lightboxPrev" aria-label="前の画像">‹</button>
          <figure>
            <img id="lightboxImg" class="lightbox-image" src="" alt="">
            <figcaption id="lightboxCaption" class="lightbox-caption"></figcaption>
          </figure>
          <button type="button" class="lightbox-next" id="lightboxNext" aria-label="次の画像">›</button>
        </div>
      </div>
    </div>
"""

if 'id="lightbox"' not in idx:
    idx = idx.replace('</body>', lightbox_html + '\n</body>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(idx)

# 3. Update access.html
with open('access.html', 'r', encoding='utf-8') as f:
    acc = f.read()

# Add exterior photo after access-map block
exterior_html = """
        <div class="access-exterior">
          <h3>希望の家 外観</h3>
          <img src="images/photo-facility-exterior.jpg" alt="生活介護 希望の家の建物外観" loading="lazy" class="exterior-img">
          <p>こちらの建物を目印にお越しください。</p>
        </div>
"""
if '希望の家 外観' not in acc:
    acc = acc.replace('</div>\n      </div>\n    </section>', '</div>\n' + exterior_html + '      </div>\n    </section>')

with open('access.html', 'w', encoding='utf-8') as f:
    f.write(acc)

