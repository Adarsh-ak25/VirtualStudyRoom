

document.addEventListener('DOMContentLoaded', () => {

 
  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });


  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 100);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));



  const valueObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity   = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 130);
        valueObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.value-card').forEach(card => {
    card.style.opacity    = '0';
    card.style.transform  = 'translateY(28px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    valueObserver.observe(card);
  });



  const teamObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity   = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 110);
        teamObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.team-card').forEach(card => {
    card.style.opacity    = '0';
    card.style.transform  = 'translateY(24px)';
    card.style.transition = 'opacity 0.55s ease, transform 0.55s ease, box-shadow 0.3s ease';
    teamObserver.observe(card);
  });



  const stripObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      document.querySelectorAll('.strip-item').forEach((item, i) => {
        setTimeout(() => {
          item.style.opacity   = '1';
          item.style.transform = 'translateY(0)';
        }, i * 90);
      });
      stripObserver.disconnect();
    }
  }, { threshold: 0.3 });

  const strip = document.querySelector('.about-strip');
  if (strip) {
    document.querySelectorAll('.strip-item').forEach(item => {
      item.style.opacity    = '0';
      item.style.transform  = 'translateY(12px)';
      item.style.transition = 'opacity 0.5s ease, transform 0.5s ease, color 0.3s ease';
    });
    stripObserver.observe(strip);
  }


  
  const visualCard = document.querySelector('.about-visual-card');
  if (visualCard) {
    const vizObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        visualCard.style.opacity   = '1';
        visualCard.style.transform = 'translateY(0) rotate(0deg)';
        vizObserver.disconnect();
      }
    }, { threshold: 0.2 });

    visualCard.style.opacity    = '0';
    visualCard.style.transform  = 'translateY(20px) rotate(-1deg)';
    visualCard.style.transition = 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34,1.56,0.64,1)';
    vizObserver.observe(visualCard);
  }



  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80; // navbar height
        const top    = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  
  const sendBtn        = document.getElementById('sendMsgBtn');
  const contactForm    = document.getElementById('contactForm');
  const contactSuccess = document.getElementById('contactSuccess');

  const getField = id => document.getElementById(id);

  const shakeField = (el) => {
    el.style.transition = 'transform 0.1s ease, border-color 0.3s ease';
    el.style.borderColor = 'var(--orange)';
    el.style.transform   = 'translateX(-5px)';
    setTimeout(() => { el.style.transform = 'translateX(5px)';  }, 100);
    setTimeout(() => { el.style.transform = 'translateX(-3px)'; }, 200);
    setTimeout(() => {
      el.style.transform   = 'translateX(0)';
      el.style.borderColor = '';
    }, 300);
  };

  const isValidEmail = email =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const name    = getField('contactName');
      const email   = getField('contactEmail');
      const subject = getField('contactSubject');
      const message = getField('contactMessage');

      let valid = true;

      [name, subject, message].forEach(field => {
        if (!field.value.trim()) {
          shakeField(field);
          valid = false;
        }
      });

      if (!email.value.trim() || !isValidEmail(email.value)) {
        shakeField(email);
        valid = false;
      }

      if (!valid) {
        showToast('✏️ Please fill in all fields correctly.');
        return;
      }

     
      sendBtn.disabled     = true;
      sendBtn.innerHTML    = '<i class="bi bi-hourglass-split"></i> Sending…';
      sendBtn.style.opacity = '0.75';

     
      setTimeout(() => {
        contactForm.style.transition = 'opacity 0.4s ease';
        contactForm.style.opacity    = '0';

        setTimeout(() => {
          contactForm.style.display    = 'none';
          contactSuccess.style.display = 'block';

       
          contactSuccess.style.opacity   = '0';
          contactSuccess.style.transform = 'translateY(12px)';
          contactSuccess.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          requestAnimationFrame(() => {
            contactSuccess.style.opacity   = '1';
            contactSuccess.style.transform = 'translateY(0)';
          });

          showToast('📬 Message sent — thank you!');
        }, 400);
      }, 1200);
    });
  }



  document.querySelectorAll('.cozy-input').forEach(input => {
    input.addEventListener('focus', () => {
      input.style.transform = 'scale(1.005)';
    });
    input.addEventListener('blur', () => {
      input.style.transform = '';
    });
  });


  document.querySelectorAll('.team-card').forEach(card => {
    const avatar = card.querySelector('.team-avatar');
    card.addEventListener('mouseenter', () => {
      if (!avatar) return;
      avatar.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
      avatar.style.transform  = 'scale(1.2) rotate(-6deg)';
    });
    card.addEventListener('mouseleave', () => {
      if (!avatar) return;
      avatar.style.transform = 'scale(1) rotate(0deg)';
    });
  });


  const badgeRow = document.querySelector('.about-badge-row');
  if (badgeRow) {
    const badgeObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        badgeRow.querySelectorAll('.about-badge').forEach((badge, i) => {
          badge.style.opacity    = '0';
          badge.style.transform  = 'translateY(10px)';
          badge.style.transition = `opacity 0.4s ease ${i * 120}ms, transform 0.4s ease ${i * 120}ms`;
          requestAnimationFrame(() => {
            badge.style.opacity   = '1';
            badge.style.transform = 'translateY(0)';
          });
        });
        badgeObserver.disconnect();
      }
    }, { threshold: 0.3 });

    badgeRow.querySelectorAll('.about-badge').forEach(b => { b.style.opacity = '0'; });
    badgeObserver.observe(badgeRow);
  }



  const cta = document.querySelector('.about-cta');
  if (cta) {
    window.addEventListener('scroll', () => {
      const rect   = cta.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        const progress = 1 - rect.top / window.innerHeight;
        cta.style.backgroundPositionY = `${progress * 20}px`;
      }
    }, { passive: true });
  }



  const showToast = (msg) => {
    let toast = document.querySelector('.cozy-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'cozy-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
  };


  setTimeout(() => showToast('👋 Welcome to the LofiStudy team page!'), 900);

});