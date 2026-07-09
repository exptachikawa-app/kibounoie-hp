import os

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('</div>\n        \n        </div>\n      </div>\n    </section>', '</div>\n      </div>\n    </section>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
