import re

css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Fix btn-contact text color
css = re.sub(r'(\.btn-contact\s*\{\s*background-color:\s*var\(--color-sub\);\s*)color:\s*var\(--color-base\);', 
             r'\g<1>color: var(--color-text);', css)
css = re.sub(r'(\.btn-contact:hover\s*\{\s*background-color:\s*#e0961d;\s*)color:\s*var\(--color-base\);', 
             r'\g<1>color: var(--color-text);', css)

# Fix cta-title and step-num
css = css.replace('.cta-title {\n  font-size: 2rem;\n  color: var(--color-sub);', '.cta-title {\n  font-size: 2rem;\n  color: var(--color-sub-text);')
css = css.replace('.step-num {\n  font-size: 1.25rem;\n  font-weight: 700;\n  color: var(--color-sub);', '.step-num {\n  font-size: 1.25rem;\n  font-weight: 700;\n  color: var(--color-sub-text);')

# Fix btn-hero
css = css.replace('.btn-hero {\n  background-color: var(--color-main-text);', '.btn-hero {\n  background-color: var(--color-main-button);')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("Fixed sub colors")
