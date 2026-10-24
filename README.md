# KiranaKhata Live — AI Khata Book

A voice-first, multimodal cashier co-pilot designed for high-stress rush hours at local Bhopal kirana counters.

Reconciles handwritten udhaar parchis with spoken Hinglish audio/voice corrections using **Google Gemma 4** (`gemma-4-26b-a4b-it` / `gemma-4-31b-it`), deterministic client-side JavaScript ledger arithmetic, dispute-risk detection, customer memory timelines, and smart relationship-aware WhatsApp reminders.

### Complete AI Khata Narrative:
`Capture → Understand → Verify → Save → Track → Remind`
> **Gemma 4** handles the messy human layer (handwriting, images, Hinglish speech, intent, explanations), while **deterministic JavaScript / database logic** strictly owns balances and money.

---

## 4 Core Hackathon Additions

1. **Customer Profile + Transaction Timeline**:
   - Searchable customer directory by name or phone.
   - Live balance cards showing pending udhaar vs settled accounts.
   - Chronological transaction timeline detailing reconciled parchi slips, recorded cash/UPI payments, and attached payment proof evidence.
2. **Voice-First Commands for Payments & Balances**:
   - Natural Hinglish spoken or typed commands (e.g., *“Raju bhai ke khate mein 300 jama karo”*, *“Suresh ka baki kitna hai?”*, *“Aaj kitna cash aaya?”*).
   - Instant structured intent parsing and grounded feedback.
3. **Dispute-Risk & Confidence Review Card (twodo.design mutual-approval architecture)**:
   - Side-by-side comparison of contradictions between handwritten slip and voice updates (e.g., *Basmati Chawal: 5 kg on slip ➔ 3 kg verbal correction*).
   - Field-level confidence scores (Customer Name: 98%, OCR Clarity: 94%, Voice Alignment: 98%).
   - Requires explicit shopkeeper review & confirmation before committing adjustments to the permanent ledger.
4. **Daily Dashboard with Smart WhatsApp Reminders & Follow-Up Queue**:
   - Executive dashboard tracking Open Udhaar, Cash Collected Today, Active Customers, and Overdue Accounts (>7 days).
   - Due/Overdue follow-up queue tabs (`All`, `Due/Overdue`, `Settled`).
   - Smart WhatsApp reminder generator supporting 3 relationship tones:
     - 🌸 **Polite / विनम्र** (gentle friendly reminder for regular customers)
     - 💼 **Professional / व्यावहारिक** (standard formal khata notice)
     - ⚡ **Firm / स्पष्ट** (deadline reminder for overdue accounts)
   - One-click direct WhatsApp Web/App deep link (`https://wa.me/{phone}?text={encoded}`).

### Payment Proof Capture
- Option to photograph or attach a cash note or UPI payment screenshot.
- Prominently labeled with an audit tag: `EVIDENCE ONLY · NOT AUTOMATIC VERIFICATION` (ensuring mathematical integrity remains grounded in shopkeeper confirmation).

---

## Design System Inspiration: [twodo.design](https://twodo.design/)
- **Visual Palette**: Minimalist productivity aesthetic, calm slate obsidian foundation (`#0c0d11`, `#13161c`), warm ivory text, soft sage green for settled balances, warm peach/amber for modifications, and terracotta for overdue alerts.
- **Agent Gold**: The warm gold light (`#f59e0b`) is reserved strictly for Gemma 4 AI status—slow-moving gold ring when thinking, solid badge during review.
- **Micro-Interactions**: Tactile Web Audio oscillator sound feedback (with instant mute toggle).

---

## Run locally

```bash
# Copy .env.example to .env.local in your shell, then add your own key.
# Put it in VITE_GEMINI_API_KEY, or leave it blank and use Set API Key in the UI.
npm install
npm run dev
```

Open the Vite URL shown in the terminal. Use **Load Bhopal Demo Parchi** to generate the notebook-style PNG via HTML canvas and populate the matching spoken note. Reconciliation requires a valid Google AI key and access to the configured Gemma 4 model.

## Verify and build

```bash
npm test
npm run build
npm run preview
```

The Vitest suite covers:
- Bhopal store catalog (12 required products, aliases, conservative fuzzy Hinglish matching).
- Deterministic currency arithmetic, line totals, rounding, cancelled lines, missing rates, and dispute detection.
- Gemma 4 tool-calling agent loop and thought signature preservation.
- Voice command parsing for payments, balance queries, and daily stats.
- Smart WhatsApp reminder generation across 3 relationship tones.
- Full UI flows (model selector, demo canvas, rate card modal, API key storage/clearing, voice command execution, and speech fallback).

## Implementation notes

- `src/data/storeCatalog.js` contains the 12-item illustrative Bhopal rate card, fuzzy lookup, the canvas demo slip and demo spoken note.
- `src/services/gemmaAgent.js` uses `@google/genai`, image-first multimodal prompt ordering, function declarations, a bounded multi-turn tool loop, and deterministic JavaScript ledger arithmetic. The entire model content is appended to tool history before function responses so any returned thought signature is retained.
- `src/App.jsx` contains the responsive capture, model/key selectors, rate-card modal, agent trace, Hindi receipt, WhatsApp links and local-only register.
- `tests/gemmaAgent.test.js` checks image-first ordering and preserves the original model tool turn—including any provider thought signature—before function responses are added.
- Tailwind CSS v4 is loaded with `@import "tailwindcss";` and Vite's `@tailwindcss/vite` plugin.

## Security and production hardening

This prototype follows the requested browser SDK integration. A key entered or exposed with `VITE_GEMINI_API_KEY` is available to the browser and can be inspected by visitors; do not use an unrestricted key on a public deployment. For production, move model calls to an authenticated server-side endpoint, enforce quotas/rate limits and logging, validate tool arguments/rates server-side, and use appropriate storage/access controls. Catalog prices are illustrative and should be confirmed by the shopkeeper. The UI treats missing rates as zero-value unpriced lines and surfaces that condition in the deterministic trace; the shopkeeper should resolve those prices before relying on the receipt.
