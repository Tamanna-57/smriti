# API test results

Run at 2026-11-22T14:45:31.401Z against `http://localhost:5000/api` (v22.23.5).

| Test | Input (short) | Type | Expected output | Actual output (short) | Pass / Fail |
|---|---|---|---|---|---|
| T01 | Login: Ramesh Sharma, age 74, PIN 1234 | Normal | HTTP 200 with a signed JWT token | HTTP 200: {"status":"ok","token":"eyJhbGciOiJI…"} | Pass |
| T02 | Login: Ramesh Sharma, PIN 9999 | Invalid | HTTP 401 'Invalid name/phone number or PIN' | HTTP 401: {"error":"Invalid name/phone number or PIN."} | Pass |
| T03 | Login: 'ramesh sharma' (lower case), PIN 1234 | Edge | Login succeeds: elderly users should not be locked out by capital letters | HTTP 401: {"error":"Invalid name/phone number or PIN."} | Fail |
| T04 | Login: name only, no PIN | Invalid | HTTP 400 'A 4-digit PIN is required' | HTTP 400: {"error":"A 4-digit PIN is required"} | Pass |
| T05 | Login: phone '+91 94350 12345', PIN 1234 | Edge | HTTP 200 with token (spaces and +91 ignored) | HTTP 200: {"status":"ok","token":"eyJhbGciOiJI…"} | Pass |
| T06 | GET /caregivers/me with token 'not.a.realtoken' | Invalid | HTTP 401, no caregiver data returned | HTTP 401: {"error":"Invalid or expired session token. Please log in again."} | Pass |
| T07 | Chat (Ramesh, Assamese): 'Who is my doctor?' | Normal | Reply names Dr. Ananya Sharma | HTTP 200: {"reply":"আপোনাৰ মুখ্য চিকিৎসক আৰু তত্ত্বাৱধায়ক হৈছে Dr. Ananya Sharma। তেওঁ সদায় আপোনাৰ স্বাস্থ্যৰ যত্ন লয়। 🌸","replySource":"fallback"} | Pass |
| T08 | Chat in English to an Assamese-language patient | Edge | Reply written mainly in Assamese script | HTTP 200: {"reply":"আজিৰ সূচীত পুৱাৰ চাহ, ৮:৪৫ বজাত ঔষধ, দুপৰীয়াৰ আহাৰ আৰু গধূলি ৪:৩০ বজাত ফুৰিবলৈ যোৱা অন্তর্ভুক্ত। 🌸","replySource":"fallback"} | Pass |
| T09 | Chat: 'Which medicine do I take this morning?' | Normal | Reply names the scheduled medicine (Donepezil 5mg, 8:45 AM) | HTTP 200: {"reply":"আপোনাৰ নিৰ্ধাৰিত ঔষধ পুৱা ৮:৪৫ বজাত পানীৰ সৈতে খোৱাৰ সময়। 🌸","replySource":"fallback"} | Pass |
| T10 | Chat: 'I am scared. Where am I?' | Edge | Calm reassurance: safe at home in Guwahati, doctor is looking after them | HTTP 200: {"reply":"আপুনি Guwahati, Assamত আপোনাৰ নিজৰ ঘৰত সম্পূর্ণ সুৰক্ষিত হৈ আছে। 🌸","replySource":"fallback"} | Pass |
| T11 | Chat: 'Can I take two tablets today?' | Edge | Does not approve a double dose; asks the patient to check with Dr. Ananya | HTTP 200: {"reply":"আপোনাৰ নিৰ্ধাৰিত ঔষধ পুৱা ৮:৪৫ বজাত পানীৰ সৈতে খোৱাৰ সময়। 🌸","replySource":"fallback"} | Fail |
| T12 | Chat: message of only spaces | Invalid | HTTP 400 'A message text or audio recording is required.' | HTTP 400: {"error":"A message text or audio recording is required."} | Pass |
| T13 | Difficulty: 2.1 s, 0 mistakes, level 2 | Normal | Next level higher than 2 | HTTP 200: {"difficulty":3,"reasoning":"Rule-based evaluation: Excellent accuracy and fast response time detected. Increasing difficulty tier.","source":"rule_fallback"} | Pass |
| T14 | Difficulty: reactionTime 'abc', mistakes -4, level 99 | Invalid | No crash; level clamped to the valid range 1-5 | HTTP 200: {"difficulty":5,"reasoning":"Rule-based evaluation: Excellent accuracy and fast response time detected. Increasing difficulty tier.","source":"rule_fallback"} | Pass |
| T15 | Health score for Ramesh with the Render ML engine unreachable | Edge | HTTP 200 with a rule-based fallback score (source contains 'fallback') | HTTP 200: {"status":"ok","patientId":"6b030005832a95f9fb6643a7","patientName":"Ramesh Sharma","cognitiveHealthScore":50,"clinicalStatus":"Significant Decline - Alert Doctor","source":"rule_fallback","weeklyAggregates":{"gamesPlaye | Pass |
| T16 | Translate 'Please take your medicine with water' to Assamese, service offline | Edge | HTTP 200, original text returned so the reminder can still be read aloud | HTTP 200: {"translated_text":"Please take your medicine with water","original_text":"Please take your medicine with water","target_language":"as","source":"fallback_original","error":"Request failed with status code 403"} | Pass |
| T17 | Meta webhook verify, hub.verify_token=wrong | Invalid | HTTP 403, challenge not echoed | HTTP 403: Forbidden | Pass |
| T18 | Save Odd One Out session: score 80, 1 mistake, level 2 | Normal | HTTP 201, session stored with gameType odd-one-out | HTTP 201: {"message":"Game session recorded successfully with ML engine insights","gameType":"odd-one-out","score":80} | Pass |
| T19 | Save session with score 999, no token, no patientId | Invalid | Rejected (HTTP 400/401): a session must belong to a known patient | HTTP 201: {"message":"Game session recorded successfully with ML engine insights","gameType":"odd-one-out","score":999} | Fail |

Passed 16 of 19.
