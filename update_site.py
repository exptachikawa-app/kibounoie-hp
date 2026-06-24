import os
import re

css_path = 'css/style.css'
js_path = 'js/main.js'

with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. CSS Variables
if '--color-main-text' not in css:
    css = css.replace(
        '--color-main: #4bb8e3;',
        '--color-main: #4bb8e3;\n  --color-main-text: #1a759c;\n  --color-main-button: #1a759c;\n  --color-sub-text: #d98505;'
    )

# 2. Text colors
css = re.sub(r'color:\s*var\(--color-main\);', r'color: var(--color-main-text);', css)

# 3. Accessibility Focus & Skip Link
if '.skip-link' not in css:
    access_css = '''
/* ==========================================================================
   Accessibility
   ========================================================================== */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: white;
  padding: 8px;
  z-index: 10000;
  transition: top 0.2s ease;
}
.skip-link:focus {
  top: 0;
}

:focus-visible {
  outline: 3px solid var(--color-sub);
  outline-offset: 2px;
}
'''
    css = css.replace('/* ==========================================================================\n   Reset & Base', access_css + '\n/* ==========================================================================\n   Reset & Base')

# 4. Update .btn to use new button color and minimum sizes
css = css.replace('min-width: 200px;', 'min-width: 200px;\n  min-height: 44px;')
css = css.replace('padding: 16px 32px;', 'padding: 16px 32px;\n  min-height: 44px;')

css = re.sub(r'\.btn-main\s*\{\s*background-color:\s*var\(--color-main\);\s*color:\s*#fff;', 
             r'.btn-main {\n  background-color: var(--color-main-button);\n  color: #fff;', css)

css = css.replace('transition: background-color 0.3s ease, opacity 0.3s ease;', 'transition: all 0.3s ease;')

# 5. Hover effects on buttons & cards
if 'transform: translateY(-2px)' not in css:
    css = re.sub(r'\.btn:hover\s*\{\s*opacity:\s*0\.9;\s*\}', 
                 r'.btn:hover {\n  opacity: 0.9;\n  transform: translateY(-2px);\n  box-shadow: var(--shadow-md);\n}', css)

# Cards already have hover effect: translateY(-5px) and box-shadow.

# 6. Form focus states
if '.contact-form input:focus' not in css:
    css = css.replace('.contact-input {', '.contact-input {\n  transition: all 0.3s ease;\n')
    css = css.replace('.contact-textarea {', '.contact-textarea {\n  transition: all 0.3s ease;\n')
    form_focus = '''
.contact-input:focus, .contact-textarea:focus {
  border-color: var(--color-main-text);
  box-shadow: 0 0 0 4px rgba(26, 117, 156, 0.1);
  outline: none;
}
'''
    css += form_focus

# 7. JS Fade Up animations
if '.js-fade-up' not in css:
    anim_css = '''
/* ==========================================================================
   Animations
   ========================================================================== */
@media (prefers-reduced-motion: no-preference) {
  .js-fade-up {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  }
  .js-fade-up.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
}
'''
    css += anim_css

# Ensure line-height is 1.7
css = css.replace('line-height: 1.6;', 'line-height: 1.7;')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)


# JS updates
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

if 'IntersectionObserver' not in js:
    js_anim = '''
  // スクロールアニメーション
  const fadeElements = document.querySelectorAll('.js-fade-up');
  if (fadeElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -50px 0px' });
    
    fadeElements.forEach(el => observer.observe(el));
  }
'''
    js += js_anim
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)


# HTML updates
html_files = [f for f in os.listdir('.') if f.endswith('.html')]
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # skip link
    if 'class="skip-link"' not in html:
        html = html.replace('<body>', '<body>\n  <a href="#main" class="skip-link">本文へスキップ</a>')
    
    # main id
    if '<main id="main">' not in html:
        html = html.replace('<main>', '<main id="main">')
    
    # add js-fade-up to sections and cards
    html = re.sub(r'<section class="([^"]+)">', lambda m: '<section class="' + m.group(1) + ' js-fade-up">' if 'js-fade-up' not in m.group(1) and 'hero' not in m.group(1) else m.group(0), html)
    html = re.sub(r'<div class="([^"]*feature-card[^"]*)">', lambda m: '<div class="' + m.group(1) + ' js-fade-up">' if 'js-fade-up' not in m.group(1) else m.group(0), html)
    html = re.sub(r'<div class="([^"]*content-box[^"]*)">', lambda m: '<div class="' + m.group(1) + ' js-fade-up">' if 'js-fade-up' not in m.group(1) else m.group(0), html)
    html = re.sub(r'<div class="([^"]*split-layout[^"]*)">', lambda m: '<div class="' + m.group(1) + ' js-fade-up">' if 'js-fade-up' not in m.group(1) else m.group(0), html)
    
    # index hero title
    if file == 'index.html':
        html = html.replace('<h2 class="hero-title">', '<h1 class="hero-title">')
        html = html.replace('</h2>', '</h1>', 1) # Only the first one which is hero-title
    
    # Ensure all inputs and buttons have min 44px (covered by css generally)

    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Done")
