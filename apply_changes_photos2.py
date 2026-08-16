import os

def update_index():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update Slider 2
    content = content.replace(
        '<img src="images/photo-creative-support.jpg" alt="職員と利用者が創作活動に取り組む様子" width="800" height="533">',
        '<img src="images/photo-creative-support-water.jpg" alt="職員と利用者が共同で創作活動に取り組む様子" width="800" height="533">'
    )
    
    # Update Gallery to include photo-interaction-support.jpg instead of photo-group-exercise.jpg
    content = content.replace(
        '<img src="images/photo-group-exercise.jpg" alt="椅子に座って集団体操を行う様子" loading="lazy" width="800" height="533">',
        '<img src="images/photo-interaction-support.jpg" alt="職員と利用者が向き合って活動する様子" loading="lazy" width="800" height="533">'
    )
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

def update_about():
    with open('about.html', 'r', encoding='utf-8') as f:
        content = f.read()
        
    content = content.replace(
        '<img src="images/photo-creative-support.jpg" alt="職員と利用者が創作活動に取り組む様子" loading="lazy" width="800" height="533">',
        '<img src="images/photo-interaction-support.jpg" alt="職員と利用者が向き合って活動する様子" loading="lazy" width="800" height="533">'
    )
    
    with open('about.html', 'w', encoding='utf-8') as f:
        f.write(content)

def update_service():
    with open('service.html', 'r', encoding='utf-8') as f:
        content = f.read()
        
    content = content.replace(
        '<img src="images/photo-art-activity.jpg" alt="ペンを使った創作活動に取り組む様子" loading="lazy" width="800" height="533">',
        '<img src="images/photo-creative-support-water.jpg" alt="職員と利用者が共同で創作活動に取り組む様子" loading="lazy" width="800" height="533">'
    )
    
    with open('service.html', 'w', encoding='utf-8') as f:
        f.write(content)

def update_activities():
    with open('activities.html', 'r', encoding='utf-8') as f:
        content = f.read()
        
    old_gallery = """        <div class="gallery-grid">
          <div class="gallery-item">
            <img src="images/photo-creative-support.jpg" alt="職員と利用者が創作活動に取り組む様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-daily-support.jpg" alt="口腔・生活支援の様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-drum-activity.jpg" alt="和太鼓の活動を行う様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-recreation.jpg" alt="ボッチャなどのレクリエーションを行う様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-group-exercise.jpg" alt="椅子に座って集団体操を行う様子" loading="lazy" width="800" height="533">
          </div>
        </div>"""
        
    new_gallery = """        <div class="gallery-grid">
          <div class="gallery-item">
            <img src="images/photo-creative-support-water.jpg" alt="職員と利用者が共同で創作活動に取り組む様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-interaction-support.jpg" alt="職員と利用者が向き合って活動する様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-creative-support.jpg" alt="職員と利用者が創作活動に取り組む様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-art-activity.jpg" alt="ペンを使った創作活動に取り組む様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-daily-support.jpg" alt="口腔・生活支援の様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-drum-activity.jpg" alt="和太鼓の活動を行う様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-recreation.jpg" alt="ボッチャなどのレクリエーションを行う様子" loading="lazy" width="800" height="533">
          </div>
          <div class="gallery-item">
            <img src="images/photo-group-exercise.jpg" alt="椅子に座って集団体操を行う様子" loading="lazy" width="800" height="533">
          </div>
        </div>"""
        
    content = content.replace(old_gallery, new_gallery)
    
    with open('activities.html', 'w', encoding='utf-8') as f:
        f.write(content)

update_index()
update_about()
update_service()
update_activities()
