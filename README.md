# WordWalk (React Native) — GRE Memorization + To‑Do + Streak Rewards

This is an **Expo React Native** starter you can drop into a fresh project.

## What you get (MVP)
- **Daily review** with a simple **spaced repetition (SM‑2)** schedule
- **Daily goal → streak** (streak increases only when you hit the goal)
- **Coins + XP** per review
- **Badges** (streak + total review milestones)
- **To‑do list** (today view + all view)
- **Dark/Light mode** with a setting override (system / light / dark)

The word list is seeded from `src/data/words.json` (copied from your existing dataset).

---

## 1) Create a new Expo app
```bash
npx create-expo-app WordWalk --template
cd WordWalk
```
Pick the TypeScript blank template if the CLI asks.

## 2) Install dependencies
Use **expo install** when possible so versions match your SDK:
```bash
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler
npx expo install @react-native-async-storage/async-storage
npm i zustand
```

## 3) Copy the code from this folder
Copy these into your Expo project root:
- `App.tsx`
- `src/` (entire folder)

Your final structure should look like:
```
WordWalk/
  App.tsx
  src/
    components/
    data/words.json
    navigation/
    screens/
    store/
    theme/
    utils/
```

## 4) Run
```bash
npm run start
```
Then open on Android/iOS (Expo Go or a dev build).

---

## Customization knobs
- **Daily goal**: Settings → Daily goal
- **Theme**: Settings → Theme
- **Add your own words**: replace `src/data/words.json` with your file (same structure).

---

## Next upgrades (if you want to make it “journal publishable” level)
- Notifications (daily reminder + “due words” alerts)
- Analytics (retention, time spent, weakest sets)
- Search + favorites across all sets
- “Leech” detection (words you fail repeatedly) + targeted drills
- Cloud sync (Firebase/Supabase)
