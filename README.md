# Doom's Decryption: Strike & Decipher
### DJS SIGAI Event • Avengers: Doomsday Edition

A standalone, plug-and-play mini-game website designed to connect directly into a larger festival portal or run as an independent station.

---

## 🚀 Quick Start

### 1. Launch the Server
Ensure Node.js (v18+) is installed. Run:
```bash
npm start
```
*(Zero npm install required! Runs using Node's standard library and built-in SQLite engine.)*

The game server will be live at:
```
http://localhost:3000
```

---

## 🎮 Game Rules & Points System

1. **Dual Competing Letters**: Each of the 59 active cells contains two competing letters split diagonally.
2. **Strike Out the Noise**: Operatives click either letter to strike out the decoy and preserve the secret letter.
3. **16 Secret Words**: Surviving letters across and down form 16 classified words (all >= 3 letters, no 2-letter words):
   - `POSTPONE`, `PEOPLE`, `OAT`, `SIT`, `OPEN`, `LOGIC`, `ENVELOPE`, `NANNY`, `YELLOW`, `PEN`, `CLONE`, `CANINE`, `NAIL`, `QUEEN`, `PIT`, `TEN`.
4. **15-Minute Countdown**: Timed mission with real-time countdown. Auto-submits on expiry.
5. **Official Scoring Criteria**:
   - **0 Errors**: +15 PTS
   - **1 to 5 Errors**: +10 PTS
   - **6 to 8 Errors**: +5 PTS
   - **>8 Errors**: +0 PTS

---

## 🌐 Connecting into a Bigger Website

This mini-game website can easily connect into your committee's main portal:

### Option A: Iframe Embed
```html
<iframe 
  src="https://your-domain.com" 
  width="100%" 
  height="900px" 
  frameborder="0"
  allow="autoplay">
</iframe>
```

### Option B: Direct URL Link / Route
Direct link: `https://your-domain.com` or `/games/dooms-decryption`.

---

## 📊 Live Coordinator Leaderboard

- Live Scoreboard: `http://localhost:3000/leaderboard.html`
  - Auto-refreshes every 5 seconds.
  - Automatically breaks ties based on shortest time taken.
  - Features an **Export to CSV** button to download full team results for committee records.

---

## 🧪 Verification & Tests

To run the offline verification suite:
```bash
npm test
```
