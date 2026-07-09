import re

css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Fix .bg-light
css = re.sub(r"\.bg-light\s*\{\s*background-color:\s*var\(--color-bg-light\);\s*\}", ".bg-light {\n  background-color: var(--color-bg-soft);\n}", css)

# Make sure page-header background is bg-soft
css = re.sub(r"\.page-header\s*\{[^}]*\}", ".page-header {\n  padding: 120px 0 60px;\n  background-color: var(--color-bg-soft);\n  text-align: center;\n}", css)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS bg-light fixed.")
