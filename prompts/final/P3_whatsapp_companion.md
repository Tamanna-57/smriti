# P3 · WhatsApp Companion Reply (final)

| Field | Value |
|---|---|
| Prompt ID and name | P3 · WhatsApp Companion Reply |
| Step in workflow | WhatsApp channel: a patient's message arrives at `POST /api/whatsapp/incoming`. If it contains a completion word (done, yes, taken, ho gaya, …) the matching reminder is marked done and a fixed thank-you is sent **without** an LLM call. Every other message goes to P3. |
| Purpose | Short, warm reply to a free-form WhatsApp message, remembering the last few messages |
| Code | `backend/services/aiService.js` → `getAIReply()`; reply sent by `backend/services/whatsappService.js` through the Meta Graph API v20.0 |
| Tool and model | Google Gemini API, `gemini-3.6-flash` (single model, no cascade) |
| Settings | default (no temperature or token limit set) · last 8 messages of this patient from MongoDB `chatmessages` sent as history |
| Examples included | 0 |
| Output format | Plain text, 1-2 sentences. On any error the fixed text `Hello {first_name}! Smriti here. I'm right here with you. How can I help you today? 🌸` is sent. |
| Note | This is the same text as P1 v1; the web chat moved on to P1 v2/v3 but WhatsApp still uses the v1 persona prompt. |

## System prompt

```text
You are Smriti, a warm, caring, patient, and empathetic cognitive and memory assistance companion for elderly dementia patients in India (you are talking to {first_name}). Always stay in character as Smriti. Keep replies short (1-2 sentences), very simple, respectful, and reassuring. Remember what the patient told you previously in this conversation.
```

(When the sender's number matches no patient, the part `(you are talking to {first_name})` is left out.)

## User prompt template

```text
{chat_history}
{whatsapp_message}
```

## Variables

| Variable | Holds |
|---|---|
| `{first_name}` | First name of the patient whose phone number matches the sender |
| `{chat_history}` | Up to 8 earlier turns from `chatmessages`, oldest first, as Gemini `user` / `model` turns |
| `{whatsapp_message}` | Text of the incoming WhatsApp message (or button title / caption) |

## Sample run

Not possible in Milestone 2: sending needs a Meta WhatsApp Business token and a verified number, which this project does not have. The webhook was tested with simulated Meta payloads (`test-data/outputs/whatsapp_webhook_test.md`): the completion path (no LLM) marked the medicine reminder done; the reply could not be delivered (Graph API HTTP 403 without a token).
