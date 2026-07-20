# Product Requirements Document (PRD): Footballica

## 1. Product Overview
- **Product Name:** Footballica (فوتبالیکا)
- **Platform:** Mobile-First Web Application (PWA)
- **Genre:** Gamified Trivia + Football Club Management (Metagame)
- **Core Hook:** "Take your ruined Division 3 club to the Championship using your football knowledge."
- **Primary Goal:** Eliminate the "boring exam" feeling. Every trivia question must feel like a dynamic football match event (e.g., answering correctly equals scoring a goal).

---

## 2. Design & UX Strategy
- **Art Style:** "Fantasy UI". Vibrant colors, chunky/bubbly buttons, heavy use of drop shadows, and glowing effects.
- **Micro-Interactions:** Particle effects for correct answers (goals), screen shakes for wrong answers.
- **Haptic Feedback:** Heavy vibration on wrong answers (hitting the post), light and rewarding taps on correct answers.
- **Mobile-First Constraints:** Touch targets must be >= 44x44px. No horizontal scrolling. Use a bottom navigation bar for core screens.

---

## 3. Core Gameplay Loop
1. **Hub:** User opens the app and lands on the Club Hub (showing the visual state of their stadium).
2. **Gate:** User checks Stamina (energy tied to the club's infrastructure level).
3. **Action:** User enters a trivia match (e.g., Penalty Mode).
4. **Resolution:** User answers questions (Correct = Goal, Wrong = Conceded Goal/Miss).
5. **Reward:** User earns Coins, XP, and Fans based on the match result.
6. **Progression:** User spends Coins to upgrade club infrastructure, which visually upgrades the Hub and improves stamina/rewards.

---

## 4. Feature Scope (MVP - Phase 1)
Only these features should be developed in the MVP phase:

### A. Onboarding (FTUE - First Time User Experience)
- **Character Selection:** User chooses a manager avatar (e.g., Tactical Coach, Young Director, Veteran Fan).
- **Narrative Hook:** The chosen character hands over the keys to a ruined club. User names the club.
- **Tutorial Match:** User plays a short "Penalty Mode" tutorial.
- **First Upgrade:** User earns first coins and is forced to buy the first stadium upgrade (e.g., a new wooden bench).

### B. The Club Hub (Metagame)
- A visual dashboard showing the club's current state.
- Dynamic visual changes (e.g., upgrading the pitch changes the image from dirt to grass).
- Displays current Coins, XP (Manager Level), Fans, and Stamina.

### C. Game Modes (Core Action)
- **Quick Match:** 5-10 rapid-fire questions.
- **Penalty Mode:** 5 questions. Correct = Goal, Wrong = Goalkeeper Save. High stakes, simple UI. Visual bomb or referee whistle instead of a standard digital timer.

### D. Progression & Economy
- **Stamina System:** Base stamina allows 3 matches. Upgrading the Training Ground increases daily match limits.
- **Newspaper Events (Boosters):** Random popup events mimicking sports news (e.g., "Ali Daei visits the club!"). These grant temporary multipliers to coin or fan generation.
- **Weekly Leaderboard:** A simple league ranking system based on XP earned during the week.

---

## 5. Post-MVP Scope (DO NOT build in Phase 1)
Keep the database architecture flexible for these future features, but do not write UI/Logic for them yet:
- Live real-world event quizzes (e.g., El Clasico day).
- Item Black Market (C2C trading of nostalgic items).
- Real-time 1v1 PvP duels.
- Collectible Super-Power Cards (e.g., Neymar card for gameplay boosts).

---

## 6. Technical Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + Framer Motion (for animations and Fantasy UI layout)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **State Management:** Zustand (for client-side states like active match score and temporary stamina)
- **Deployment:** Vercel

---

## 7. Data Architecture & Entities (Prisma Schema Guidelines)
The database must support the metagame economy. Core entities include:

- **User:** Manages authentication, global XP, and Manager Level.
- **Club:** Belongs to a User. Tracks total Coins, total Fans, current Stamina, and Upgrade Levels (Stadium Level, Pitch Level, Medical Level).
- **MatchHistory:** Logs finished matches, scoreline, and earned rewards to prevent client-side cheating.
- **Question:** The trivia dictionary. Includes fields for category, difficulty, correct index, and match context.

---

## 8. Content Structure (Trivia Questions)
Questions should be structured cleanly to allow future remote fetching.
Format: `id`, `questionText`, `options` (Array of 4 strings), `correctIndex` (0-3), `difficulty` (easy/medium/hard), `category`.