# Smriti: Project Synopsis

{{TEAM_LINE}}

## What Smriti is

Smriti (Sanskrit for "memory") is a phone-friendly web app for older people living with early memory loss, and for the family members and doctors who look after them. The idea is simple. The patient gets one calm place to see what today looks like, hear it read out in their own language, play a few short memory games, look through family photos, and ask a friendly assistant everyday questions such as "Which medicine do I take now?" or "Who is my doctor?". The caregiver, on the other side, can see at a glance whether the day is going to plan.

We built on Smriti, an open project created for Smart India Hackathon 2026 by Team Design Divas. In this mini project we are taking it from a hackathon prototype to something that has actually been run, tested, fixed and put online for anyone to try.

## Why it matters

Forgetting a tablet, a meal or a familiar face is often the first thing families notice, and it is also the thing they find hardest to keep track of, especially when they live in another town. In India's North-East the problem is sharper: specialists are few and far away, mobile data is patchy, and many elders are more comfortable in Assamese or Hindi than in English. Most health apps quietly assume an English-speaking user with a good connection. Smriti tries not to.

## Objectives

1. Give the patient a daily routine they can follow without help: large buttons, a 4-digit PIN instead of a password, and every reminder read aloud.
2. Answer the patient's everyday questions with an AI model (Google Gemini) that works only from that patient's own records and replies in the patient's own language.
3. Keep the mind active with five short games built around familiar things (a basket of local market produce, the order of a normal day, family faces, Bihu drum rhythms, spotting the odd one out) that get easier or harder depending on how the patient is doing.
4. Let a caregiver or doctor see routine adherence, missed medicines and game trends in one dashboard.
5. Keep working when the internet does not: the app opens offline and catches up later.

## Scope

**In scope for this milestone:** the patient portal, the caregiver portal, the AI companion chat, the five games, the family photo Memory Bank, English / Hindi / Assamese screens, offline use, a public demo deployment, and systematic testing of both the app and the AI prompts.

**Out of scope:**

- Diagnosis or treatment. Smriti is a support tool, not a medical device; it never diagnoses and must never change a prescription.
- Real patient data. Everything runs on demo profiles.
- Voice questions and sending WhatsApp messages. Both are built, but testing them needs recorded voice clips and a WhatsApp Business number, so they move to Milestone 3.
- Languages beyond Assamese, Hindi and English.

## Methodology

1. **Understand what is really there.** We ran the whole app on our own machine with a demo database and used it page by page, the way a patient and a caregiver would, checking every feature in the original README against the code rather than taking it on trust.
2. **Fix what breaks.** Using it properly turned up six real problems. A wrong PIN still opened the patient's dashboard, one game showed no cards, Hindi mode gave every reminder the same title, and WhatsApp replies were not matched to patients. Each was fixed, re-tested and committed separately so the history shows exactly what changed.
3. **Build the AI around the patient, not the other way round.** Instead of hoping the model "knows" the patient, the prompt is rebuilt from the database on every message: their profile, today's reminders, family members and recent game scores. It has a strict rule to answer in the patient's language, a limit of two to four sentences (replies are read aloud), and reassurance reserved for moments of real distress. We traced three versions of this prompt through the project's history and compare them on the same questions.
4. **Test with fixed inputs, and keep the failures.** {{TEST_SUMMARY}} Every input and real response is saved in the repository.
5. **Put it online.** The app is hosted on Vercel, the server on Render and the data on MongoDB Atlas, so an evaluator can open a link and try it without installing anything.

## Expected outcome

- A working public prototype in which anyone can log in as a demo patient or caregiver and use every main feature.
- An AI companion that answers from real records in the patient's own language, with measured evidence of how each prompt change affected the answers.
- An honest picture of what works and what does not yet. That picture sets up Milestone 3: bring back a rule that sends dose questions to the doctor (the current prompt dropped it), lock down a few open server routes, and test voice and WhatsApp end to end.
- In the longer run, something a family could set up for an elderly parent in an afternoon, and that the parent would actually want to use.
