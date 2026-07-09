import re

css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Update buttons to be more premium
# Find .btn class or similar. Usually it's:
btn_styles = '''
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16px 40px;
  border-radius: 40px;
  background-color: var(--color-main-dark);
  color: var(--color-base);
  font-weight: 500;
  letter-spacing: 0.05em;
  transition: transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;
  box-shadow: var(--shadow-sm);
  border: none;
}
.btn:hover {
  background-color: #a64b00;
  color: var(--color-base);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  opacity: 1;
}
.btn-outline {
  background-color: transparent;
  border: 1px solid var(--color-main-dark);
  color: var(--color-main-dark);
}
.btn-outline:hover {
  background-color: var(--color-main-dark);
  color: var(--color-base);
}
.btn-lg {
  padding: 20px 48px;
  font-size: 1.125rem;
}
'''

# We will just append this and !important override the old .btn class to ensure it works
css += btn_styles

# Update background color of CTA section
# Original: .cta { background-color: #fff9f0; } -> make it bg-soft
css = re.sub(r"\.cta\s*\{[^}]*\}", ".cta {\n  background-color: var(--color-bg-soft);\n  padding: 100px 0;\n}", css)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("Button styles updated.")
