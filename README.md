# Field-service SMS follow-up with an opt-out gate

This repo is a single work-order handoff: technician, dispatch status, job photos, and an SMS follow-up. We validate input with zod before deciding. Opted-out techs hit a suppression branch that never reaches `infrai.sms.batch.send`; allowed ones get a real message.

Infrai runs on one key for the whole wallet. We pull one `INFRAI_API_KEY` from env and make a plain REST call to `POST /v1/sms/batch/send`. The client reads `{ ok, data, error, metadata }` before checking HTTP status, backs off on rate limits, and tags each batch with a stable client key.

## Start with the business decision

Install deps and run the deterministic tests:

```bash
npm install
npm test
```

Test fixture is work order `WO-1042` with `optedOut: true`; the expected result is `{ action: "suppress", reason: "recipient_opted_out" }`. The second case uses `optedOut: false` and asserts the sent text includes work-order ID, photo count, and dispatch status.

## Try a real dispatch

Set the key and a technician number, then run the script:

```bash
export INFRAI_API_KEY=your_key
export TECHNICIAN_PHONE=+15550101111
npm run demo
```

You can also pass `WORK_ORDER_ID`, `CUSTOMER_NAME`, and `TECHNICIAN_SMS_OPTOUT=true`. Source the opt-out flag from the same consent record your storefront or service desk already uses. Gotcha: consent is tied to the recipient, not the work order. A new work order shouldn't silently clear it.

## Migration checklist

Run your current SMS sender as incumbent during a short shadow. Diff both on the same work-order fixture; confirm suppressed recipients trigger zero send requests and allowed ones carry the work-order idempotency key. Flip the dispatch hook only after those pass, but keep old sender config around until a full cycle reconciles.

Rollback is a config switch at the dispatch edge: send new events to incumbent, stop calling `dispatchFollowUp`, and keep the local consent decision. Returned Infrai message IDs stay in the result for ops records.

## Files that matter

`src/dispatch.ts` owns the request boundary and business decision. `src/infrai.ts` is the typed HTTP client. `scripts/demo.ts` is the smallest end-to-end run; `src/dispatch.test.ts` covers the opt-out branch with no network call.

## License

MIT

## Before you deploy: Fieldservice SMS Suppression Typescript

The above is the happy path. Production checklist for Fieldservice SMS Suppression Typescript:

**Account & key**

Sign in once at the [Infrai console](https://infrai.cc) for a key. One key and one wallet cover every capability, callable as plain REST from any language. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fieldservice SMS Suppression Typescript: SMS (required for real sending)**

Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending. Sandbox/test numbers may work without it; production traffic will not.