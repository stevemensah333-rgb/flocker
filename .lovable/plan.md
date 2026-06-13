# WhatsApp Farm Assistant

Lets farmers run their farm by chatting (text or voice) with a WhatsApp number, plus automated alerts and an evening summary. Built on Meta WhatsApp Business Cloud API.

## How it works (farmer's view)

1. In **Settings → WhatsApp Assistant**, the farmer taps "Connect WhatsApp". The app shows a 6-digit code.
2. They send that code to the farm's WhatsApp number. This binds their WhatsApp number to their account.
3. After that they can just chat:
   - "5 birds died today" → logs a mortality event
   - "Bought 10 bags of feed for GHS 4,000" → logs a feed purchase
   - "Sold 150 broilers at GHS 55 each" → logs a sale
   - "How many birds do I have left?" / "What's my profit?" → answered from their data
   - "What causes green droppings?" → AI vet/farm advice
   - A **voice note** ("Three birds died, I bought five bags of feed, vaccinated batch two") → all events extracted & logged, with a confirmation reply.
4. Each evening they get a daily summary; they get alerts when thresholds are crossed.

## Architecture

```text
Meta WhatsApp  ──(webhook)──>  /api/public/whatsapp/webhook
                                     │
                                     ├─ verify signature (X-Hub-Signature-256)
                                     ├─ resolve farmer by phone (whatsapp_links)
                                     ├─ voice? download media → ElevenLabs STT → text
                                     ├─ AI intent+extraction (Lovable AI, structured)
                                     │     ├─ record_events  → insert flock_events / egg_records
                                     │     ├─ query          → read + format answer
                                     │     └─ advice         → AI free-form reply
                                     └─ send reply via Meta send API

pg_cron ──> /api/public/whatsapp/cron  (alerts every hour, summary daily)
```

## Database (one migration)

- `whatsapp_links` — binds a WhatsApp phone to an account.
  - fields: `owner_id`, `farm_id`, `phone` (E.164, unique), `verified` (bool), `created_at`
- `whatsapp_link_codes` — short-lived one-time codes.
  - fields: `owner_id`, `farm_id`, `code` (6 digits), `expires_at`, `consumed` (bool)
- `whatsapp_messages` — audit log of inbound/outbound for transparency/debug.
  - fields: `owner_id`, `farm_id`, `direction` ('in'/'out'), `phone`, `body`, `intent`, `raw` (jsonb)
- `alert_settings` — per-farm thresholds + opt-ins.
  - fields: `owner_id`, `farm_id` (unique), `feed_stock_kg_threshold`, `daily_mortality_threshold`, `monthly_budget`, `daily_summary_enabled`, `alerts_enabled`
- Add `whatsapp_opt_in` / nothing else to existing tables.

All tables: GRANT to authenticated + service_role, RLS scoped to `owner_id = auth.uid()`. The webhook/cron run with the service-role admin client (no user session), so writes there bypass RLS intentionally and always set `owner_id` from the resolved link.

## Server code

- `src/routes/api/public/whatsapp/webhook.ts` — GET (Meta verify challenge) + POST (messages). Verifies `X-Hub-Signature-256` with app secret. Handles text + audio. Loads `supabaseAdmin` inside the handler.
- `src/routes/api/public/whatsapp/cron.ts` — POST, called by pg_cron with `apikey`. Runs alert checks and (when `type=summary`) the evening summary.
- `src/lib/whatsapp/meta.server.ts` — send message, download media helpers (Meta Graph API).
- `src/lib/whatsapp/stt.server.ts` — ElevenLabs `scribe_v2` transcription of audio buffer.
- `src/lib/whatsapp/brain.server.ts` — AI: classify intent + extract structured events (Lovable AI, `Output.object` with a small schema), build query answers, build advice.
- `src/lib/whatsapp/link.functions.ts` — `createServerFn`s for the Settings UI: generate code, list/unlink connected numbers.

## Frontend

- `src/routes/_authenticated/settings.tsx` — add a "WhatsApp Assistant" card: connect flow (show code + the number to text), connected status, thresholds form (alert_settings), daily-summary toggle.

## Required secrets / setup (Meta)

I'll request these via the secrets tool when we reach that step:
- `META_WHATSAPP_TOKEN` (permanent access token)
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_WHATSAPP_VERIFY_TOKEN` (we choose this; entered into Meta webhook config)
- `META_WHATSAPP_APP_SECRET` (for signature verification)

ElevenLabs is added via its connector (`ELEVENLABS_API_KEY`). Lovable AI (`LOVABLE_API_KEY`) is already present.

The Meta webhook callback URL to paste into the Meta dashboard will be:
`https://poultryos.lovable.app/api/public/whatsapp/webhook`

## Build order

1. Migration (tables + RLS + grants).
2. ElevenLabs connector + request Meta secrets.
3. Server helpers (meta, stt, brain).
4. Webhook + cron routes.
5. Settings UI (link flow + thresholds).
6. pg_cron schedule (hourly alerts, 6pm summary) via insert tool.
7. Test webhook with a simulated payload.

## Notes / scope

- "Link messages to the correct farm" = via verified `whatsapp_links`. Unknown numbers get a polite "send your link code" reply.
- Profit estimate reuses egg/sale revenue minus logged costs (feed + events), consistent with existing reports.
- Voice supports the multi-event extraction feature you highlighted.
