/**
 * csvLoader.js
 * Loads and parses the countries CSV database file.
 *
 * CSV format (first row = header, ignored):
 *   country_name,continent,flag_image_url
 *
 * LOADING STRATEGY
 * ────────────────
 * 1. Try to fetch data/countries.csv  (works on a real server / Live Server)
 * 2. If that fails (file:// protocol, offline, no server), fall back to the
 *    COUNTRIES_LOCAL global defined in data/countries_local.js.
 *
 * This means:
 *   • Future production server  → always uses the CSV (single source of truth)
 *   • Offline / shared folder   → transparently uses the JS fallback
 */

/**
 * Fetches the CSV file and returns an array of country objects.
 * Falls back to the COUNTRIES_LOCAL global if the CSV cannot be loaded.
 *
 * @returns {Promise<Array<{name: string, continent: string, flagUrl: string}>>}
 */
async function loadCountries() {
  // ── 1. Attempt CSV (server / Live Server path) ──────────────────────────
  try {
    const response = await fetch('data/countries.csv');

    if (response.ok) {
      const text = await response.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) return parsed;
    }
  } catch (_) {
    // fetch() throws on file:// or network error — fall through to fallback
  }

  // ── 2. Offline fallback — data/countries_local.js must be loaded first ──
  if (typeof COUNTRIES_LOCAL !== 'undefined' && COUNTRIES_LOCAL.length > 0) {
    console.info('Flag Quest: using offline JS data (CSV not available).');
    return COUNTRIES_LOCAL;
  }

  // ── 3. Nothing worked ───────────────────────────────────────────────────
  throw new Error(
    'No country data could be loaded. ' +
    'Make sure data/countries_local.js is present, or run the project ' +
    'through a local server (e.g. VS Code Live Server).'
  );
}

/**
 * Parses raw CSV text into an array of country objects.
 * Handles Windows (\r\n) and Unix (\n) line endings.
 *
 * @param {string} text
 * @returns {Array<{name: string, continent: string, flagUrl: string}>}
 */
function parseCSV(text) {
  const lines = text
    .split('\n')
    .map(l => l.replace(/\r$/, '').trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Skip header row (index 0)
  const countries = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Split only on the first two commas so URLs with commas stay intact
    const first  = line.indexOf(',');
    const second = line.indexOf(',', first + 1);

    if (first === -1 || second === -1) continue;

    const name      = line.substring(0, first).trim();
    const continent = line.substring(first + 1, second).trim();
    const flagUrl   = line.substring(second + 1).trim();

    if (name && continent && flagUrl) {
      countries.push({ name, continent, flagUrl });
    }
  }

  return countries;
}
