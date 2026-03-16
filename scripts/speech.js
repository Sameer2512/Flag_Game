/**
 * speech.js
 * Web Speech API wrapper with sequential option reading,
 * tap-to-hear, feedback phrases, and encouragement.
 */

const Speech = {
  _voices:      [],
  _supported:   typeof window !== 'undefined' && 'speechSynthesis' in window,
  _cancelFlag:  false,
  _voicesReady: Promise.resolve(),   // resolves once voice list is populated

  ENCOURAGEMENTS: [
    "Great job!",
    "You're on fire!",
    "Keep going!",
    "Amazing!",
    "Brilliant!",
    "Well done!",
    "Superstar!",
    "Fantastic!",
    "You're a genius!",
    "Awesome!",
    "Incredible!",
    "You rock!",
  ],

  /**
   * Must be called once at startup.
   * Builds _voicesReady — a Promise that resolves once the voice list
   * is populated. On Chrome the list loads asynchronously; on Firefox/Safari
   * it may be available immediately. A 1.5 s timeout acts as a last resort
   * so the game never hangs waiting for voices that never arrive.
   */
  init() {
    if (!this._supported) return;

    this._voicesReady = new Promise(resolve => {
      const tryLoad = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) {
          this._voices = v;
          resolve();
          return true;
        }
        return false;
      };

      // Already available (Firefox, some Safari builds)
      if (tryLoad()) return;

      // Chrome fires onvoiceschanged when the list is ready
      window.speechSynthesis.onvoiceschanged = () => {
        tryLoad();
        resolve();          // resolve even if list is still empty — better to speak with default voice
      };

      // Hard fallback: if onvoiceschanged never fires (some mobile browsers)
      setTimeout(() => {
        tryLoad();
        resolve();
      }, 1500);
    });
  },

  /**
   * Silently "unlocks" speechSynthesis inside a user-gesture call stack.
   * Must be called synchronously from a click/touch handler — before any
   * await — so the browser considers the subsequent speaks user-initiated.
   * This is the key fix for HTTPS deployments (e.g. Netlify) where
   * autoplay policy blocks speech that starts after an async gap.
   */
  unlock() {
    if (!this._supported) return;
    const utt    = new SpeechSynthesisUtterance('');
    utt.volume   = 0;
    utt.rate     = 1;
    window.speechSynthesis.speak(utt);
  },

  /**
   * Speak text and return a Promise that resolves when finished.
   * Includes a timeout fallback for iOS Safari (onend unreliable).
   *
   * @param {string} text
   * @param {number} [rate]
   * @returns {Promise<void>}
   */
  speakPromise(text, rate = 0.82) {
    // Wrap in async so we can await _voicesReady before constructing the utterance
    return (async () => {
      if (!this._supported) return;
      await this._voicesReady;  // wait for voice list (no-op if already resolved)
      await this._doSpeak(text, rate);
    })();
  },

  /** Internal: create and dispatch one utterance, returning a Promise. */
  _doSpeak(text, rate) {
    return new Promise(resolve => {
      window.speechSynthesis.cancel();

      const utt = new SpeechSynthesisUtterance(text);
      utt.rate   = rate;
      utt.pitch  = 1.05;
      utt.volume = 1.0;

      const preferred =
        this._voices.find(v => v.lang === 'en-US' && !v.name.includes('Zira')) ||
        this._voices.find(v => v.lang.startsWith('en'));
      if (preferred) utt.voice = preferred;

      // Fallback timeout — iOS often doesn't fire onend
      const fallbackMs = Math.max(1600, text.length * 75 + 600);
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };

      const fallback = setTimeout(finish, fallbackMs);
      utt.onend   = () => { clearTimeout(fallback); finish(); };
      utt.onerror = () => { clearTimeout(fallback); finish(); };

      window.speechSynthesis.speak(utt);
    });
  },

  /**
   * Fire-and-forget speech — for feedback phrases after answers.
   *
   * @param {string} text
   * @param {number} [rate]
   */
  speak(text, rate = 0.82) {
    if (!this._supported) return;
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate   = rate;
    utt.pitch  = 1.05;
    utt.volume = 1.0;

    const preferred =
      this._voices.find(v => v.lang === 'en-US' && !v.name.includes('Zira')) ||
      this._voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;

    window.speechSynthesis.speak(utt);
  },

  /**
   * Reads "Which country does this flag belong to?" then each of the
   * 4 options one by one, calling highlight/unhighlight callbacks.
   * Calls onDone when finished (or cancelled).
   *
   * @param {string[]} names         - The 4 country names in order
   * @param {Function} onHighlight   - (index) highlight that button
   * @param {Function} onUnhighlight - (index) remove highlight from that button
   * @param {Function} onDone        - Called when sequence completes or is cancelled
   */
  async readOptionsSequence(names, onHighlight, onUnhighlight, onDone) {
    this._cancelFlag = false;

    await this.speakPromise("Which country does this flag belong to?", 0.88);
    if (this._cancelFlag) { onDone(); return; }

    await this._delay(300);

    for (let i = 0; i < names.length; i++) {
      if (this._cancelFlag) break;

      onHighlight(i);
      await this.speakPromise(names[i], 0.78);
      onUnhighlight(i);

      if (i < names.length - 1 && !this._cancelFlag) {
        await this._delay(250);
      }
    }

    onDone();
  },

  /**
   * Cancel any ongoing readOptionsSequence immediately.
   */
  cancelSequence() {
    this._cancelFlag = true;
    if (this._supported) window.speechSynthesis.cancel();
  },

  /**
   * Stop all speech.
   */
  stop() {
    this._cancelFlag = true;
    if (this._supported) window.speechSynthesis.cancel();
  },

  /**
   * Returns a random encouragement phrase.
   * @returns {string}
   */
  randomEncouragement() {
    return this.ENCOURAGEMENTS[Math.floor(Math.random() * this.ENCOURAGEMENTS.length)];
  },

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
