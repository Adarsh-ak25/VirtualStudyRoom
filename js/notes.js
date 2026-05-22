

document.addEventListener('DOMContentLoaded', () => {

 
  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });



  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const emptyAddBtn   = document.getElementById('emptyAddBtn');
  const addNoteForm   = document.getElementById('addNoteForm');
  const noteInput     = document.getElementById('noteInput');
  const addNoteBtn    = document.getElementById('addNoteBtn');
  const clearAllBtn   = document.getElementById('clearAllBtn');
  const notesBoard    = document.getElementById('notesBoard');
  const notesEmpty    = document.getElementById('notesEmpty');
  const notesCountBar = document.getElementById('notesCountBar');
  const noteCountEl   = document.getElementById('noteCount');
  const charCount     = document.getElementById('charCount');
  const swatches      = document.querySelectorAll('.color-swatch');


  
  let selectedColor = 'note-yellow';
  let notes         = loadNotes();


 
  function loadNotes() {
    try {
      return JSON.parse(localStorage.getItem('lofistudy_notes')) || [];
    } catch {
      return [];
    }
  }

  function saveNotes() {
    try {
      localStorage.setItem('lofistudy_notes', JSON.stringify(notes));
    } catch {
      
    }
  }


  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      selectedColor = swatch.dataset.color;
    });
  });


 
  noteInput.addEventListener('input', () => {
    const len = noteInput.value.length;
    charCount.textContent = `${len} / 300`;
    charCount.style.color = len > 270 ? 'var(--orange)' : 'var(--text-light)';
  });


 
  const openForm = () => {
    addNoteForm.classList.add('open');
    toggleFormBtn.innerHTML = '<i class="bi bi-x-lg"></i> Cancel';
    noteInput.focus();
  };

  const closeForm = () => {
    addNoteForm.classList.remove('open');
    toggleFormBtn.innerHTML = '<i class="bi bi-plus-lg"></i> New Note';
    noteInput.value = '';
    charCount.textContent = '0 / 300';
    charCount.style.color = 'var(--text-light)';
    // reset colour to yellow
    swatches.forEach(s => s.classList.remove('selected'));
    swatches[0].classList.add('selected');
    selectedColor = 'note-yellow';
  };

  toggleFormBtn.addEventListener('click', () => {
    addNoteForm.classList.contains('open') ? closeForm() : openForm();
  });

  emptyAddBtn.addEventListener('click', openForm);

 
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && addNoteForm.classList.contains('open')) closeForm();
  });


  
  const createNoteObj = (text, color) => ({
    id   : Date.now().toString(),
    text,
    color,
    date : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  });


  const renderNote = (note) => {
    const el = document.createElement('div');
    el.className  = `sticky-note ${note.color}`;
    el.dataset.id = note.id;

    const tilt = ((parseInt(note.id.slice(-3), 10) % 7) - 3) * 0.6;
    el.style.transform = `rotate(${tilt}deg)`;

    el.innerHTML = `
      <textarea
        class="note-text"
        maxlength="300"
        aria-label="Note text"
      >${escapeHtml(note.text)}</textarea>
      <div class="note-footer">
        <span class="note-date">${note.date}</span>
        <button class="delete-note" aria-label="Delete note" data-id="${note.id}">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    `;

    
    const textarea = el.querySelector('.note-text');
    textarea.addEventListener('input', () => {
      const idx = notes.findIndex(n => n.id === note.id);
      if (idx !== -1) {
        notes[idx].text = textarea.value;
        saveNotes();
      }
    });

    el.addEventListener('mouseenter', () => {
      el.style.transform  = 'rotate(0deg) translateY(-4px)';
      el.style.transition = 'transform 0.25s ease, box-shadow 0.25s ease';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform  = `rotate(${tilt}deg)`;
      el.style.transition = 'transform 0.35s ease, box-shadow 0.35s ease';
    });

    return el;
  };


  
  const addNote = () => {
    const text = noteInput.value.trim();
    if (!text) {
      shakeInput();
      return;
    }

    const note = createNoteObj(text, selectedColor);
    notes.unshift(note);
    saveNotes();

    const el = renderNote(note);
    notesBoard.prepend(el);

 
    requestAnimationFrame(() => {
      el.style.opacity   = '0';
      el.style.transform = 'scale(0.7) rotate(-4deg)';
      el.style.transition = 'opacity 0.35s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)';
      requestAnimationFrame(() => {
        const tilt = ((parseInt(note.id.slice(-3), 10) % 7) - 3) * 0.6;
        el.style.opacity   = '1';
        el.style.transform = `rotate(${tilt}deg)`;
      });
    });

    closeForm();
    updateUI();
    showToast('📌 Note pinned!');
  };

  addNoteBtn.addEventListener('click', addNote);

  // also submit on Ctrl/Cmd + Enter
  noteInput.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') addNote();
  });


  
  notesBoard.addEventListener('click', e => {
    const btn = e.target.closest('.delete-note');
    if (!btn) return;

    const id = btn.dataset.id;
    const el = notesBoard.querySelector(`[data-id="${id}"]`);

    if (el) {
      el.classList.add('removing');
      el.addEventListener('animationend', () => {
        el.remove();
        notes = notes.filter(n => n.id !== id);
        saveNotes();
        updateUI();
      }, { once: true });
    }
  });


  clearAllBtn.addEventListener('click', () => {
    if (notes.length === 0) return;

    if (!confirm('Clear all notes? This cannot be undone.')) return;

    const allNotes = notesBoard.querySelectorAll('.sticky-note');
    allNotes.forEach((el, i) => {
      setTimeout(() => el.classList.add('removing'), i * 60);
    });

    const lastDelay = (allNotes.length - 1) * 60 + 350;
    setTimeout(() => {
      notesBoard.innerHTML = '';
      notes = [];
      saveNotes();
      updateUI();
      showToast('🗑 All notes cleared.');
    }, lastDelay);
  });


  
  const updateUI = () => {
    const count = notes.length;

    // toggle empty state
    notesEmpty.style.display    = count === 0 ? 'flex' : 'none';
    notesCountBar.style.display = count === 0 ? 'none' : 'flex';
    noteCountEl.textContent     = `${count} ${count === 1 ? 'note' : 'notes'}`;

    // clear-all button opacity
    clearAllBtn.style.opacity      = count === 0 ? '0.45' : '1';
    clearAllBtn.style.pointerEvents = count === 0 ? 'none' : 'auto';
  };



  const renderAll = () => {
    notesBoard.innerHTML = '';
    notes.forEach((note, i) => {
      const el = renderNote(note);
      // stagger entrance on page load
      el.style.opacity   = '0';
      el.style.transform = 'translateY(20px)';
      notesBoard.appendChild(el);
      setTimeout(() => {
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        const tilt = ((parseInt(note.id.slice(-3), 10) % 7) - 3) * 0.6;
        el.style.opacity   = '1';
        el.style.transform = `rotate(${tilt}deg)`;
      }, i * 80);
    });
    updateUI();
  };

  renderAll();


 
  const shakeInput = () => {
    noteInput.style.transition = 'transform 0.1s ease';
    noteInput.style.transform  = 'translateX(-6px)';
    setTimeout(() => { noteInput.style.transform = 'translateX(6px)';  }, 100);
    setTimeout(() => { noteInput.style.transform = 'translateX(-4px)'; }, 200);
    setTimeout(() => { noteInput.style.transform = 'translateX(0)';    }, 300);
    noteInput.focus();
  };

  const escapeHtml = (str) =>
    str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

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
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
  };


  setTimeout(() => {
    if (notes.length === 0) {
      showToast('📝 Add your first sticky note to get started!');
    } else {
      showToast(`📌 ${notes.length} note${notes.length > 1 ? 's' : ''} loaded from last session.`);
    }
  }, 800);

});