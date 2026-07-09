import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()

    # Fix illegible section-label in page-header
    html = html.replace('<span class="section-label" style="color:var(--color-base)">', '<span class="section-label">')

    # Also, for .page-title, apply the serif font
    # Wait, we can just do it in CSS

    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

page_title_css = '''
.page-title {
  font-family: var(--font-family-serif);
  font-size: clamp(32px, 5vw, 48px);
  color: var(--color-main-dark);
  letter-spacing: 0.05em;
  margin-top: 8px;
}
'''
if '.page-title {' not in css:
    css += page_title_css
else:
    css = re.sub(r"\.page-title\s*\{[^}]*\}", page_title_css, css)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("Page headers fixed.")
