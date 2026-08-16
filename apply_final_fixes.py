import re

# Update service.html
with open('service.html', 'r', encoding='utf-8') as f:
    service = f.read()

# Replace image in "創作的活動"
service = service.replace(
    '<img src="images/photo-creative-support-water.jpg" alt="職員と利用者が共同で創作活動に取り組む様子" loading="lazy" width="800" height="533">',
    '<img src="images/photo-interaction-support.jpg" alt="職員と利用者が向き合って活動する様子" loading="lazy" width="800" height="533">'
)

with open('service.html', 'w', encoding='utf-8') as f:
    f.write(service)

# Update access.html
with open('access.html', 'r', encoding='utf-8') as f:
    access = f.read()

old_exterior_html = """        <div class="access-exterior">
          <h3>希望の家 外観</h3>
          <img src="images/photo-facility-exterior.jpg" alt="生活介護 希望の家の建物外観" loading="lazy" class="exterior-img">
          <p>こちらの建物を目印にお越しください。</p>
        </div>"""

new_exterior_html = """        <div class="access-exterior">
          <h3>希望の家 外観・入口</h3>
          <div class="access-photo-grid">
            <figure class="access-photo-item">
              <img src="images/photo-facility-exterior.jpg" alt="生活介護 希望の家の建物外観" loading="lazy">
              <figcaption>希望の家の建物外観</figcaption>
            </figure>
            <figure class="access-photo-item">
              <img src="images/photo-facility-entrance.jpg" alt="生活介護 希望の家の入口" loading="lazy">
              <figcaption>希望の家の入口</figcaption>
            </figure>
          </div>
          <p class="access-exterior-note">こちらの建物を目印にお越しください。</p>
        </div>"""

if old_exterior_html in access:
    access = access.replace(old_exterior_html, new_exterior_html)

with open('access.html', 'w', encoding='utf-8') as f:
    f.write(access)

# Update CSS for access-photo-grid
css_addition = """
.access-exterior-note {
  margin-top: 15px;
}
.access-photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.access-photo-item {
  margin: 0;
}
.access-photo-item img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 16px;
}
.access-photo-item figcaption {
  margin-top: 10px;
  text-align: center;
}
@media (max-width: 767px) {
  .access-photo-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
"""

with open('css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

if '.access-photo-grid' not in css:
    with open('css/style.css', 'a', encoding='utf-8') as f:
        f.write(css_addition)
