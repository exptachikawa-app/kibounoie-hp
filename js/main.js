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

  // FAQアコーディオンの開閉処理
  const accordionHeaders = document.querySelectorAll('.accordion-header, .faq-q');
  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('is-active');
      
      const isExpanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', !isExpanded);
      
      const content = header.nextElementSibling;
      if (content) {
        if (content.classList.contains('is-open')) {
          content.classList.remove('is-open');
        } else {
          content.classList.add('is-open');
        }
      }
    });
  });

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
    }, { rootMargin: '0px 0px -10% 0px' });
    fadeElements.forEach(el => observer.observe(el));
  }

  // Lightbox Logic
  const triggers = document.querySelectorAll('.lightbox-trigger');
  if (triggers.length > 0) {
    // Generate Lightbox HTML if it doesn't exist
    let lightbox = document.getElementById('lightbox');
    if (!lightbox) {
      const lightboxHtml = `
        <div id="lightbox" class="lightbox" role="dialog" aria-modal="true" aria-label="活動写真の拡大表示" hidden>
          <div class="lightbox-overlay" id="lightboxOverlay"></div>
          <div class="lightbox-content-wrapper">
            <button type="button" class="lightbox-close" id="lightboxClose" aria-label="閉じる">×</button>
            <div class="lightbox-img-container">
              <button type="button" class="lightbox-prev" id="lightboxPrev" aria-label="前の画像">‹</button>
              <img id="lightboxImg" class="lightbox-image" src="" alt="">
              <button type="button" class="lightbox-next" id="lightboxNext" aria-label="次の画像">›</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', lightboxHtml);
      lightbox = document.getElementById('lightbox');
    }

    const overlay = document.getElementById('lightboxOverlay');
    const closeBtn = document.getElementById('lightboxClose');
    const prevBtn = document.getElementById('lightboxPrev');
    const nextBtn = document.getElementById('lightboxNext');
    const imgElement = document.getElementById('lightboxImg');
    
    let currentIndex = 0;
    let lastFocusedElement = null;

    const images = Array.from(triggers).map(trigger => {
      const thumbnail = trigger.querySelector('img');
      return {
        src: thumbnail.src,
        alt: thumbnail.alt
      };
    });

    const openLightbox = (index) => {
      currentIndex = index;
      updateLightbox();
      lightbox.removeAttribute('hidden');
      document.body.style.overflow = 'hidden'; // Stop background scroll
      lastFocusedElement = document.activeElement;
      closeBtn.focus();
    };

    const closeLightbox = () => {
      lightbox.setAttribute('hidden', '');
      document.body.style.overflow = '';
      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }
    };

    const updateLightbox = () => {
      imgElement.style.opacity = 0;
      setTimeout(() => {
        imgElement.src = images[currentIndex].src;
        imgElement.alt = images[currentIndex].alt;
        imgElement.onload = () => {
          imgElement.style.opacity = 1;
        };
      }, 150);
    };

    const showNext = () => {
      currentIndex = (currentIndex + 1) % images.length;
      updateLightbox();
    };

    const showPrev = () => {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      updateLightbox();
    };

    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', () => {
        openLightbox(index);
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    document.addEventListener('keydown', (e) => {
      if (lightbox.hasAttribute('hidden')) return;
      
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        showNext();
      } else if (e.key === 'ArrowLeft') {
        showPrev();
      } else if (e.key === 'Tab') {
        // Keep focus within lightbox (simple trap)
        const focusable = [closeBtn, prevBtn, nextBtn];
        const first = focusable[0];
        const last = focusable[2];
        
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });
  }
});
