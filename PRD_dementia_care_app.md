# Product Requirements Document
## CalmCompass — Dementia Behavior Decoder & Care Companion
**Version:** 1.0  
**Status:** Draft  
**Stack:** Django · React · PostgreSQL  

---

## 1. Overview

CalmCompass is a mobile-friendly web app for family and professional dementia caregivers. It replaces a traditional ebook with an interactive, structured tool. The core product is a **static knowledge-base-driven Behavior Decoder** — caregivers pick or describe a behavior and instantly receive expert-backed guidance. AI is available as a fallback when the static answer isn't enough.

**One-time purchase: $7–$10.** Auth and payment are already handled by the existing boilerplate.

---

## 2. Goals

- Give caregivers instant, calm, actionable guidance during behavioral episodes
- Replace a $15 dementia caregiving ebook with a more useful, interactive experience
- Keep the product simple enough to use under stress, in the middle of the night
- Use AI only as a secondary escape hatch — not the main product

---

## 3. Non-Goals

- Not a care coordination or family communication platform
- Not a comprehensive AI chatbot
- Not a medical diagnosis or clinical tool
- No user-generated content or community features (v1)

---

## 4. Users

| Type | Description |
|---|---|
| Family caregiver | Adult child or spouse caring for a loved one at home |
| Professional caregiver | Home health aide or nursing home staff needing quick reference |

Both users need answers fast, with minimal friction, often on mobile.

---

## 5. Features

### 5.1 Behavior Decoder *(Core feature)*

The primary product. Static responses powered by a structured knowledge base stored in the database.

**Flow:**

```
Home → "What's happening?" 
  → Browse categories OR type/search a behavior
  → Select a behavior
  → View structured response (4 panels)
  → [If still struggling] → Open AI Chat
```

**Response structure (4 panels):**

| Panel | Content |
|---|---|
| 🧠 What's Happening | Plain-language explanation of why the behavior occurs |
| 🚫 What NOT to Do | 2–4 specific don'ts |
| 💬 What to Say Instead | 2–4 exact scripts the caregiver can use immediately |
| 💡 Why This Works | One short sentence explaining the psychology |

**Knowledge base structure (PostgreSQL):**

```
BehaviorCategory
  - id, name, icon, display_order

Behavior
  - id, category_id, title, slug, tags[]
  - whats_happening (text)
  - what_not_to_do (text[])
  - what_to_say (text[])
  - why_it_works (text)
  - bonus_tips (text[])        ← optional, collapsible
  - dementia_stage (all/early/middle/late)
```

**Search:** Simple keyword search against behavior titles and tags. No AI needed — fast and offline-capable.

**Categories (initial set, expandable):**
Repetition · Aggression & Agitation · Suspicion & Accusations · Personal Care Resistance · Wandering · Sleep & Sundowning · Eating & Medication · Communication Difficulties · Emotional Outbursts · Identity & Confusion

---

### 5.2 AI Fallback Chat *(Secondary feature)*

Triggered **only** from inside a Behavior Decoder result via a "This didn't help — ask AI" button. Not accessible from the main navigation.

**Rules:**
- Each user gets a fixed number of AI queries included in the one-time purchase (e.g., 20 queries/month or a lifetime cap of 100 — TBD based on API cost analysis)
- Query counter visible to the user ("12 AI chats remaining")
- When the cap is hit, show a friendly message and link to the 24/7 Alzheimer's helpline
- Context passed to AI: the behavior title + the static response the user already saw
- System prompt constrains AI to dementia caregiving scope only
- No conversation history stored beyond the current session (keeps it simple, reduces storage)

---

### 5.3 Daily Log *(Utility feature)*

Minimal-friction daily behavior and mood tracking.

**What a log entry contains:**
- Date/time (auto)
- Mood chips (tap to select): Calm · Confused · Agitated · Happy · Anxious · Aggressive
- Optional: linked behavior (did a Decoder lookup today?)
- Optional: free-text note (max 300 chars)

**Views:**
- Log list (most recent first)
- Simple weekly summary: which moods appeared most, any behavior lookups

**Export:** One-click PDF summary for doctor visits (name, date range, mood counts, notes).

---

### 5.4 Medication Reminders *(Utility feature)*

Simple, not comprehensive. Designed for caregivers managing the patient's medications.

- Add medication: name, dose, time(s), frequency
- Push notification reminders (browser push / PWA)
- Log each dose as: Taken / Skipped / Refused
- Weekly adherence view

---

## 6. User Flow (First Visit)

```
Landing page
  → "Get Access" → Payment ($7–$10, handled by boilerplate)
  → Quick setup (2 fields: your name, care recipient's name)
  → Home screen
```

**Home screen layout:**

```
┌─────────────────────────────────────┐
│  🧠  What's happening right now?    │  ← Primary CTA
│       [Open Behavior Decoder]        │
├────────────────┬────────────────────┤
│  📓 Daily Log  │  💊 Medications    │
├────────────────┴────────────────────┤
│  Last lookup: "Refusing to shower"  │  ← Quick re-access
│  💡 Tip of the day                  │
└─────────────────────────────────────┘
```

---

## 7. Knowledge Base (Content)

The knowledge base is the product's core value. It does **not** live in flat files — it lives in PostgreSQL so it's queryable, searchable, and expandable without code changes.

**Content source:** Research synthesis from clinical dementia care literature (Teepa Snow's Positive Approach to Care, Alzheimer's Association guidelines, peer-reviewed nursing studies). Content will be researched and authored separately before development begins.

**Initial target:** 40–60 behaviors across 10 categories.

**Admin interface:** Use Django Admin to manage behaviors and categories. No custom CMS needed.

---

## 8. Technical Notes

| Concern | Decision |
|---|---|
| Auth & payments | Already handled by boilerplate — no new work |
| PWA | Implement service worker for offline access to cached behavior responses |
| AI provider | Anthropic Claude API (constrained system prompt) |
| AI cost control | Query cap per user enforced server-side in Django; cached at the model level |
| PDF export | WeasyPrint or ReportLab for daily log export |
| Push notifications | Django + Web Push (django-webpush) |
| Search | PostgreSQL full-text search on behavior title + tags — no Elasticsearch needed |
| Mobile | React, mobile-first layout, large touch targets, high-contrast cards |

---

## 9. Out of Scope for v1

- Multi-caregiver / family sharing
- Dementia stage selector (all responses default to "all stages" in v1; add stage filtering in v2)
- Voice input
- Multilingual support
- Caregiver wellness check-ins
- 2 AM dark mode
- Behavior pattern AI analysis

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Behavior Decoder used per session | ≥ 1 lookup |
| AI fallback rate | < 30% of Decoder sessions (high = knowledge base needs improvement) |
| Daily log entries per active user | ≥ 3 per week |
| Support requests | < 5% of users in first month |

---

## 11. Open Questions

1. **AI query cap:** Lifetime cap (e.g. 100) or monthly reset (e.g. 20/month)? Monthly reset may justify a small upsell tier later.
2. **Behavior stages:** Include dementia stage filtering in v1, or defer to v2?
3. **App name:** CalmCompass is a placeholder — confirm final name before launch.

---

*Next step: Knowledge base research and content creation for 40–60 dementia behaviors.*
