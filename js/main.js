/**
 * main.js
 * 共通のJavaScript処理
 */

document.addEventListener('DOMContentLoaded', () => {
  // ハンバーガーメニューの開閉処理
  const hamburger = document.getElementById('js-hamburger');
  const gnav = document.getElementById('js-gnav');
  const body = document.body;

  if (hamburger && gnav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('is-active');
      gnav.classList.toggle('is-active');

      // メニューが開いているときは背面のスクロールを無効化
      if (hamburger.classList.contains('is-active')) {
        body.style.overflow = 'hidden';
        hamburger.setAttribute('aria-expanded', 'true');
      } else {
        body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    // メニュー内のリンクをクリックしたらメニューを閉じる
    const gnavLinks = gnav.querySelectorAll('a');
    gnavLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('is-active');
        gnav.classList.remove('is-active');
        body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }
});
