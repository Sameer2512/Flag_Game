/**
 * game.js
 * Core game logic: state management, question generation,
 * answer checking, timer, and scoring.
 *
 * This module is intentionally free of DOM references so it
 * can be reused in future environments (React, mobile, etc.).
 * All UI callbacks are routed through the App object.
 */

const Game = {

  /* ---- State ---- */
  state: {
    playerName:        '',
    continent:         'Mixed',
    score:             0,
    timeLeft:          60,
    timerInterval:     null,
    gameActive:        false,
    currentQuestion:   null,
    allCountries:      [],      // full loaded list
    filteredCountries: [],      // continent-filtered + shuffled
    usedIndices:       new Set(),
    questionCount:     0,
    correctCount:      0,
    answeredCurrent:   false,
  },

  /* ------------------------------------------------------------------ */
  /* Public API                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Start a new game session.
   *
   * @param {string} playerName
   * @param {string} continent   - Continent name or 'Mixed'
   * @param {Array}  allCountries - Full array from CSV
   * @returns {Object} First question
   */
  start(playerName, continent, allCountries) {
    const s = this.state;
    s.playerName        = playerName || 'Player';
    s.continent         = continent;
    s.score             = 0;
    s.timeLeft          = 150;
    s.gameActive        = true;
    s.allCountries      = allCountries;
    s.usedIndices       = new Set();
    s.questionCount     = 0;
    s.correctCount      = 0;
    s.answeredCurrent   = false;

    // Filter by continent
    s.filteredCountries =
      continent === 'Mixed'
        ? this._shuffle([...allCountries])
        : this._shuffle(allCountries.filter(c => c.continent === continent));

    if (s.filteredCountries.length < 4) {
      // Fallback: use all countries if region has fewer than 4 entries
      s.filteredCountries = this._shuffle([...allCountries]);
    }

    this._startTimer();
    return this.generateQuestion();
  },

  /**
   * Generate the next question.
   * Picks one correct country + 3 plausible wrong answers.
   *
   * @returns {Object} { correct, choices[], correctIndex }
   */
  generateQuestion() {
    const s = this.state;

    // Recycle when all countries have been shown
    if (s.usedIndices.size >= s.filteredCountries.length) {
      s.usedIndices = new Set();
      s.filteredCountries = this._shuffle([...s.filteredCountries]);
    }

    // Pick unused correct country
    let correctIdx;
    let attempts = 0;
    do {
      correctIdx = Math.floor(Math.random() * s.filteredCountries.length);
      attempts++;
    } while (s.usedIndices.has(correctIdx) && attempts < 200);
    s.usedIndices.add(correctIdx);

    const correct = s.filteredCountries[correctIdx];

    // Wrong answers: prefer same continent, fallback to all
    const sameRegion = s.filteredCountries.filter((_, i) => i !== correctIdx);
    const pool = sameRegion.length >= 3
      ? sameRegion
      : s.allCountries.filter(c => c.name !== correct.name);

    const wrongs = this._shuffle([...pool]).slice(0, 3);
    const choices = this._shuffle([correct, ...wrongs]);

    s.currentQuestion  = { correct, choices, correctIndex: choices.indexOf(correct) };
    s.answeredCurrent  = false;
    s.questionCount++;

    return s.currentQuestion;
  },

  /**
   * Register a player's answer.
   *
   * @param {number} selectedIndex - Index in choices[]
   * @returns {{ isCorrect, correctIndex, correctCountry } | null}
   */
  answer(selectedIndex) {
    const s = this.state;
    if (!s.gameActive || s.answeredCurrent) return null;

    s.answeredCurrent = true;
    const isCorrect   = selectedIndex === s.currentQuestion.correctIndex;

    if (isCorrect) {
      s.score        += 10;
      s.correctCount++;
    }

    return {
      isCorrect,
      correctIndex:   s.currentQuestion.correctIndex,
      correctCountry: s.currentQuestion.correct,
    };
  },

  /**
   * Immediately end the game (e.g. user navigates away).
   */
  abort() {
    this._stopTimer();
    this.state.gameActive = false;
  },

  /**
   * Retrieve the persisted high score.
   * @returns {number}
   */
  getHighScore() {
    return parseInt(localStorage.getItem('flagQuest_highScore') || '0', 10);
  },

  /* ------------------------------------------------------------------ */
  /* Private                                                              */
  /* ------------------------------------------------------------------ */

  _startTimer() {
    this._stopTimer();
    this.state.timerInterval = setInterval(() => {
      this.state.timeLeft = Math.max(0, this.state.timeLeft - 1);

      // Notify UI
      if (typeof App !== 'undefined') App.onTimerTick(this.state.timeLeft);

      if (this.state.timeLeft <= 0) this._endGame();
    }, 1000);
  },

  _stopTimer() {
    clearInterval(this.state.timerInterval);
    this.state.timerInterval = null;
  },

  _endGame() {
    const s = this.state;
    s.gameActive = false;
    this._stopTimer();

    // Persist high score
    const prev = this.getHighScore();
    if (s.score > prev) {
      localStorage.setItem('flagQuest_highScore', String(s.score));
    }

    if (typeof App !== 'undefined') App.onGameOver();
  },

  /** Fisher-Yates shuffle — returns new array */
  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};
