# Rehabot × Textify Africa — Continuity Engine

## What Textify does inside Rehabot

Rehabot is a WhatsApp-first physiotherapy follow-up platform. WhatsApp is the rich
channel: it carries structured reminder templates, exercise videos, and AI-assisted
conversation.

Textify adds a **secondary, reliable SMS channel**. The **Rehabot Continuity Engine**
uses SMS when WhatsApp is not the right tool for the job:

1. **Fallback** — when a WhatsApp reminder cannot be delivered at all, the same
   reminder goes out by SMS so the patient is never left without their exercise plan.
2. **No-response nudge** — if a patient has not replied a configurable time after
   their reminder, Rehabot sends a short SMS check-in.
3. **SMS pain-score collection** — patients who reply by SMS with a number (0–10)
   have their pain recorded into the exact same `pain_logs` system the WhatsApp flow
   uses.
4. **Manual SMS follow-up** — a physio can send an SMS follow-up from the patient
   page.

The innovation is **not** "SMS for physiotherapy". It is a multi-channel
rehabilitation-continuity engine that connects physiotherapists, patients, reminders,
adherence, pain monitoring and clinical follow-up.

## Why SMS alongside WhatsApp

- WhatsApp template delivery can be unavailable (templates pending approval, the
  24-hour customer-service window closing, network/provider failures).
- Some patients keep SMS as their most reliable channel.
- SMS is a lower-cost, high-deliverability path for short, urgent nudges.
- The two channels share one clinical timeline, so the physiotherapist sees a single
  continuity view regardless of channel.

## Architecture

```
                       ┌───────────────────────────────────────────┐
                       │              Rehabot (React/Vite)         │
                       │   Dashboard / PatientDetail / Reports     │
                       └───────────────┬───────────────────────────┘
                                       │ Supabase JS (RLS: physio/clinic/admin)
                                       ▼
                 ┌─────────────────────────────────────────────┐
                 │              Supabase (Postgres)            │
                 │  patients, pain_logs, adherence_logs,       │
                 │  message_logs, communication_logs, RLS      │
                 └───────┬───────────────────┬─────────────────┘
                         │ service role      │ service role
          ┌──────────────▼─────┐   ┌─────────▼──────────────┐
          │ send-daily-reminders│   │  textify-sms / webhook │
          │  (hourly cron)      │   │  / sms-inbound (Deno)  │
          └──────┬──────────────┘   └─────────┬──────────────┘
                 │ Meta WhatsApp              │ Textify Africa API
                 │ (primary)                  │ (SMS + status webhooks)
                 └────────────────────────────┘
```

### Edge Functions

| Function | Auth | Purpose |
| --- | --- | --- |
| `send-daily-reminders` | `CRON_SECRET` header | Daily reminder; WhatsApp primary, Textify SMS fallback + no-response nudge |
| `textify-sms` | JWT (`verify_jwt=true`) | Send/schedule SMS, list/get messages (admin) |
| `textify-webhook` | `TEXTIFY_WEBHOOK_SECRET` | Delivery-status callbacks (sent/delivered/undelivered/failed) |
| `sms-inbound` | `TEXTIFY_WEBHOOK_SECRET` | Inbound SMS replies → pain score / patient response |

### Shared modules (`supabase/functions/_shared`)

- `textify.ts` — Textify API client (send/schedule/get/list) + typed errors.
- `phone.ts` — Tanzanian phone normalisation/validation.
- `sms-templates.ts` — reusable English/Swahili templates, 160-char truncation, pain-score parsing.
- `sms-core.ts` — status progression, webhook payload validation, fallback decision, content validation.

## Security

- `TEXTIFY_API_KEY` lives **only** in Supabase Edge Function secrets (`Deno.env`).
  It is never present in the React bundle or client code.
- The frontend reads `communication_logs` through Supabase RLS; a physiotherapist
  can only see communication for patients they own, patients in their clinic, or
  (as an admin) everything.
- Webhooks are gated by `TEXTIFY_WEBHOOK_SECRET`. Set `TEXTIFY_WEBHOOK_ENFORCE=true`
  to hard-reject calls with a missing/mismatched secret (default is fail-open with
  logging, matching the existing `handle-inbound` convention).
- Phone numbers are validated before any send; provider errors are mapped to safe
  codes and never surfaced verbatim to patients.

## Database changes

New table `public.communication_logs` (see
`supabase/migrations/20261003000000_communication_logs_and_textify.sql`):

- `channel` (`whatsapp` | `sms`), `provider` (`meta` | `textify`),
  `message_type`, `status`, lifecycle timestamps, `response`/`response_at`,
  and a unique `idempotency_key` for deduplication.
- Indexed on patient, clinic, status, channel, provider message id, message type.
- RLS via a new `can_access_patient(uuid)` SECURITY DEFINER helper.

Also widens `pain_logs.score` to `0–10` so SMS can record "0 = no pain"
(backward compatible; the WhatsApp flow still writes 1–10).

## Webhooks

`textify-webhook` matches the provider message id back to `communication_logs` and
**only moves status forward** (`scheduled → sending → processing → sent →
delivered → undelivered/failed`). A replayed or out-of-order webhook therefore cannot
downgrade a delivered message. Unknown message ids are logged and ignored.

## Fallback logic

Two triggers, both deduplicated per patient/day via `idempotency_key`:

1. **Send failure** — if the WhatsApp template **and** free-form text both fail, the
   exercise reminder is sent by SMS (`shouldFallbackSms` reason `whatsapp_send_failed`).
2. **No-response timeout** — after `FALLBACK_AFTER_MINUTES` (default 120), a patient
   who has not replied gets one SMS nudge (`no_response_timeout`).

"No WhatsApp response" is treated only as a *nudge*, never as proof of non-delivery —
delivery is tracked separately by Meta/Textify status callbacks.

## Patient workflow

1. Physio registers patient (WhatsApp number, reminder time, programme).
2. Daily cron sends the WhatsApp reminder.
3. If WhatsApp fails → Textify SMS fallback.
4. If no response after the threshold → SMS nudge.
5. Patient replies by SMS with `4` → recorded in `pain_logs` (0–10) + `communication_logs`.
6. Physio sees the whole timeline in **Dashboard → Continuity Engine** and
   **Patient → Communication**.

## Configuration (environment / secrets)

Set these as Supabase Edge Function secrets (`supabase secrets set NAME=VALUE`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `TEXTIFY_API_KEY` | yes | Textify bearer token (never in client code) |
| `TEXTIFY_BASE_URL` | no | Default `https://portal.textify.africa/api/v1` |
| `TEXTIFY_DEFAULT_SENDER` | no | Must be an **approved** sender (default `Textify`; request `REHABOT` for branding) |
| `TEXTIFY_WEBHOOK_SECRET` | yes | Shared secret for webhook auth |
| `TEXTIFY_WEBHOOK_ENFORCE` | no | `true` to hard-reject unauthenticated webhooks |
| `FALLBACK_AFTER_MINUTES` | no | No-response nudge threshold (default `120`) |

## Testing locally

```bash
# frontend
cd REHABOT && npm install && npm run dev
npm run lint && npm run build

# unit tests (Node ≥ 23.6, uses native type stripping)
node --test tests/textify.test.mjs
```

Use test phone numbers only (never real patient data).

## Deploy

```bash
supabase link --project-ref <your-ref>
supabase db push              # applies the migration
supabase functions deploy textify-sms
supabase functions deploy textify-webhook
supabase functions deploy sms-inbound
supabase functions deploy send-daily-reminders
supabase secrets set TEXTIFY_API_KEY=... TEXTIFY_WEBHOOK_SECRET=... FALLBACK_AFTER_MINUTES=120
```

Then point Textify's status webhook at
`https://<ref>.supabase.co/functions/v1/textify-webhook` and the inbound SMS webhook
at `https://<ref>.supabase.co/functions/v1/sms-inbound`.

## Reproduce the demo

See `docs/DEMO_SCRIPT.md`.
