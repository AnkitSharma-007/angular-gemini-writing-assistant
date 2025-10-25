# AI‑Powered Writer (Grammar Assistant)

A lightweight Angular app that uses Google Gemini (2.5 Flash) to provide real‑time grammar corrections as you type.

## Features

- Grammar‑only suggestions (1–5 per request)
- Debounced input (500 ms) to minimize API calls
- Token usage tracking (input/output/total, request count)
- Quick settings: API key + auto‑suggestions (persisted locally)
- Clean, responsive UI with apply/dismiss for each suggestion

## Quick start

1. Install dependencies

   ```bash
   npm install
   ```

2. Run the app

   ```bash
   npm start
   ```

   Open http://localhost:4200

3. Configure AI
   - Click ⚙️ Settings
   - Enter your Google Gemini API key (stored locally)
   - Toggle Auto‑suggestions as needed

## How to use

- Type in the editor; up to 5 grammar suggestions appear in the panel
- Click Apply to insert a fix (uses originalText when available)
- Click Dismiss to remove a suggestion
- View token usage in Settings; reset as needed

## Configuration

- API key: via Settings (localStorage)
- Model/HTTP/timeouts: provided via DI tokens in `app.config.ts`:
  - `MODEL_ID`, `API_BASE`, `TIMEOUT_MS`, `MAX_OUTPUT_TOKENS`
- Responses are JSON‑only with a strict schema; thinking budget is set to 0

### Overriding DI tokens (example)

Edit `src/app/app.config.ts` to override defaults:

```ts
import { ApplicationConfig } from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import { API_BASE, MODEL_ID, TIMEOUT_MS, MAX_OUTPUT_TOKENS } from "./shared/config.tokens";

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), { provide: MODEL_ID, useValue: "models/gemini-2.5-flash" }, { provide: API_BASE, useValue: "https://generativelanguage.googleapis.com/v1beta" }, { provide: TIMEOUT_MS, useValue: 10000 }, { provide: MAX_OUTPUT_TOKENS, useValue: 256 }],
};
```

## Tech notes

- Angular 20+ with Signals and Effects
- HttpClient with timeout and robust error handling
- Strict TypeScript models; schema‑trusted parsing
- `takeUntilDestroyed` for cleanup; debounce via setTimeout in an effect
- Settings persistence via `SettingsService`

## Troubleshooting

- Invalid or missing API key
  - Symptom: Inline notice appears prompting to update API key
  - Fix: Open Settings (⚙️), enter a valid key
- Rate limited (429)
  - Symptom: Suggestions pause after many rapid requests
  - Fix: Wait briefly; reduce typing bursts; keep debounce at 500 ms
- Network/timeouts
  - Symptom: “Request timed out” or “Network error”
  - Fix: Check connectivity; increase `TIMEOUT_MS` via DI token if needed
- Empty suggestions
  - Symptom: No cards shown despite valid key
  - Notes: The app requests grammar fixes only and returns up to 5; no errors may simply mean no grammar issues

## Scripts

- `npm start` — Dev server
- `npm run build` — Production build
- `npm test` — Unit tests

## Privacy

- API key is stored locally in your browser
- Requests go directly to Google Gemini; no app‑hosted backend
- No analytics or third‑party data collection

## License

MIT
