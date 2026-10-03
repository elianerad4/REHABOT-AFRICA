# Competition Evidence

Place genuine, verifiable evidence of the Textify integration here before submission.
Do not fabricate traffic or manipulate usage statistics.

## Files to add

- `sms-send-success.json` — a real `POST /messages` response showing a successful send
- `sms-scheduled.json` — a real scheduled-SMS request/response
- `webhook-delivered.json` — a captured delivery-status webhook payload
- `webhook-failed.json` — a captured failed/undelivered webhook payload
- `fallback-event.json` — a `communication_logs` row where channel=sms after a WhatsApp failure
- `pain-score-sms.json` — a `pain_logs` row written from an SMS reply
- `dashboard-continuity.png` — screenshot of the Dashboard → Continuity Engine section
- `patient-communication.png` — screenshot of the Patient → Communication tab
- `supabase-communication-logs.png` — `communication_logs` in Supabase Studio
- `test-results.txt` — output of `node --test tests/textify.test.mjs`

## Test command

```bash
cd REHABOT && node --test tests/textify.test.mjs
```

## Architecture diagram

See `docs/COMPETITION.md`.

## Checklist

- [ ] Successful SMS send captured
- [ ] Scheduled SMS captured
- [ ] Delivery-status webhook (delivered) captured
- [ ] Failed-delivery webhook captured
- [ ] Fallback event captured
- [ ] SMS pain-score event captured
- [ ] Dashboard screenshot
- [ ] Patient communication screenshot
- [ ] Test results attached
