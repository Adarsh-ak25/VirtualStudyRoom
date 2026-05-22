

document.addEventListener('DOMContentLoaded', () => {


  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });


  
  const fadeCards = document.querySelectorAll('.fade-card');

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 90);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  fadeCards.forEach(card => cardObserver.observe(card));


  
  const filterTabs  = document.querySelectorAll('.filter-tab');
  const roomItems   = document.querySelectorAll('.room-item');
  const emptyState  = document.getElementById('emptyState');

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // update active tab
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter;
      let visible = 0;

      roomItems.forEach((item, i) => {
        const match = filter === 'all' || item.dataset.category === filter;

        if (match) {
          item.style.display = '';
          visible++;
          // re-trigger entrance animation
          const card = item.querySelector('.fade-card');
          card.classList.remove('visible');
          setTimeout(() => card.classList.add('visible'), i * 80);
        } else {
          item.style.display = 'none';
        }
      });

      
      emptyState.style.display = visible === 0 ? 'block' : 'none';
    });
  });


  const modal      = document.getElementById('roomModal');
  const modalName  = document.getElementById('modalRoomName');
  const modalIcon  = document.getElementById('modalIcon');
  const modalMsg   = document.getElementById('modalMessage');
  const closeBtn   = document.getElementById('modalClose');

  const roomEmojis = {
    'Candlelight Library': '🕯️',
    'Café Corner':         '☕',
    'The Study Hall':      '📖',
    "Artist's Atelier":    '🎨',
    'Sunrise Session':     '🌅',
    'Rainy Day Room':      '🌧️',
    'Midnight Flow':       '🌙',
    'Science Lab':         '🧪',
    "Writer's Nook":       '✍️',
  };

  const joinMessages = [
    'You\'re in! Get comfortable and start focusing. 🎧',
    'Welcome! Grab a coffee and let\'s get to work. ☕',
    'You\'ve joined the room. Headphones on, let\'s go! 🎵',
    'You\'re in — find your flow and enjoy the vibe. 🌿',
    'Room joined! Take a breath and dive in. 🕯️',
  ];

  const openModal = (roomName) => {
    modalName.textContent = roomName;
    modalIcon.textContent = roomEmojis[roomName] || '🏡';
    modalMsg.textContent  = joinMessages[Math.floor(Math.random() * joinMessages.length)];
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  // attach to every join button
  document.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.room));
  });

  closeBtn.addEventListener('click', closeModal);

  // close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });


  
  const updateCounts = () => {
    document.querySelectorAll('.room-count').forEach(el => {
      const current = parseInt(el.textContent, 10);
      const delta   = Math.floor(Math.random() * 5) - 2; // -2 to +2
      const next    = Math.max(1, current + delta);

      if (next !== current) {
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity    = '0';
        setTimeout(() => {
          el.textContent  = next;
          el.style.opacity = '1';
        }, 400);
      }
    });

   
    const total = Array.from(document.querySelectorAll('.room-count'))
      .reduce((sum, el) => sum + parseInt(el.textContent, 10), 0);
    const totalEl = document.getElementById('totalOnline');
    if (totalEl) totalEl.textContent = total;
  };

  setInterval(updateCounts, 8000);


  
  document.querySelectorAll('.room-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x    = e.clientX - rect.left;
      const y    = e.clientY - rect.top;
      const cx   = rect.width  / 2;
      const cy   = rect.height / 2;
      const rX   = ((y - cy) / cy) * -3;
      const rY   = ((x - cx) / cx) *  3;
      card.style.transform  = `translateY(-5px) rotateX(${rX}deg) rotateY(${rY}deg)`;
      card.style.transition = 'transform 0.1s ease';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform  = '';
      card.style.transition = 'transform 0.4s ease, box-shadow 0.3s ease';
    });
  });


  
  document.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.96)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = '';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });


 
  const showToast = (msg) => {
    let toast = document.querySelector('.cozy-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'cozy-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  };

 
  setTimeout(() => showToast('☕  18 study rooms are open right now!'), 1200);

});