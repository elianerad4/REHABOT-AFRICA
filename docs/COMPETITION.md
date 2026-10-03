# Competition Positioning & Evidence

## Project description (concise)

**Rehabot Continuity Engine** — a multi-channel rehabilitation-continuity engine.
Rehabot already sends WhatsApp reminders and captures adherence and pain. The Textify
integration adds a reliable SMS channel that (1) falls back when WhatsApp fails,
(2) nudges patients who haven't responded, and (3) collects pain scores over SMS into
the same clinical record. One unified timeline shows the physiotherapist every
touchpoint across both channels.

The innovation is not "SMS for physiotherapy" — it is continuity: connecting
physiotherapists, patients, reminders, adherence, pain monitoring and follow-up across
whatever channel actually reaches the patient.

## Claims we will NOT make

No unsupported efficacy claims (e.g. "SMS increases adherence by X%") unless real
evidence is collected or a credible source is cited. We describe the mechanism, not
fabricated outcomes.

## Architecture diagram

```
Physio (React/Vite)
      │ Supabase JS (RLS)
      ▼
Supabase Postgres ── patients / pain_logs / adherence_logs / communication_logs
      │                     │
      │ service role        │ service role
      ▼                     ▼
send-daily-reminders ── textify-sms / textify-webhook / sms-inbound
      │                     │
   Meta WhatsApp        Textify Africa (SMS + status webhooks)
   (primary)            (fallback / secondary)
```

## Evidence checklist

Collect genuine, verifiable evidence (no fabricated traffic):

- [ ] `POST /messages` send response (screenshot / captured JSON) — successful SMS
- [ ] Scheduled SMS request + response
- [ ] Delivery-status webhook event (`delivered` / `undelivered` / `failed`)
- [ ] Fallback event: WhatsApp failure → SMS fallback in `communication_logs`
- [ ] Inbound SMS reply → `pain_logs` row (score 0–10)
- [ ] Dashboard screenshot: Continuity Engine timeline + summary
- [ ] Patient page screenshot: Communication tab
- [ ] `node --test` output (19 passing tests)
- [ ] Architecture diagram (this file)

## Example payloads (documented reference — replace with real captures)

Send SMS request:

```json
{
  "sender_name": "REHABOT",
  "is_scheduled": false,
  "messages": [{ "receiver": "0712345678", "content": "Hello Asha. Your physiotherapy exercises are due today." }]
}
```

Status webhook (expected shape — confirm against the portal):

```json
{ "id": "msg_123", "status": "delivered" }
```

## Screenshots to submit

1. Dashboard — Continuity Engine section (summary chips + timeline).
2. Patient — Communication tab (send SMS follow-up button + history).
3. `communication_logs` table in Supabase Studio (SMS + WhatsApp rows).
4. Textify portal — sent/delivered messages (if available).
5. Test output.
