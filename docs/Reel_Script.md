# Milestone 2 reel: script and recording plan (target 120 s, allowed 90–150 s)

**Status: reel not recorded yet; link pending.** Record a real screen capture of the deployed app; no mock-ups (mock screens score 0 for the demo part).

## Before recording

- Open the deployed app in a private window 2 minutes early, so the Render backend is awake (first request after idle ≈ 50 s).
- Phone-sized browser window (e.g. Chrome DevTools → iPhone 14 Pro, 430 px) or a real phone with screen recording.
- Have open in tabs: `prompts/v1/P1_patient_companion_chat.md`, `prompts/v3/P1_patient_companion_chat.md`, `test-data/outputs/prompt_experiments.md` (from a run with a Gemini key).
- Volume on: the app reads text aloud.

## Timeline

| Time | Part | On screen | Narration (voice-over) | Caption |
|---|---|---|---|---|
| 0:00–0:10 | 1. Problem | Login screen with the 🌸 logo, then the patient dashboard | "Millions of elderly Indians with early dementia forget medicines, meals and family faces, and their caregivers can't see it. Smriti is a memory companion for them, in their own language." | *For elderly dementia patients & caregivers* |
| 0:10–0:25 | 2a. Old prompt | `prompts/v1` file, then the v1 replies in `prompt_experiments.md` for "Who is my doctor?" | "Our first prompt only gave the AI a persona. Asked 'Who is my doctor?', it could not know, and it replied in English to an Assamese speaker." | *Prompt v1: persona only* |
| 0:25–0:45 | 2b. Improved prompt | `prompts/v3` file (scroll the profile, language rule, schedule), then the results table v1 / v2 / v3 | "Version 3 rebuilds the prompt from the patient's own records every time, adds a strict language rule and today's schedule. Across 5 runs it named the right doctor in X of 5, and replied in Assamese in Y of 25." *(read the real numbers from the table)* | *Prompt v3: grounded in real records* |
| 0:45–1:00 | 3a. Demo: login + schedule | Type `Ramesh Sharma`, PIN 1234 → dashboard → Reminders → tap **Listen to Full Schedule** | "Ramesh logs in with a 4-digit PIN. His 10 reminders for today are read aloud, and he ticks them off with one tap." | *Real app, live data* |
| 1:00–1:20 | 3b. Demo: AI chat | Open the AI Assistant, type "Who is my doctor?", wait for the reply; then "Which medicine do I take this morning?" | "He asks Smriti who his doctor is. The answer comes from his records, in Assamese, and is read aloud." | *Gemini, prompt P1* |
| 1:20–1:35 | 3c. Demo: game | Games → Daily Routine Sequencer → tap two cards in order → confetti | "Short games keep memory active. Difficulty adapts to his speed and mistakes." | *Adaptive difficulty* |
| 1:35–1:45 | 3d. Demo: caregiver | Log out → Caregiver → `dr.ananya@smriti.in` / `caregiver123` → dashboard → alerts | "His doctor sees adherence, game scores and missed medicines in one place." | *Caregiver view* |
| 1:45–2:00 | 4. Progress & next | README module table or CHANGELOG | "In Milestone 2 we fixed six bugs, including a wrong-PIN login, and tested 26 inputs. Next: voice questions, WhatsApp delivery and the double-dose safety rule." | *Done: 6 fixes, 26 tests · Next: voice, WhatsApp, safety* |

## Screen-recording sequence (checklist)

1. Login screen → name + age + PIN on the keypad → **Enter My Space**
2. Dashboard (pause 2 s) → **Reminders** tab → **Listen to Full Schedule**
3. Floating **AI Assistant** button → type question → reply appears
4. **Games** tab → Daily Routine Sequencer → 2–3 correct taps
5. Profile → **Log Out** → **Caregiver / Admin** → sign in → dashboard → **Attention Required**

## Editing checklist

- [ ] Total length between 90 and 150 s (write the exact seconds in form Q14)
- [ ] Order: problem → prompt before/after → live demo → progress
- [ ] Prompt part shows the old prompt and its output, then the new prompt and its output
- [ ] Demo is a real run on the deployed URL; browser address bar visible at least once
- [ ] Captions readable on a phone (≥ 28 px), no API keys or passwords other than the demo logins
- [ ] Voice-over clear; background music low or none
- [ ] Upload to Google Drive or unlisted YouTube, sharing "Anyone with the link"; test the link in a private window
