# UI test results

Run at 2026-11-22T14:38:11.362Z against `http://127.0.0.1:4173` (headless Chromium, 430×932).

| Test | Input (short) | Type | Expected output | Actual output (short) | Pass / Fail | Screenshot |
|---|---|---|---|---|---|---|
| UI1 | Login screen: Ramesh Sharma, PIN 9999 | Invalid | Stays on login screen with an error message | URL /; error message shown: true | Pass | `docs/screenshots/milestone2/UI1_wrong_pin_rejected.png` |
| UI2 | Open Daily Routine Sequencer as Ramesh and play all 5 levels | Normal | Cards dealt at start; game completes; session saved (HTTP 201) | 5 cards at start; save responses: 201 | Pass | `docs/screenshots/milestone2/UI2_routine_sequencer_completed_saved.png` |
| UI3 | Switch UI language to Hindi, open Daily Reminders | Edge | 10 reminders with 10 different Hindi titles | 10 distinct Hindi titles: सुबह का नाश्ता और असम चाय / सुबह की निर्धारित दवा / सुबह पानी पीने का समय … | Pass | `docs/screenshots/milestone2/UI3_hindi_reminder_titles.png` |
| UI4 | Network switched off, then open /patient/reminders | Edge | Page and today's schedule load from the PWA cache | service worker active: true; schedule shown offline: true | Pass | `docs/screenshots/milestone2/UI4_offline_reminders.png` |
| UI5 | Open AI Assistant, type 'Who is my doctor?' | Normal | Reply naming Dr. Ananya Sharma appears in the chat window | HTTP 200, replySource fallback; reply shown: true; "আপোনাৰ মুখ্য চিকিৎসক আৰু তত্ত্বাৱধায়ক হৈছে Dr. Ananya Sharma। তেওঁ সদায় আপোনাৰ স্বাস্থ্য" | Pass | `docs/screenshots/milestone2/UI5_chat_who_is_my_doctor.png` |
