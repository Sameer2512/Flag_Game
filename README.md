# Flag Quest 🌍

An interactive educational game that teaches children world flags.
Players see a flag and must identify which country it belongs to.

Built with plain **HTML + CSS + JavaScript** — no frameworks, no installs,
completely free to run and modify.

---

## Quick Start

### Requirements
- [VS Code](https://code.visualstudio.com/) (free)
- [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (free, install from VS Code Extensions panel)

### Run the game
1. Open this folder in VS Code: `File → Open Folder`
2. Right-click **`index.html`** in the Explorer panel
3. Select **"Open with Live Server"**
4. The game opens at `http://127.0.0.1:5500` in your browser

> **Why Live Server?**
> Browsers block `fetch()` on `file://` URLs for security reasons.
> Live Server provides a tiny local HTTP server that lets the CSV load correctly.

---

## Project Structure

```
flag-learning-game/
│
├── index.html              # Single-page app shell
│
├── styles/
│   └── style.css           # All styles (variables, animations, responsive)
│
├── scripts/
│   ├── csvLoader.js        # Fetches & parses data/countries.csv
│   ├── speech.js           # Web Speech API wrapper (pronunciation)
│   ├── game.js             # Game logic — state, timer, scoring, questions
│   └── app.js              # UI controller — rendering, sound, confetti
│
├── data/
│   └── countries.csv       # 🗄️ Country database (edit freely!)
│
├── assets/
│   └── sounds/             # Reserved for future audio files
│
└── README.md
```

---

## How to Play

1. Enter your name (or leave blank for "Explorer")
2. Choose a region: **Africa, Asia, Europe, North America, South America, Oceania,** or **Mixed** (all 190+ countries)
3. A flag appears — tap the correct country name from 4 choices
4. Correct answer → confetti + cheerful sound + letter-by-letter name reveal + pronunciation
5. Wrong answer → the correct answer is highlighted
6. Score 10 points per correct answer within **60 seconds**
7. Your best score is saved locally in the browser

---

## Editing the CSV Database

The file `data/countries.csv` is the entire country database.
Open it in any text editor or spreadsheet app.

### Format
```
country_name,continent,flag_image_url
```

### Example rows
```csv
Canada,North America,https://flagcdn.com/w320/ca.png
Brazil,South America,https://flagcdn.com/w320/br.png
Japan,Asia,https://flagcdn.com/w320/jp.png
```

### Valid continent values
Use **exactly** one of these strings (case-sensitive):
- `Africa`
- `Asia`
- `Europe`
- `North America`
- `South America`
- `Oceania`

Any other value causes the country to appear only in **Mixed** mode.

---

## Adding More Countries

1. Find the country's **ISO 3166-1 alpha-2 code** (2-letter lowercase code)
   Reference: https://www.iso.org/obp/ui/#search

2. Verify the flag exists on flagcdn:
   `https://flagcdn.com/w320/XX.png` (replace XX with the code)

3. Add a row to `data/countries.csv`:
   ```
   Country Name,Continent,https://flagcdn.com/w320/XX.png
   ```

4. Save the file — the game picks up changes on the next page reload.

---

## Flag Image Source

All flags come from **[flagcdn.com](https://flagcdn.com)** — a free, public CDN
with flags for every country in the world. No API key needed.

URL pattern: `https://flagcdn.com/w320/{iso-code}.png`
Available sizes: `w40`, `w80`, `w160`, `w320`, `w640`, `w1280`, `w2560`

---

## Features

| Feature | Details |
|---|---|
| 190+ countries | All UN-recognised nations across 6 continents |
| 4-choice quiz | One correct + three plausible distractors |
| 60-second timer | Colour-coded urgency bar |
| Letter reveal | Country name types out letter by letter |
| Pronunciation | Web Speech API reads the name aloud |
| Correct sound | Ascending arpeggio (Web Audio API) |
| Wrong sound | Descending buzz (Web Audio API) |
| Confetti | Canvas-based particle animation |
| High score | Saved in browser `localStorage` |
| Responsive | Works on phones, tablets, and desktops |
| Offline capable | Only flag images require internet |

---

## Extending the Project

The codebase is intentionally modular to make future features easy:

| Goal | Where to look |
|---|---|
| Add more game modes | `game.js` — extend `Game.start()` |
| Translate to another language | `speech.js` — pass a `lang` to `SpeechSynthesisUtterance` |
| Add user accounts | Replace `localStorage` with a backend API call in `game.js` |
| Leaderboard | Post scores to any free backend (Supabase, Firebase free tier) |
| Package as mobile app | Wrap with Capacitor or Cordova — no code changes needed |
| Difficulty levels | Add a timer duration option on the menu screen |
| Geography hints | Add `latitude`, `longitude`, `capital` columns to the CSV |

---

## Browser Compatibility

| Browser | Status |
|---|---|
| Chrome / Edge | ✅ Full support |
| Firefox | ✅ Full support |
| Safari (iOS/macOS) | ✅ Full support |
| Samsung Internet | ✅ Full support |

Speech synthesis quality varies by browser and OS voice pack.
If no voice is heard, check browser permissions for audio.

---

## License

Free to use, modify, and distribute for educational purposes.
Flag images belong to their respective countries; CDN provided by flagcdn.com.
