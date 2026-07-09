import os
import re

# 1. Update CSS for Timeline
css_path = 'css/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace('.timeline::before {\n  content: \'\';\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  left: 20px;', 
                  '.timeline::before {\n  content: \'\';\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  left: 27px;')

css = css.replace('.timeline-item {\n  position: relative;\n  padding-left: 60px;', 
                  '.timeline-item {\n  position: relative;\n  padding-left: 80px;')

css = css.replace('.timeline-time {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 42px;\n  height: 42px;', 
                  '.timeline-time {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 56px;\n  height: 56px;')

css = css.replace('font-size: 0.85rem;\n  box-shadow: 0 0 0 4px var(--color-base);\n  z-index: 1;\n}', 
                  'font-size: clamp(0.75rem, 2vw, 0.9rem);\n  box-shadow: 0 0 0 4px var(--color-base);\n  z-index: 1;\n}')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)


# 2. Update HTML
html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()

    # Image fixes in service.html (and any other just in case)
    html = html.replace('images/activity_daily.png', 'images/activity_daily_orange.png')
    html = html.replace('images/activity_creative.png', 'images/activity_creative_orange.png')
    html = html.replace('images/activity_productive.png', 'images/activity_productive_orange.png')
    html = html.replace('images/activity_leisure.png', 'images/activity_leisure_orange.png')

    # Copy changes
    html = html.replace('車椅子でも移動しやすい広々としたバリアフリー設計を採用しています。', '段差の少ない広々とした設計を採用しています。')
    html = html.replace('食事、排泄、更衣など、日常生活を送る上で必要な支援を行います。身体機能の維持・向上を目指したサポートも行います。', '見守りや日常生活上の必要な支援を行います。知的障害のある方が安心・安全に活動できるよう、個別のペースに合わせたサポートを行います。')
    html = html.replace('専用の送迎車でご自宅までお迎えに上がります。車椅子対応車両も完備しています。', '専用の送迎車でご自宅までお迎えに上がります。')
    
    html = html.replace('Q. 車椅子での利用は可能ですか？', 'Q. バリアフリーに対応していますか？')
    html = html.replace('A. はい、可能です。施設内はバリアフリー設計となっており、車椅子対応トイレや特殊浴槽なども完備しておりますので安心してご利用いただけます。', 'A. はい。施設内は段差の少ないバリアフリー設計となっており、多目的トイレなども完備しておりますので、どなたでも安心してご利用いただけます。')
    html = html.replace('A. はい、ございます。あきる野市周辺を中心に行っておりますが、詳細な送迎範囲やルートについてはご相談ください。車椅子対応の車両もご用意しております。', 'A. はい、ございます。あきる野市内を中心に送迎を行っております。詳細な送迎範囲やルートについてはお気軽にご相談ください。')
    html = html.replace('一般就労が難しい、知的または身体に障がいのある方（あきる野市にお住まいの方）', '主に知的障害のある方で、日中活動の場を必要とされている方')
    html = html.replace('一般就労が難しい、知的または身体に障がいのある方', '主に知的障害のある方で、日中活動の場を必要とされている方')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Fixes applied.")
