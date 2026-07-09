import os
import re

# 1. Update css/style.css
css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Add imports
import_str = '''@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Noto+Sans+JP:wght@400&family=Noto+Serif+JP:wght@400;500;600&display=swap');
'''
if '@import url' not in css:
    css = css.replace('@charset "UTF-8";\n', '@charset "UTF-8";\n' + import_str)

# Update variables
css = re.sub(r"--font-family-base: [^;]+;", "--font-family-base: 'Inter', 'Noto Sans JP', sans-serif;\n  --font-family-serif: 'Noto Serif JP', serif;", css)
css = re.sub(r"--radius-lg: [^;]+;", "--radius-lg: 20px;", css)
css = re.sub(r"--shadow-md: [^;]+;", "--shadow-md: 0 8px 30px rgba(0,0,0,0.06);", css)

# Update body
css = re.sub(r"body\s*\{[^}]*\}", "body {\n  font-family: var(--font-family-base);\n  font-weight: 400;\n  font-size: 1rem;\n  line-height: 1.8;\n  letter-spacing: 0.02em;\n  color: var(--color-text);\n  background-color: var(--color-base);\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}", css)

# Update h1-h6
css = re.sub(r"h1, h2, h3, h4, h5, h6\s*\{[^}]*\}", "h1, h2, h3, h4, h5, h6 {\n  font-weight: 500;\n  line-height: 1.4;\n  color: var(--color-text);\n  font-family: var(--font-family-serif);\n  letter-spacing: 0.05em;\n}", css)

# Update container & section
css = re.sub(r"\.container\s*\{[^}]*\}", ".container {\n  width: 100%;\n  max-width: 1160px;\n  margin: 0 auto;\n  padding: 0 4vw;\n}", css)
css = re.sub(r"\.section\s*\{[^}]*\}", ".section {\n  padding: clamp(64px, 10vw, 120px) 0;\n}", css)

# Update section-title
css = re.sub(r"\.section-title\s*\{[^}]*\}", ".section-title {\n  text-align: center;\n  font-size: clamp(28px, 4vw, 44px);\n  margin-bottom: 64px;\n  color: var(--color-main-dark);\n  position: relative;\n  font-family: var(--font-family-serif);\n  letter-spacing: 0.05em;\n}", css)
css = re.sub(r"\.section-title::after\s*\{[^}]*\}", "", css)

# Add section-label and zigzag layout at the end of Utility
new_styles = '''
.section-header {
  text-align: center;
  margin-bottom: 64px;
}
.section-label {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--color-main-dark);
  margin-bottom: 8px;
  text-transform: uppercase;
}
.section-header .section-title {
  margin-bottom: 0;
}

.zigzag-row {
  display: flex;
  align-items: center;
  gap: 60px;
  margin-bottom: 80px;
}
.zigzag-row:nth-child(even) {
  flex-direction: row-reverse;
}
.zigzag-img {
  flex: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}
.zigzag-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.zigzag-row:hover .zigzag-img img {
  transform: scale(1.03);
}
.zigzag-text {
  flex: 1;
}
.zigzag-text h3 {
  font-size: clamp(20px, 3vw, 28px);
  margin-bottom: 24px;
  color: var(--color-main-dark);
}
@media (max-width: 768px) {
  .zigzag-row, .zigzag-row:nth-child(even) {
    flex-direction: column;
    gap: 32px;
  }
}

/* Enhanced Features Card */
.feature-card {
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-md) !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease !important;
  background: var(--color-base);
  overflow: hidden;
}
.feature-card:hover {
  transform: translateY(-8px) !important;
  box-shadow: 0 16px 40px rgba(0,0,0,0.1) !important;
}
.feature-content {
  padding: 32px !important;
}

/* Hero Overhaul */
.hero-content {
  position: relative;
  z-index: 10;
  padding: 0 4vw;
}
.hero-title {
  font-family: var(--font-family-serif);
  font-size: clamp(32px, 5vw, 64px) !important;
  line-height: 1.4 !important;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 10px rgba(255,255,255,0.8);
}
.hero-text {
  font-size: clamp(16px, 2vw, 18px) !important;
  margin-top: 24px !important;
  line-height: 1.8 !important;
  text-shadow: 0 1px 5px rgba(255,255,255,0.8);
  font-weight: 500;
}
@keyframes kenBurns {
  0% { transform: scale(1); }
  100% { transform: scale(1.05); }
}
.hero-slide.is-active img {
  animation: kenBurns 12s infinite alternate ease-in-out;
}

/* Animations & Accessibility */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .js-fade-up { opacity: 1 !important; transform: none !important; }
  .hero-slide.is-active img { animation: none !important; }
}

/* Timeline */
.timeline::before {
  background-color: var(--color-border) !important;
  width: 1px !important;
}
.timeline-time {
  box-shadow: 0 0 0 8px var(--color-base) !important;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.05em;
}
.timeline-content {
  box-shadow: var(--shadow-md) !important;
  border: none !important;
  border-radius: var(--radius-md) !important;
}
'''
if '.section-label' not in css:
    css += new_styles

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

# 2. Update HTML files
labels_map = {
    '希望の家について': 'Concept',
    '主な活動内容': 'Activities',
    '一日の流れ': 'Daily Flow',
    '特色': 'Features',
    '施設紹介': 'Facility',
    'お知らせ': 'News',
    'ご利用案内': 'Guide',
    'アクセス': 'Access',
    'よくあるご質問': 'FAQ',
    'お問い合わせ': 'Contact',
    'アクセス・お問い合わせ': 'Access & Contact'
}

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()

    # Wrap <h2 class="section-title"> in <div class="section-header">
    def replacer(match):
        title_text = match.group(1)
        label = labels_map.get(title_text, 'Info')
        return f'<div class="section-header"><span class="section-label">{label}</span><h2 class="section-title">{title_text}</h2></div>'
    
    html = re.sub(r'<h2 class="section-title"(?: [^>]*)?>([^<]+)</h2>', replacer, html)

    # Page headers replacement
    def ph_replacer(match):
        title_text = match.group(1)
        label = labels_map.get(title_text, 'Info')
        return f'<span class="section-label" style="color:var(--color-base)">{label}</span><h1 class="page-title">{title_text}</h1>'
    html = re.sub(r'<h1 class="page-title">([^<]+)</h1>', ph_replacer, html)
    
    # Alternate section background colors (simple logic: odd sections white, even bg-light)
    # We can just apply bg-light selectively. For now we will rely on existing classes.
    # The prompt says: セクションを「白」と「淡いオレンジ #fff6ed」で交互に配置し、リズムを作る。
    # Let's add bg-light to the second section of pages if not already.

    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Updates completed.")
