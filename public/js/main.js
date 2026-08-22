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

  // FAQアコーディオンの開閉処理
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  accordionHeaders.forEach(header => {
    const content = header.nextElementSibling;
    if (!content) return;

    const initialOpen = content.classList.contains('is-open');
    header.classList.toggle('is-active', initialOpen);
    header.setAttribute('aria-expanded', String(initialOpen));

    header.addEventListener('click', () => {
      const isOpen = content.classList.toggle('is-open');
      header.classList.toggle('is-active', isOpen);
      header.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // ヒーロースライダー
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  if (slides.length > 0 && dots.length > 0) {
    let currentSlide = 0;
    const totalSlides = slides.length;
    let slideInterval;

    const goToSlide = (index) => {
      slides[currentSlide].classList.remove('is-active');
      dots[currentSlide].classList.remove('is-active');
      currentSlide = (index + totalSlides) % totalSlides;
      slides[currentSlide].classList.add('is-active');
      dots[currentSlide].classList.add('is-active');
    };

    const nextSlide = () => {
      goToSlide(currentSlide + 1);
    };

    const startSlideShow = () => {
      slideInterval = setInterval(nextSlide, 5000);
    };

    const resetSlideShow = () => {
      clearInterval(slideInterval);
      startSlideShow();
    };

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        goToSlide(index);
        resetSlideShow();
      });
    });

    startSlideShow();
  }

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


// Lightbox Logic
document.addEventListener('DOMContentLoaded', () => {
  const triggers = document.querySelectorAll('.lightbox-trigger');
  if (triggers.length === 0) return;
  
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
    imgElement.src = images[currentIndex].src;
    imgElement.alt = images[currentIndex].alt;
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
});

// Contact Form Submission (Fetch API)
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form') || document.getElementById('contactForm');
  if (!form) return;
  const submitBtn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('form-error-message');
  const successMsg = document.getElementById('form-success-message');

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    }
    throw new Error('暗号論的擬似乱数生成器がサポートされていません。');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';

    const formData = new FormData(form);

    try {
      if (!form.dataset.submissionId) {
        form.dataset.submissionId = generateUUID();
      }
      const submissionId = form.dataset.submissionId;

      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        tel: formData.get('tel'),
        category: formData.get('category'),
        message: formData.get('message'),
        consent: formData.get('consent') === 'on',
        'cf-turnstile-response': formData.get('cf-turnstile-response'),
        submissionId: submissionId
      };

      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        form.reset(); // triggers reset event listener to delete dataset.submissionId
        if (typeof turnstile !== 'undefined') turnstile.reset();
        successMsg.style.display = 'block';
        successMsg.focus();
        form.style.display = 'none';
      } else {
        let msg = 'サーバーエラーが発生しました。しばらく経ってから再度お試しください。';
        if (result.code === 'VALIDATION_FAILED') msg = '入力内容に誤りがあります。内容をご確認ください。';
        else if (result.code === 'TURNSTILE_FAILED') msg = 'スパム判定されました。再度チェックを入れてください。';
        else if (result.code === 'IDEMPOTENCY_CONFLICT') msg = '異なる内容で既に送信済みか、競合が発生しました。画面を更新して再度お試しください。';
        showError(msg);
      }
    } catch (err) {
      let msg = '通信エラーが発生しました。ネットワーク接続をご確認の上、再度お試しください。';
      if (err && err.message && err.message.includes('暗号論的擬似乱数生成器')) {
        msg = err.message + '最新のブラウザをご利用ください。';
      }
      showError(msg);
    }

    function showError(msg) {
      errorMsg.textContent = msg;
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = '送信する';
      if (typeof turnstile !== 'undefined') {
        turnstile.reset();
      }
    }
  });

  // On explicit or programmatic form reset, clear submissionId
  form.addEventListener('reset', () => {
    delete form.dataset.submissionId;
  });
});
