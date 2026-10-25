/**
 * DOOM'S DECRYPTION: STRIKE & DECIPHER
 * CLIENT CONTROLLER // DJS SIGAI // AVENGERS: DOOMSDAY
 */

(() => {
  // --- Audio Synthesis (Zero external dependencies) ---
  class SoundFX {
    constructor() {
      this.enabled = true;
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }

    playClick() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }

    playStrike() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    }

    playTick() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    }

    playVictory() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major chord arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.5);
      });
    }
  }

  // --- Background Particle Canvas ---
  function initParticles() {
    const canvas = document.getElementById('bgParticles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(Math.floor(width / 35), 45);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        vy: -(Math.random() * 0.5 + 0.2),
        vx: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.6 + 0.2
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
        ctx.fill();

        p.y += p.vy;
        p.x += p.vx;

        if (p.y < 0) {
          p.y = height + 5;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  // --- State ---
  const sfx = new SoundFX();
  let currentTeam = null;
  let activeCellsData = {};
  let userAnswers = {}; // key: 'r,c' => chosen surviving letter
  let totalActive = 59;
  let timeLimitSeconds = 10 * 60; // 10 MINUTES
  let timeRemaining = timeLimitSeconds;
  let timerInterval = null;
  let isTimerStarted = false;
  let isSubmitted = false;

  // DOM Elements
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const viewRulesBtn = document.getElementById('viewRulesBtn');
  const loginModal = document.getElementById('loginModal');
  const rulesModal = document.getElementById('rulesModal');
  const resultModal = document.getElementById('resultModal');
  const teamLoginForm = document.getElementById('teamLoginForm');
  const teamNameInput = document.getElementById('teamNameInput');
  const membersInput = document.getElementById('membersInput');
  const activeTeamName = document.getElementById('activeTeamName');
  const changeTeamBtn = document.getElementById('changeTeamBtn');
  const timerDisplay = document.getElementById('timerDisplay');
  const timerProgress = document.getElementById('timerProgress');
  const struckCountEl = document.getElementById('struckCount');
  const decipherProgress = document.getElementById('decipherProgress');
  const submitBtn = document.getElementById('submitBtn');
  const puzzleGrid = document.getElementById('puzzleGrid');
  const termLog = document.getElementById('termLog');
  const closeResultModalBtn = document.getElementById('closeResultModalBtn');
  const rulesConfirmCheckbox = document.getElementById('rulesConfirmCheckbox');
  const startTimerBtn = document.getElementById('startTimerBtn');

  // Terminal logging utility
  function logTerminal(msg, type = 'info') {
    if (!termLog) return;
    const p = document.createElement('p');
    if (type === 'success') p.className = 'term-success';
    if (type === 'warn') p.className = 'term-warn';
    p.textContent = `> ${msg}`;
    termLog.appendChild(p);
    termLog.scrollTop = termLog.scrollHeight;
  }

  // Sound Toggle
  soundToggleBtn.addEventListener('click', () => {
    const on = sfx.toggle();
    soundIcon.textContent = on ? '🔊' : '🔇';
    soundToggleBtn.querySelector('.btn-label').textContent = on ? 'FX: ON' : 'FX: OFF';
    sfx.playClick();
  });

  // View Rules Button in Header (Allows reviewing rules during the game)
  viewRulesBtn.addEventListener('click', () => {
    if (isTimerStarted) {
      rulesConfirmCheckbox.checked = true;
      startTimerBtn.disabled = false;
      startTimerBtn.querySelector('span').textContent = 'RESUME DECRYPTION MATRIX';
    } else {
      rulesConfirmCheckbox.checked = false;
      startTimerBtn.disabled = true;
      startTimerBtn.querySelector('span').textContent = '⚡ OK — ENGAGE 10-MINUTE TIMER';
    }
    rulesModal.classList.add('show');
    sfx.playClick();
  });

  // Switch / Change Team
  changeTeamBtn.addEventListener('click', () => {
    if (isSubmitted) {
      alert('This unit has already transmitted their decryption.');
      return;
    }
    loginModal.classList.add('show');
    sfx.playClick();
  });

  // Checkbox toggle in Rules Modal
  rulesConfirmCheckbox.addEventListener('change', () => {
    startTimerBtn.disabled = !rulesConfirmCheckbox.checked;
    sfx.playClick();
  });

  // Start 10-Minute Timer Button in Rules Modal
  startTimerBtn.addEventListener('click', () => {
    rulesModal.classList.remove('show');
    sfx.playClick();

    if (!isTimerStarted && !isSubmitted) {
      startTimer();
      logTerminal('10-Minute Countdown Matrix ENGAGED.', 'warn');
    }
  });

  // Fetch Puzzle Definitions from Backend
  async function loadPuzzleData() {
    try {
      const res = await fetch('/api/puzzle');
      const data = await res.json();
      if (data.success) {
        activeCellsData = data.activeCells;
        totalActive = data.totalActive || 59;
        timeLimitSeconds = data.timeLimitSeconds || 600;
        timeRemaining = timeLimitSeconds;

        renderGrid();
        updateTimerDisplay();
        logTerminal(`Matrix loaded: 100 sectors initialized (${totalActive} active)`);
      }
    } catch (err) {
      console.error('Failed to load puzzle data:', err);
      logTerminal('Error connecting to mainframe puzzle server.', 'warn');
    }
  }

  // Render 10x10 Crossword Grid
  function renderGrid() {
    puzzleGrid.innerHTML = '';

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const key = `${r},${c}`;
        const cellEl = document.createElement('div');
        cellEl.className = 'puzzle-cell';
        cellEl.dataset.coord = key;

        if (activeCellsData[key]) {
          const { tl, br } = activeCellsData[key];
          cellEl.classList.add('active-cell');

          // Diagonal slash line (bottom-left to top-right)
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', 'cell-slash');
          svg.setAttribute('viewBox', '0 0 100 100');
          svg.setAttribute('preserveAspectRatio', 'none');
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', '0');
          line.setAttribute('y1', '100');
          line.setAttribute('x2', '100');
          line.setAttribute('y2', '0');
          svg.appendChild(line);
          cellEl.appendChild(svg);

          // Top-Left letter half
          const tlEl = document.createElement('div');
          tlEl.className = 'letter-half half-tl';
          tlEl.textContent = tl;
          tlEl.dataset.letter = tl;
          tlEl.dataset.pos = 'tl';

          // Bottom-Right letter half
          const brEl = document.createElement('div');
          brEl.className = 'letter-half half-br';
          brEl.textContent = br;
          brEl.dataset.letter = br;
          brEl.dataset.pos = 'br';

          // Event handlers for letters
          tlEl.addEventListener('click', (e) => {
            e.stopPropagation();
            onLetterClick(key, tl, 'tl', br, 'br', cellEl, tlEl, brEl);
          });

          brEl.addEventListener('click', (e) => {
            e.stopPropagation();
            onLetterClick(key, br, 'br', tl, 'tl', cellEl, brEl, tlEl);
          });

          cellEl.appendChild(tlEl);
          cellEl.appendChild(brEl);

          // Restore selection if existing in userAnswers
          if (userAnswers[key]) {
            const chosen = userAnswers[key];
            if (chosen === tl) {
              applySelection(cellEl, tlEl, brEl);
            } else if (chosen === br) {
              applySelection(cellEl, brEl, tlEl);
            }
          }
        } else {
          // Inactive void cell
          cellEl.classList.add('inactive-cell');
        }

        puzzleGrid.appendChild(cellEl);
      }
    }

    updateProgress();
  }

  // Handle letter click / striking
  function onLetterClick(coord, selectedLetter, selectedPos, otherLetter, otherPos, cellEl, selectedEl, otherEl) {
    if (isSubmitted) return;

    if (!currentTeam) {
      loginModal.classList.add('show');
      return;
    }

    if (!isTimerStarted) {
      // Require reviewing rules first!
      rulesModal.classList.add('show');
      return;
    }

    // Toggle: if clicked the already selected letter, unstrike
    if (userAnswers[coord] === selectedLetter) {
      delete userAnswers[coord];
      selectedEl.classList.remove('selected');
      otherEl.classList.remove('struck');
      cellEl.classList.remove('deciphered');
      sfx.playClick();
      logTerminal(`Sector [${coord}]: Selection cleared`);
    } else {
      // Choose selectedLetter as survivor, strike out otherLetter
      userAnswers[coord] = selectedLetter;
      applySelection(cellEl, selectedEl, otherEl);
      sfx.playStrike();
      logTerminal(`Sector [${coord}]: Struck '${otherLetter}', preserved '${selectedLetter}'`);
    }

    saveState();
    updateProgress();
  }

  function applySelection(cellEl, survivorEl, struckEl) {
    cellEl.classList.add('deciphered');
    survivorEl.classList.add('selected');
    survivorEl.classList.remove('struck');
    struckEl.classList.add('struck');
    struckEl.classList.remove('selected');
  }

  // Update progress HUD & submit button state
  function updateProgress() {
    const answeredCount = Object.keys(userAnswers).length;
    struckCountEl.textContent = answeredCount;
    const pct = Math.round((answeredCount / totalActive) * 100);
    decipherProgress.style.width = `${pct}%`;

    // Enable submit button once team is logged in and at least some cells are answered
    submitBtn.disabled = !currentTeam || isSubmitted || answeredCount === 0;
  }

  // Timer Implementation (10 Minutes)
  function startTimer() {
    if (isTimerStarted || isSubmitted) return;
    isTimerStarted = true;

    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay();

      if (timeRemaining <= 120 && timeRemaining > 0) {
        timerDisplay.classList.add('timer-warning');
        if (timeRemaining % 10 === 0) sfx.playTick();
      }

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        timeRemaining = 0;
        updateTimerDisplay();
        logTerminal('CRITICAL: 10-MINUTE TIME EXPIRED! Transmitting matrix...', 'warn');
        submitAnswers(true);
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const progressPct = (timeRemaining / timeLimitSeconds) * 100;
    timerProgress.style.width = `${progressPct}%`;
  }

  // Save / Load Local State
  function saveState() {
    if (!currentTeam) return;
    const payload = {
      team: currentTeam,
      answers: userAnswers,
      timeRemaining: timeRemaining,
      isTimerStarted: isTimerStarted
    };
    localStorage.setItem(`doom_session_${currentTeam.id}`, JSON.stringify(payload));
  }

  function restoreState(team) {
    const saved = localStorage.getItem(`doom_session_${team.id}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        userAnswers = data.answers || {};
        if (data.timeRemaining && data.timeRemaining > 0) {
          timeRemaining = data.timeRemaining;
        }
        renderGrid();
        updateTimerDisplay();

        if (data.isTimerStarted && !isSubmitted) {
          startTimer();
        }
        logTerminal(`Restored active session for ${team.team_name}`);
      } catch (e) {
        console.error(e);
      }
    }
  }

  // Team Login Handler: Step 1 (Register) -> Step 2 (Show Rules & Wait for OK)
  teamLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teamName = teamNameInput.value.trim();
    const members = membersInput.value.trim();

    if (!teamName) return;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName, members })
      });
      const data = await res.json();

      if (data.success) {
        currentTeam = data.team;
        activeTeamName.textContent = currentTeam.team_name.toUpperCase();
        loginModal.classList.remove('show');
        sfx.playClick();

        if (data.alreadySubmitted) {
          isSubmitted = true;
          logTerminal(`Unit ${currentTeam.team_name} has already submitted results.`, 'warn');
          showResultsModal({
            score: data.submission.score,
            errorCount: data.submission.error_count,
            correctCount: data.submission.correct_count,
            timeTakenSeconds: data.submission.time_taken_seconds
          });
        } else {
          // Check if session was already active
          const saved = localStorage.getItem(`doom_session_${currentTeam.id}`);
          if (saved) {
            restoreState(currentTeam);
            if (!isTimerStarted) {
              rulesModal.classList.add('show');
            }
          } else {
            // New team: Show Rules Modal first!
            rulesConfirmCheckbox.checked = false;
            startTimerBtn.disabled = true;
            rulesModal.classList.add('show');
            logTerminal(`Unit authenticated: ${currentTeam.team_name}. Reviewing rules...`);
          }
        }
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting to Doom server.');
    }
  });

  // Submit Game Answers
  submitBtn.addEventListener('click', () => {
    if (confirm('Transmit final decryption matrix to Doctor Doom? Your submission cannot be altered.')) {
      submitAnswers(false);
    }
  });

  async function submitAnswers(isAutoSubmit = false) {
    if (isSubmitted || !currentTeam) return;
    isSubmitted = true;
    if (timerInterval) clearInterval(timerInterval);

    const timeTaken = timeLimitSeconds - timeRemaining;

    try {
      logTerminal('Transmitting final matrix to Latverian database...', 'warn');
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: currentTeam.id,
          teamName: currentTeam.team_name,
          timeTakenSeconds: timeTaken,
          answers: userAnswers
        })
      });

      const data = await res.json();
      if (data.success) {
        sfx.playVictory();
        logTerminal(`Transmission accepted! Score: +${data.score} PTS (Errors: ${data.errorCount})`, 'success');
        showResultsModal(data);
      } else {
        alert(data.error || 'Submission error');
      }
    } catch (err) {
      console.error(err);
      alert('Error sending transmission. Please contact DJS SIGAI coordinators.');
    }
  }

  // Display Result Modal (NO answers spoiled!)
  function showResultsModal(data) {
    const resultPoints = document.getElementById('resultPoints');
    const resultCorrect = document.getElementById('resultCorrect');
    const resultErrors = document.getElementById('resultErrors');
    const resultTime = document.getElementById('resultTime');
    const resultGrade = document.getElementById('resultGrade');

    resultPoints.textContent = `+${data.score}`;
    resultCorrect.textContent = `${data.correctCount} / 59`;
    resultErrors.textContent = data.errorCount;

    const mins = Math.floor(data.timeTakenSeconds / 60);
    const secs = data.timeTakenSeconds % 60;
    resultTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (data.score === 15) {
      resultGrade.textContent = 'PERFECT // 0 ERRORS';
      resultGrade.className = 'stat-val text-green';
    } else if (data.score === 10) {
      resultGrade.textContent = '<= 5 ERRORS (SUPERIOR)';
      resultGrade.className = 'stat-val text-cyan';
    } else if (data.score === 5) {
      resultGrade.textContent = '6-8 ERRORS (QUALIFIED)';
      resultGrade.className = 'stat-val text-gold';
    } else {
      resultGrade.textContent = '> 8 ERRORS (INCOMPLETE)';
      resultGrade.className = 'stat-val text-red';
    }

    resultModal.classList.add('show');
  }

  closeResultModalBtn.addEventListener('click', () => {
    resultModal.classList.remove('show');
    sfx.playClick();
  });

  // Init
  initParticles();
  loadPuzzleData();
})();
