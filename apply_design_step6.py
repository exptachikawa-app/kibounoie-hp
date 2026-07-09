import re

css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Update gallery items to have rounded corners
gallery_css = '''
.gallery-item {
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.gallery-item img {
  border-radius: 0; /* Inherits from parent */
  transition: transform 0.5s ease;
}
.gallery-item:hover img {
  transform: scale(1.05);
}
'''
css = re.sub(r"\.gallery-item\s*\{[^}]*\}", ".gallery-item {\n  border-radius: var(--radius-lg);\n  overflow: hidden;\n  box-shadow: var(--shadow-sm);\n}", css)
css = re.sub(r"\.gallery-item img\s*\{[^}]*\}", ".gallery-item img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n  transition: transform 0.5s ease;\n}", css)


# Info table styling improvements
info_table_css = '''
.info-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-base);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.info-table th {
  background-color: var(--color-bg-soft);
  color: var(--color-main-dark);
  font-family: var(--font-family-serif);
  font-weight: 500;
  width: 30%;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
.info-table td {
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}
.info-table tr:last-child th,
.info-table tr:last-child td {
  border-bottom: none;
}
'''
if '.info-table {' not in css:
    css += info_table_css
else:
    css = re.sub(r"\.info-table\s*\{[^}]*\}", ".info-table {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--color-base);\n  box-shadow: var(--shadow-md);\n  border-radius: var(--radius-lg);\n  overflow: hidden;\n  border-style: hidden;\n}", css)
    css = re.sub(r"\.info-table th,\s*\.info-table td\s*\{[^}]*\}", "", css)
    css = re.sub(r"\.info-table th\s*\{[^}]*\}", ".info-table th {\n  background-color: var(--color-bg-soft);\n  color: var(--color-main-dark);\n  font-family: var(--font-family-serif);\n  font-weight: 500;\n  width: 30%;\n  padding: 24px;\n  border-bottom: 1px solid var(--color-border);\n  text-align: left;\n}", css)
    css = re.sub(r"\.info-table td\s*\{[^}]*\}", ".info-table td {\n  padding: 24px;\n  border-bottom: 1px solid var(--color-border);\n}", css)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("Gallery and Table styles updated.")
