import os

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()

    # guide.html (and potentially others) lunch fee text
    html = html.replace('その他、昼食代（準備中／要確認）、創作活動材料費等が別途かかります。', 
                        'その他、昼食代（お弁当の注文制・自費）、創作活動材料費等が別途かかります。')

    # service hours
    html = html.replace('9:00〜16:00', '10:00〜16:00')

    # contact.html reception hours
    html = html.replace('受付時間：月〜金 9:00〜17:00', '受付時間：月〜金 8:30〜17:30')
    html = html.replace('<br>（※電話番号は準備中／要確認）', '')
    html = html.replace('<br>\n（※電話番号は準備中／要確認）', '')

    # access.html leftover note
    html = html.replace('<span class="note">（※準備中／要確認）</span>', '')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

print("Replacements done.")
