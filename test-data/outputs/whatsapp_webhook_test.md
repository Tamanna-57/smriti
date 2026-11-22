# WhatsApp webhook test (simulated Meta payloads)

Run at 2026-11-22T14:40:08.357Z. Replies are generated but cannot be delivered without WHATSAPP_TOKEN (Graph API answers HTTP 403); see backend log.

| Test | Input | Type | Expected | Actual | Pass / Fail |
|---|---|---|---|---|---|
| W1 | WhatsApp from 919435012345: 'Done, I took my medicine' | Normal | HTTP 200; pending medicine reminder marked acknowledged | HTTP 200; "Night Routine & Rest" acknowledged: false → true | Pass |
| W2 | Same message from unknown number 15550001111 | Edge | HTTP 200 (Meta needs it); no patient's reminders change | HTTP 200; Ramesh's medicine reminders unchanged: true | Pass |
