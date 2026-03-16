/**
 * app.js
 * UI controller: screen management, event wiring, rendering,
 * sound effects (Web Audio API), and confetti animation.
 */

const App = {

  /* ---- Internal state ---- */
  countries: [],
  _letterTimer:   null,
  _nextQTimer:    null,
  _audioCtx:      null,

  /* Confetti */
  _confCanvas:    null,
  _confCtx:       null,
  _confParticles: [],
  _confRafId:     null,

  /* ------------------------------------------------------------------ */
  /* Initialisation                                                       */
  /* ------------------------------------------------------------------ */

  async init() {
    this._showLoading(true);

    try {
      this.countries = await loadCountries();
      if (!this.countries.length) throw new Error('CSV returned 0 countries.');
    } catch (err) {
      this._showLoading(false);
      this._showError(err.message);
      return;
    }

    Speech.init();

    this._initConfetti();
    this._wireMenu();
    this._wireGameOver();
    this._populateContinentCounts();

    this._showLoading(false);
    this._showScreen('menu');
  },

  /* ------------------------------------------------------------------ */
  /* Screen management                                                    */
  /* ------------------------------------------------------------------ */

  _showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${name}-screen`).classList.add('active');

    if (name === 'menu') {
      document.getElementById('menu-high-score').textContent =
        `Best Score: ${Game.getHighScore()}`;
    }
  },

  _showLoading(visible) {
    document.getElementById('loading-overlay').classList.toggle('hidden', !visible);
  },

  _showError(msg) {
    const el = document.getElementById('error-message');
    el.classList.remove('hidden');
    el.textContent =
      `⚠️ ${msg} — Please open this project with VS Code Live Server ` +
      '(right-click index.html → Open with Live Server).';
  },

  /* ------------------------------------------------------------------ */
  /* Menu                                                                 */
  /* ------------------------------------------------------------------ */

  _wireMenu() {
    const nameInput = document.getElementById('player-name');

    document.querySelectorAll('.continent-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const continent  = btn.dataset.continent;
        const playerName = nameInput.value.trim() || 'Explorer';
        this._startGame(playerName, continent);
      });
    });

    nameInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') nameInput.blur();
    });
  },

  _populateContinentCounts() {
    const counts = {};
    this.countries.forEach(c => {
      counts[c.continent] = (counts[c.continent] || 0) + 1;
    });

    document.querySelectorAll('[data-continent-count]').forEach(el => {
      const c = el.dataset.continentCount;
      if (counts[c]) el.textContent = `${counts[c]} flags`;
    });
  },

  /* ------------------------------------------------------------------ */
  /* Game start                                                           */
  /* ------------------------------------------------------------------ */

  _startGame(playerName, continent) {
    clearTimeout(this._letterTimer);
    clearTimeout(this._nextQTimer);
    Speech.stop();

    const question = Game.start(playerName, continent, this.countries);

    this._showScreen('game');

    // Reset UI
    document.getElementById('player-display').textContent = `👤 ${playerName}`;
    document.getElementById('timer-text').classList.remove('timer-warning');
    this._updateScore(0);
    this._resetTimerBar();

    this._renderQuestion(question);
  },

  /* ------------------------------------------------------------------ */
  /* Game rendering                                                       */
  /* ------------------------------------------------------------------ */

  _renderQuestion(question) {
    const { correct, choices } = question;

    /* -- Flag image -- */
    const img = document.getElementById('flag-image');
    img.classList.remove('flag-visible');
    img.src = '';

    const revealEl = document.getElementById('country-reveal');
    revealEl.textContent = '';
    revealEl.classList.remove('visible');

    img.onload = () => img.classList.add('flag-visible');
    img.onerror = () => {
      // Placeholder SVG for unavailable flags
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
        "width='320' height='213'%3E%3Crect width='320' height='213' fill='%23e8e8e8'/%3E" +
        "%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' " +
        "font-size='18' fill='%23aaa'%3EFlag unavailable%3C/text%3E%3C/svg%3E";
      img.classList.add('flag-visible');
    };
    img.src = correct.flagUrl;

    /* -- Choice buttons -- */
    const grid = document.getElementById('choices-grid');
    const btns = grid.querySelectorAll('.choice-btn');

    btns.forEach((btn, idx) => {
      btn.textContent     = choices[idx].name;
      btn.className       = 'choice-btn';
      btn.disabled        = false;
      btn.dataset.index   = idx;
      btn.onclick         = () => this._handleAnswer(idx);
    });
  },

  _handleAnswer(selectedIdx) {
    const result = Game.answer(selectedIdx);
    if (!result) return;

    /* Disable all buttons */
    document.querySelectorAll('.choice-btn').forEach(btn => (btn.disabled = true));

    /* Highlight correct / wrong */
    document.querySelectorAll('.choice-btn').forEach((btn, idx) => {
      if (idx === result.correctIndex)                  btn.classList.add('correct');
      else if (idx === selectedIdx && !result.isCorrect) btn.classList.add('wrong');
    });

    /* Score update */
    this._updateScore(Game.state.score);

    /* Sound + confetti */
    if (result.isCorrect) {
      this._playCorrectSound();
      this._fireConfetti();
    } else {
      this._playWrongSound();
    }

    /* Letter-by-letter reveal then speech */
    const name       = result.correctCountry.name;
    const revealMs   = name.length * 85;

    this._revealName(name);

    setTimeout(() => Speech.speak(name), revealMs + 250);

    /* Next question after name + pause */
    const delay = revealMs + 2400;
    this._nextQTimer = setTimeout(() => {
      if (Game.state.gameActive) {
        this._renderQuestion(Game.generateQuestion());
      }
    }, delay);
  },

  _revealName(name) {
    const el = document.getElementById('country-reveal');
    el.textContent = '';
    el.classList.add('visible');

    let i = 0;
    const step = () => {
      el.textContent = name.substring(0, i);
      i++;
      if (i <= name.length) {
        this._letterTimer = setTimeout(step, 85);
      }
    };
    step();
  },

  _updateScore(score) {
    document.getElementById('score-display').textContent = `⭐ ${score}`;
  },

  _resetTimerBar() {
    const bar = document.getElementById('timer-bar');
    bar.style.width      = '100%';
    bar.style.background = 'linear-gradient(90deg, #2ECC71, #8BC34A)';
    document.getElementById('timer-text').textContent = '60';
  },

  /* ------------------------------------------------------------------ */
  /* Timer tick (called by Game every second)                            */
  /* ------------------------------------------------------------------ */

  onTimerTick(timeLeft) {
    const txt = document.getElementById('timer-text');
    const bar = document.getElementById('timer-bar');
    if (!txt || !bar) return;

    txt.textContent = timeLeft;
    bar.style.width = `${(timeLeft / 60) * 100}%`;

    if (timeLeft > 30) {
      bar.style.background = 'linear-gradient(90deg, #2ECC71, #8BC34A)';
    } else if (timeLeft > 15) {
      bar.style.background = 'linear-gradient(90deg, #FF9800, #FFC107)';
    } else {
      bar.style.background = 'linear-gradient(90deg, #e74c3c, #FF5722)';
      txt.classList.add('timer-warning');
    }
  },

  /* ------------------------------------------------------------------ */
  /* Game Over (called by Game when timer expires)                        */
  /* ------------------------------------------------------------------ */

  onGameOver() {
    clearTimeout(this._letterTimer);
    clearTimeout(this._nextQTimer);
    Speech.stop();

    setTimeout(() => {
      const s         = Game.state;
      const highScore = Game.getHighScore();

      document.getElementById('final-player-name').textContent = s.playerName;
      document.getElementById('final-score').textContent       = s.score;
      document.getElementById('final-high-score').textContent  = highScore;
      document.getElementById('final-correct').textContent     =
        `${s.correctCount} / ${s.questionCount}`;

      const banner = document.getElementById('new-highscore-banner');
      if (s.score > 0 && s.score >= highScore) {
        banner.classList.remove('hidden');
        this._fireConfetti();
        this._fireConfetti();
      } else {
        banner.classList.add('hidden');
      }

      this._showScreen('gameover');
    }, 400);
  },

  _wireGameOver() {
    document.getElementById('play-again-btn').addEventListener('click', () => {
      const s = Game.state;
      this._startGame(s.playerName, s.continent);
    });

    document.getElementById('menu-btn').addEventListener('click', () => {
      Game.abort();
      clearTimeout(this._letterTimer);
      clearTimeout(this._nextQTimer);
      Speech.stop();
      this._showScreen('menu');
    });
  },

  /* ------------------------------------------------------------------ */
  /* Sound effects — Web Audio API (no external files needed)            */
  /* ------------------------------------------------------------------ */

  _getAudioCtx() {
    if (!this._audioCtx) {
      try {
        this._audioCtx =
          new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    // Resume suspended context (required after user gesture on some browsers)
    if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
    return this._audioCtx;
  },

  _playCorrectSound() {
    const ctx = this._getAudioCtx();
    if (!ctx) return;

    // Cheerful ascending arpeggio — C5 E5 G5 C6
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type           = 'sine';
      osc.frequency.value = freq;

      const t = ctx.currentTime + i * 0.11;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.start(t);
      osc.stop(t + 0.4);
    });
  },

  _playWrongSound() {
    const ctx = this._getAudioCtx();
    if (!ctx) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  },

  /* ------------------------------------------------------------------ */
  /* Confetti (canvas-based, no library needed)                          */
  /* ------------------------------------------------------------------ */

  _initConfetti() {
    this._confCanvas  = document.getElementById('confetti-canvas');
    this._confCtx     = this._confCanvas.getContext('2d');
    this._resizeConf();
    window.addEventListener('resize', () => this._resizeConf());
  },

  _resizeConf() {
    this._confCanvas.width  = window.innerWidth;
    this._confCanvas.height = window.innerHeight;
  },

  _fireConfetti() {
    const palette = [
      '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4',
      '#FFEAA7','#DDA0DD','#FFB347','#98FF98','#FF69B4',
    ];

    for (let i = 0; i < 90; i++) {
      this._confParticles.push({
        x:     Math.random() * window.innerWidth,
        y:     -12,
        w:     Math.random() * 14 + 6,
        h:     Math.random() * 7  + 4,
        color: palette[Math.floor(Math.random() * palette.length)],
        speed: Math.random() * 3.5 + 2,
        drift: (Math.random() - 0.5) * 2.5,
        angle: Math.random() * Math.PI * 2,
        spin:  (Math.random() - 0.5) * 0.25,
      });
    }

    if (!this._confRafId) this._tickConfetti();
  },

  _tickConfetti() {
    const ctx = this._confCtx;
    const cv  = this._confCanvas;

    ctx.clearRect(0, 0, cv.width, cv.height);

    this._confParticles = this._confParticles.filter(p => {
      p.y     += p.speed;
      p.x     += p.drift;
      p.angle += p.spin;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.y / (cv.height * 1.1));
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();

      return p.y < cv.height + 20;
    });

    if (this._confParticles.length > 0) {
      this._confRafId = requestAnimationFrame(() => this._tickConfetti());
    } else {
      this._confRafId = null;
      ctx.clearRect(0, 0, cv.width, cv.height);
    }
  },
};

/* ---- Bootstrap ---- */
document.addEventListener('DOMContentLoaded', () => App.init());
