/**
 * speech.js
 * Web Speech API wrapper for reading country names aloud.
 * Helps children learn correct pronunciation.
 */

const Speech = {
  _voices: [],
  _supported: typeof window !== 'undefined' && 'speechSynthesis' in window,

  /**
   * Must be called once at startup.
   * Some browsers load voices asynchronously.
   */
  init() {
    if (!this._supported) return;

    const load = () => {
      this._voices = window.speechSynthesis.getVoices();
    };

    load();
    window.speechSynthesis.onvoiceschanged = load;
  },

  /**
   * Speak the given text.
   * @param {string} text   - Text to speak
   * @param {number} [rate] - Speech rate (default 0.82 — slightly slower for kids)
   */
  speak(text, rate = 0.82) {
    if (!this._supported) return;

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate   = rate;
    utterance.pitch  = 1.05;
    utterance.volume = 1.0;

    // Prefer a clear English voice when available
    const preferred =
      this._voices.find(v => v.lang === 'en-US' && !v.name.includes('Zira')) ||
      this._voices.find(v => v.lang.startsWith('en'));

    if (preferred) utterance.voice = preferred;

    window.speechSynthesis.speak(utterance);
  },

  /**
   * Stop any speech currently playing.
   */
  stop() {
    if (this._supported) window.speechSynthesis.cancel();
  }
};
