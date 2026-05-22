

document.addEventListener('DOMContentLoaded', () => {

 
  const nav = document.getElementById('mainNav');

  const handleNavScroll = () => {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();


 
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });


  const fadeCards = document.querySelectorAll('.fade-card');

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 100);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  fadeCards.forEach(card => cardObserver.observe(card));


  
  const reveals = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach(el => revealObserver.observe(el));



  const statNumbers = document.querySelectorAll('.stat-number');

  const animateCount = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const step = 16;
    const increment = target / (duration / step);
    let current = 0;

    const tick = () => {
      current += increment;
      if (current < target) {
        el.textContent = Math.floor(current).toLocaleString();
        requestAnimationFrame(tick);
      } else {
        el.textContent = target.toLocaleString();
      }
    };

    tick();
  };

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => statsObserver.observe(el));



  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -4;
      const rotateY = ((x - cx) / cx) * 4;
      card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.transition = 'transform 0.1s ease, box-shadow 0.3s ease, border-color 0.3s ease';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s ease, box-shadow 0.3s ease, border-color 0.3s ease';
    });
  });



  document.querySelectorAll('.btn-cozy-primary, .btn-cozy-outline').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const circle = document.createElement('span');
      const diameter = Math.max(this.clientWidth, this.clientHeight);
      const rect = this.getBoundingClientRect();

      circle.style.cssText = `
        position: absolute;
        width: ${diameter}px;
        height: ${diameter}px;
        left: ${e.clientX - rect.left - diameter / 2}px;
        top:  ${e.clientY - rect.top  - diameter / 2}px;
        background: rgba(255,255,255,0.25);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.55s linear;
        pointer-events: none;
      `;

     
      if (!document.getElementById('ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = '@keyframes ripple { to { transform: scale(2.8); opacity: 0; } }';
        document.head.appendChild(style);
      }

      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(circle);
      circle.addEventListener('animationend', () => circle.remove());
    });
  });


  const moodBanner = document.querySelector('.mood-banner');
  if (moodBanner) {
    moodBanner.style.opacity = '0';
    moodBanner.style.transition = 'opacity 1s ease';

    const bannerObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        moodBanner.style.opacity = '1';
        bannerObserver.unobserve(moodBanner);
      }
    }, { threshold: 0.4 });

    bannerObserver.observe(moodBanner);
  }


  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.cozy-nav .nav-link').forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

});