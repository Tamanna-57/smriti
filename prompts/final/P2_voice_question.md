# P2 · Voice Question: transcribe and reply (final)

| Field | Value |
|---|---|
| Prompt ID and name | P2 · Voice Question |
| Step in workflow | Same step as P1, used when the patient taps the microphone instead of typing |
| Purpose | Turn the patient's spoken question (audio) into text and answer it in one Gemini call |
| Code | `backend/services/patientChatService.js` (branch `if (audioData)`); frontend `frontend/src/components/patient/PatientChatbot.jsx` records with MediaRecorder and sends base64 audio |
| Tool and model | Google Gemini API, same cascade as P1 (`gemini-3.5-flash-lite` → `gemini-3.5-flash` → `gemini-flash-latest`); audio sent as `inlineData` (`audio/webm` by default) |
| Settings | temperature 0.7 · maxOutputTokens 350 · last 6 chat turns as history |
| System prompt | The P1 system prompt, filled the same way (see `prompts/final/P1_patient_companion_chat.md`) |
| Examples included | 0 |
| Output format | Two labelled lines, which the server splits:<br>`TRANSCRIPTION: <what the patient said>`<br>`REPLY: <answer in the patient's language>` |

## System prompt

Same as P1 (full text in `prompts/final/P1_patient_companion_chat.md`).

## User prompt template

The user turn has two parts: the audio recording, then this text.

```text
[audio part: {audio_base64} with mimeType {mime_type}]

Please transcribe my spoken words accurately, and then provide a warm, empathetic response as my memory companion Smriti according to your system instructions. Format your output strictly as:
TRANSCRIPTION: <exact transcription of what I said>
REPLY: <your warm response to me in {preferred_language}>
```

## Variables

| Variable | Holds |
|---|---|
| `{audio_base64}` | Base64 of the recording made in the browser |
| `{mime_type}` | Recording type from the browser, default `audio/webm` |
| `{preferred_language}` | Patient's language, e.g. `Assamese` |
| P1 variables | Everything listed in P1, used in the system prompt |

## Parsing

If the reply contains both `TRANSCRIPTION:` and `REPLY:`, the text is split on `REPLY:`; the first part becomes `transcription`, the second `reply`. Otherwise the whole text is used as the reply.

## Sample run

Not run in Milestone 2: a headless browser has no microphone, and the test harness sends text only. Listed as a known limitation; planned for Milestone 3 with recorded test clips.
