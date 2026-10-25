# Doom's Decryption: Strike & Decipher
### DJS SIGAI Event • Avengers: Doomsday Edition

A plug-and-play mini-game website designed for the DJS SIGAI committee to connect directly into a larger festival portal, deploy on Vercel, or run as an independent station.

---

## 🚀 Quick Start (Local)

Run with Node.js (v18+):
```bash
npm start
```
*(Zero npm dependencies required! Uses Node standard library and built-in SQLite engine.)*

- **Game Website**: `http://localhost:3000`
- **Live Leaderboard**: `http://localhost:3000/leaderboard.html`

---

## ⚡ Launch on Vercel

### Option 1: Quick CLI Deploy
```bash
npx vercel
```
Follow the interactive prompts to deploy live in seconds.

### Option 2: Deploy via GitHub
1. Push this folder to your GitHub account.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Click **Deploy**.

---

## 🎮 Game Rules & Participant Flow

1. **Operative Registration**: Participants enter their Team Name and Operative Members.
2. **Rules First Confirmation**:
   - The mission rules and points system are presented to the team.
   - The participant must check the confirmation checkbox:
     *"I have read and understood all instructions. I am ready to start the 10-minute timer."*
   - Clicking **"OK — ENGAGE 10-MINUTE TIMER"** initiates the countdown.
3. **Dual Competing Letters**: Each of the 59 active cells has two competing letters divided diagonally.
4. **Strike Out the Noise**: Click the noise letter to delete it with a red strike line and preserve the real letter.
5. **Reveal the Real Words**:
   - Surviving letters across and down form real meaningful words.
   - **Important Word Rule**: All secret words are 3 letters or longer (there are **NO 2-letter words** in the solved grid).
6. **10-Minute Countdown**: Exactly 10 minutes to finish the entire matrix. Automatically submits upon expiry.
7. **Official Points System**:
   - **0 Errors**: +15 PTS
   - **1 to 5 Errors**: +10 PTS
   - **6 to 8 Errors**: +5 PTS
   - **> 8 Errors**: +0 PTS

---

## 📊 Live Leaderboard & Results

- **Live URL**: `/leaderboard.html`
- Automatically updates in real-time every 5 seconds.
- Ranks teams primarily by **Score (Highest first)**, with **Completion Time** as the tie-breaker.
- Includes a one-click **"Export CSV"** button for committee organizers.
