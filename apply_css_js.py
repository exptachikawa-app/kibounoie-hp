css_content = """
/* Lightbox Styles */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lightbox[hidden] {
  display: none;
}
.lightbox-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
}
.lightbox-content-wrapper {
  position: relative;
  z-index: 10000;
  max-width: 95vw;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.lightbox-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
  padding: 5px;
}
.lightbox-img-container {
  display: flex;
  align-items: center;
  position: relative;
}
.lightbox-image {
  display: block;
  max-width: 92vw;
  max-height: 85vh;
  width: auto;
  height: auto;
  object-fit: contain;
  background: transparent;
}
.lightbox-prev, .lightbox-next {
  background: rgba(0,0,0,0.5);
  border: none;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  padding: 10px 15px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10001;
}
.lightbox-prev {
  left: -50px;
}
.lightbox-next {
  right: -50px;
}
@media (max-width: 768px) {
  .lightbox-prev { left: 0; }
  .lightbox-next { right: 0; }
  .lightbox-close { top: -35px; right: 10px; }
  .lightbox-image { max-width: 95vw; max-height: 80vh; }
}
.lightbox-caption {
  color: #fff;
  text-align: center;
  margin-top: 10px;
  font-size: 1rem;
}

/* Lightbox triggers inside gallery-grid */
.gallery-grid .lightbox-trigger {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: block;
  width: 100%;
  height: 100%;
}
.gallery-grid .lightbox-trigger img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.gallery-grid .lightbox-trigger:hover img {
  transform: scale(1.05);
}

/* 4 columns layout for PC */
@media (min-width: 769px) {
  .gallery-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Access Exterior */
.access-exterior {
  margin-top: 40px;
  text-align: center;
}
.access-exterior h3 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #f39800;
}
.exterior-img {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  margin-bottom: 15px;
}
"""

js_content = """
// Lightbox Logic
document.addEventListener('DOMContentLoaded', () => {
  const triggers = document.querySelectorAll('.lightbox-trigger');
  if (triggers.length === 0) return;
  
  const lightbox = document.getElementById('lightbox');
  if(!lightbox) return;

  const overlay = document.getElementById('lightboxOverlay');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const imgElement = document.getElementById('lightboxImg');
  const captionElement = document.getElementById('lightboxCaption');
  
  let currentIndex = 0;
  let lastFocusedElement = null;

  const images = Array.from(triggers).map(trigger => {
    return {
      src: trigger.querySelector('img').src,
      caption: trigger.getAttribute('data-caption')
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
    imgElement.alt = images[currentIndex].caption;
    captionElement.textContent = images[currentIndex].caption;
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
"""

with open('css/style.css', 'a', encoding='utf-8') as f:
    f.write(css_content)
    
with open('js/main.js', 'a', encoding='utf-8') as f:
    f.write(js_content)
