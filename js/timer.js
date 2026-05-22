document.addEventListener('DOMContentLoaded', () => {


  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });


 
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 120);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


  const MODES = {
    pomodoro : { label: 'Focus Time',   minutes: 25, color: '#d4854a' },
    short    : { label: 'Short Break',  minutes: 5,  color: '#8b6845' },
    long     : { label: 'Long Break',   minutes: 15, color: '#c4a882' },
  };

  let currentMode     = 'pomodoro';
  let totalSeconds    = MODES.pomodoro.minutes * 60;
  let remainingSeconds = totalSeconds;
  let intervalId      = null;
  let isRunning       = false;

  // stats
  let completedSessions = 0;
  let totalMinutesFocused = 0;
  let totalBreaks       = 0;
  let sessionDotIndex   = 0;

  
  const CIRCUMFERENCE = 2 * Math.PI * 96; 


  const timerDisplay  = document.getElementById('timerDisplay');
  const sessionLabel  = document.getElementById('sessionLabel');
  const progressRing  = document.getElementById('progressRing');
  const timerRing     = document.getElementById('timerRing');
  const startBtn      = document.getElementById('startBtn');
  const pauseBtn      = document.getElementById('pauseBtn');
  const resetBtn      = document.getElementById('resetBtn');
  const sessionDots   = document.querySelectorAll('.session-dot');
  const sessionAlert  = document.getElementById('sessionAlert');
  const alertIcon     = document.getElementById('alertIcon');
  const alertTitle    = document.getElementById('alertTitle');
  const alertMsg      = document.getElementById('alertMsg');
  const alertClose    = document.getElementById('alertClose');
  const statSessions  = document.getElementById('statSessions');
  const statMinutes   = document.getElementById('statMinutes');
  const statBreaks    = document.getElementById('statBreaks');



  const setRingColor = (color) => {
    progressRing.style.stroke = color;
  };

  const setRingProgress = (remaining, total) => {
    const fraction = remaining / total;
    const offset   = CIRCUMFERENCE * (1 - fraction);
    progressRing.style.strokeDasharray  = CIRCUMFERENCE;
    progressRing.style.strokeDashoffset = offset;
  };

  const initRing = () => {
    progressRing.style.strokeDasharray  = CIRCUMFERENCE;
    progressRing.style.strokeDashoffset = 0;
    setRingColor(MODES[currentMode].color);
  };


  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateDisplay = () => {
    timerDisplay.textContent = formatTime(remainingSeconds);
    document.title           = `${formatTime(remainingSeconds)} — LofiStudy`;
    setRingProgress(remainingSeconds, totalSeconds);
  };

  const updateSessionDot = () => {
    if (sessionDotIndex < sessionDots.length) {
      sessionDots[sessionDotIndex].classList.add('done');
      sessionDotIndex++;
    }
    if (sessionDotIndex >= sessionDots.length) {
      setTimeout(() => {
        sessionDots.forEach(d => d.classList.remove('done'));
        sessionDotIndex = 0;
      }, 1500);
    }
  };

  const updateStats = () => {
    statSessions.textContent = completedSessions;
    statMinutes.textContent  = totalMinutesFocused;
    statBreaks.textContent   = totalBreaks;
  };


  const setRunningState = (running) => {
    isRunning = running;
    startBtn.disabled = running;
    pauseBtn.disabled = !running;

    startBtn.innerHTML = running
      ? '<i class="bi bi-play-fill"></i> Running…'
      : '<i class="bi bi-play-fill"></i> Start';

    if (running) {
      timerRing.classList.add('running');
    } else {
      timerRing.classList.remove('running');
    }
  };


  const showAlert = (icon, title, msg) => {
    alertIcon.textContent  = icon;
    alertTitle.textContent = title;
    alertMsg.textContent   = msg;
    sessionAlert.classList.add('show');

   
    setTimeout(() => sessionAlert.classList.remove('show'), 6000);
  };

  alertClose.addEventListener('click', () => {
    sessionAlert.classList.remove('show');
  });


  const onSessionComplete = () => {
    clearInterval(intervalId);
    intervalId = null;
    setRunningState(false);

    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    if (currentMode === 'pomodoro') {
      completedSessions++;
      totalMinutesFocused += MODES.pomodoro.minutes;
      updateSessionDot();
      showAlert(
        '🎉',
        'Focus session complete!',
        completedSessions % 4 === 0
          ? 'Amazing — 4 sessions done! Take a long break. 🌿'
          : 'Great work! Time for a short break. ☕'
      );
     
      const nextMode = completedSessions % 4 === 0 ? 'long' : 'short';
      setTimeout(() => switchMode(nextMode), 1000);
    } else {
      totalBreaks++;
      showAlert(
        '✨',
        'Break\'s over!',
        'Ready to focus again? Let\'s get back to it. 🎧'
      );
      setTimeout(() => switchMode('pomodoro'), 1000);
    }

    updateStats();
  };


  
  const tick = () => {
    if (remainingSeconds <= 0) {
      onSessionComplete();
      return;
    }
    remainingSeconds--;
    updateDisplay();
  };


  const switchMode = (mode) => {
    // stop any running timer
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    setRunningState(false);

    currentMode      = mode;
    totalSeconds     = MODES[mode].minutes * 60;
    remainingSeconds = totalSeconds;

    sessionLabel.textContent = MODES[mode].label;
    timerDisplay.textContent = formatTime(remainingSeconds);
    document.title           = `${formatTime(remainingSeconds)} — LofiStudy`;

    initRing();

   
    document.querySelectorAll('.timer-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    
    timerRing.style.transform  = 'scale(0.95)';
    timerRing.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
      timerRing.style.transform = 'scale(1)';
    }, 20);
  };


  startBtn.addEventListener('click', () => {
    if (isRunning) return;
    setRunningState(true);
    intervalId = setInterval(tick, 1000);
  });

  pauseBtn.addEventListener('click', () => {
    if (!isRunning) return;
    clearInterval(intervalId);
    intervalId = null;
    setRunningState(false);
    startBtn.innerHTML = '<i class="bi bi-play-fill"></i> Resume';
    showToast('⏸ Timer paused. Take a breath!');
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(intervalId);
    intervalId       = null;
    remainingSeconds = totalSeconds;
    setRunningState(false);
    startBtn.innerHTML = '<i class="bi bi-play-fill"></i> Start';
    updateDisplay();
    showToast('↺ Timer reset.');
  });


  document.querySelectorAll('.timer-tab').forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });


 
  document.addEventListener('keydown', (e) => {
    // space = start / pause
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      if (isRunning) {
        pauseBtn.click();
      } else {
        startBtn.click();
      }
    }
  
    if (e.code === 'KeyR' && e.target.tagName !== 'INPUT') {
      resetBtn.click();
    }
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
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  };


  [startBtn, pauseBtn, resetBtn].forEach(btn => {
    btn.addEventListener('mousedown', () => {
      if (!btn.disabled) btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('mouseup',   () => { btn.style.transform = ''; });
    btn.addEventListener('mouseleave',() => { btn.style.transform = ''; });
  });


 
  initRing();
  updateDisplay();
  showToast('⏱ Tip: Press Space to start / pause the timer.');

});