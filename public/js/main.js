/**
 * HMI CMS - Main JavaScript
 * Frontend interactions and utilities
 */

(function() {
  'use strict';

  // ============================================
  // INITIALIZATION
  // ============================================
  
  document.addEventListener('DOMContentLoaded', function() {
    initNavbar();
    initImageModal();
    initSearchForm();
    initSmoothScroll();
    initBackToTop();
    initLazyLoading();
    initTooltips();
    initFormValidation();
    initGalleryLightbox();
  });

  // ============================================
  // NAVBAR FUNCTIONALITY
  // ============================================
  
  function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Navbar scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', function() {
      const currentScroll = window.pageYOffset;

      // Add shadow on scroll
      if (currentScroll > 10) {
        navbar.classList.add('shadow');
      } else {
        navbar.classList.remove('shadow');
      }

      lastScroll = currentScroll;
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
      const navbarCollapse = document.querySelector('.navbar-collapse');
      const navbarToggler = document.querySelector('.navbar-toggler');
      
      if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        if (!navbar.contains(e.target)) {
          navbarToggler.click();
        }
      }
    });

    // Close mobile menu when clicking menu item
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
          const navbarToggler = document.querySelector('.navbar-toggler');
          navbarToggler.click();
        }
      });
    });
  }

  // ============================================
  // IMAGE MODAL
  // ============================================
  
  function initImageModal() {
    const imageModal = document.getElementById('imageModal');
    if (!imageModal) return;

    imageModal.addEventListener('show.bs.modal', function(event) {
      const button = event.relatedTarget;
      const imageSrc = button.getAttribute('data-image');
      const caption = button.getAttribute('data-caption');
      
      const modalImage = imageModal.querySelector('#modalImage');
      const modalCaption = imageModal.querySelector('#imageCaption');
      
      if (modalImage && imageSrc) {
        modalImage.src = imageSrc;
        modalImage.alt = caption || 'Image';
      }
      
      if (modalCaption) {
        modalCaption.textContent = caption || '';
      }
    });

    // Clear image when modal closes
    imageModal.addEventListener('hidden.bs.modal', function() {
      const modalImage = imageModal.querySelector('#modalImage');
      if (modalImage) {
        modalImage.src = '';
      }
    });
  }

  // ============================================
  // GALLERY LIGHTBOX
  // ============================================
  
  function initGalleryLightbox() {
    const galleryImages = document.querySelectorAll('[data-bs-toggle="modal"][data-image]');
    
    galleryImages.forEach(img => {
      img.style.cursor = 'pointer';
      
      // Add hover effect
      img.addEventListener('mouseenter', function() {
        this.style.opacity = '0.8';
        this.style.transition = 'opacity 0.3s';
      });
      
      img.addEventListener('mouseleave', function() {
        this.style.opacity = '1';
      });
    });
  }

  // ============================================
  // SEARCH FORM
  // ============================================
  
  function initSearchForm() {
    const searchForms = document.querySelectorAll('form[action="/cari"]');
    
    searchForms.forEach(form => {
      form.addEventListener('submit', function(e) {
        const input = form.querySelector('input[name="q"]');
        
        if (input && input.value.trim() === '') {
          e.preventDefault();
          input.focus();
          
          // Show error message
          showAlert('Mohon masukkan kata kunci pencarian', 'warning');
        }
      });
    });
  }

  // ============================================
  // SMOOTH SCROLL
  // ============================================
  
  function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        if (href === '#' || href === '#!') return;
        
        const target = document.querySelector(href);
        
        if (target) {
          e.preventDefault();
          
          const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 80;
          
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // ============================================
  // BACK TO TOP BUTTON
  // ============================================
  
  function initBackToTop() {
    // Create back to top button
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '<i class="bi bi-arrow-up"></i>';
    backToTop.className = 'btn btn-success btn-back-to-top';
    backToTop.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(backToTop);

    // Show/hide button on scroll
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 300) {
        backToTop.classList.add('show');
      } else {
        backToTop.classList.remove('show');
      }
    });

    // Scroll to top on click
    backToTop.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // ============================================
  // LAZY LOADING IMAGES
  // ============================================
  
  function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      images.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
  }

  // ============================================
  // BOOTSTRAP TOOLTIPS
  // ============================================
  
  function initTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  // ============================================
  // FORM VALIDATION
  // ============================================
  
  function initFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    
    forms.forEach(form => {
      form.addEventListener('submit', function(event) {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        
        form.classList.add('was-validated');
      }, false);
    });

    // Contact form specific validation
    const contactForm = document.querySelector('form[action="/kontak"]');
    if (contactForm) {
      contactForm.addEventListener('submit', function(e) {
        const name = contactForm.querySelector('#name');
        const email = contactForm.querySelector('#email');
        const message = contactForm.querySelector('#message');
        
        let isValid = true;
        
        if (name && name.value.trim().length < 3) {
          showAlert('Nama harus minimal 3 karakter', 'warning');
          name.focus();
          isValid = false;
        }
        
        if (email && !isValidEmail(email.value)) {
          showAlert('Format email tidak valid', 'warning');
          email.focus();
          isValid = false;
        }
        
        if (message && message.value.trim().length < 10) {
          showAlert('Pesan harus minimal 10 karakter', 'warning');
          message.focus();
          isValid = false;
        }
        
        if (!isValid) {
          e.preventDefault();
        }
      });
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
      <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      alertDiv.classList.remove('show');
      setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
  }

  // ============================================
  // ANIMATION ON SCROLL
  // ============================================
  
  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1
      });

      animatedElements.forEach(el => observer.observe(el));
    }
  }

  // Initialize animations
  initScrollAnimations();

  // ============================================
  // LOADING INDICATOR
  // ============================================
  
  function showLoading() {
    const loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    loader.style.cssText = 'background: rgba(255,255,255,0.9); z-index: 9999;';
    loader.innerHTML = `
      <div class="spinner-border text-success" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    `;
    document.body.appendChild(loader);
  }

  function hideLoading() {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.remove();
    }
  }

  // ============================================
  // PRINT FUNCTIONALITY
  // ============================================
  
  window.printPage = function() {
    window.print();
  };

  // ============================================
  // SHARE FUNCTIONALITY
  // ============================================
  
  window.shareOnSocialMedia = function(platform, url, title) {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    let shareUrl = '';

    switch(platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedTitle} - ${encodedUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  // ============================================
  // COPY TO CLIPBOARD
  // ============================================
  
  window.copyToClipboard = function(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showAlert('Link berhasil disalin!', 'success');
      }).catch(() => {
        showAlert('Gagal menyalin link', 'danger');
      });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        showAlert('Link berhasil disalin!', 'success');
      } catch (err) {
        showAlert('Gagal menyalin link', 'danger');
      }
      
      document.body.removeChild(textarea);
    }
  };

  // ============================================
  // EXPOSE UTILITIES TO GLOBAL SCOPE
  // ============================================
  
  window.HMI = {
    showLoading,
    hideLoading,
    showAlert,
    isValidEmail,
    shareOnSocialMedia,
    copyToClipboard,
    printPage
  };

})();