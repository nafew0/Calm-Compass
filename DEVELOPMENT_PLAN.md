# CalmCompass — Updated Development Plan

This plan is aligned to the current repository structure:

- Django backend in `backend/`
- React + Vite frontend in `frontend/`
- Existing auth, admin, Stripe, and bKash boilerplate already present
- Existing content source in `dementia_behavior_decoder_knowledgebase.md`

The MVP focus is the **Behavior Decoder**, supported by a clean caregiver home experience, a usable content admin, and simple utility tools. **Push notifications are explicitly out of scope for the MVP.**

---

## Recommended MVP Scope

### Must ship in MVP
- CalmCompass branding and one-time purchase positioning
- Single-access plan / entitlement gating
- Caregiver quick setup
- Structured knowledge base in PostgreSQL
- Behavior Decoder browse + search + 4-panel response
- Daily Log
- Medication tracking without push reminders
- Mobile-first UX
- Django Admin for content management

### Should ship if time allows
- AI fallback chat with strict usage limits
- PWA installability and offline caching for decoder responses
- PDF export for Daily Log

### Explicitly deferred
- Browser push notifications
- Real-time reminder delivery
- Multi-caregiver collaboration
- Voice input
- Dementia-stage filtering in the user-facing UI

---

## Phase 0 — Boilerplate Refactor & Product Shell (1–2 days)

Goal: Convert the generic SaaS boilerplate into CalmCompass without building feature logic yet.

### Backend
- Audit the existing `accounts` and `subscriptions` apps and keep the working auth/payment flows intact
- Replace the default multi-plan setup with a single CalmCompass access product
- Add a dedicated access helper in `backend/subscriptions/services.py`
  - Example: `LicenseService.has_calm_compass_access(user)`
- Decide how the existing recurring plan model will represent a one-time purchase
  - simplest path: keep one active paid plan and treat access as non-expiring
  - avoid overfitting billing-cycle logic into the rest of the app
- Add caregiver profile fields needed for first-run setup
  - `care_recipient_name`
  - optional future-safe field: `care_relationship`
- Set `SiteSettings.ai_provider` defaults for the planned AI fallback path

### Frontend
- Rebrand the landing, navbar, pricing, and payment success flows to CalmCompass
- Replace the generic pricing page with a single access offer
- Add a post-purchase quick setup screen
  - caregiver name
  - care recipient name
- Replace the placeholder dashboard with the CalmCompass home shell

### Deliverable
- Auth and payment still work
- CalmCompass branding is in place
- A paid user lands in a caregiver-oriented app shell instead of the generic dashboard

---

## Phase 1 — Knowledge Base Data Model & Content Pipeline (2–3 days)

Goal: Turn the markdown knowledge base into structured, queryable content managed from Django Admin.

### New Django app: `knowledgebase`

Suggested files:

```text
backend/knowledgebase/
├── models.py
├── admin.py
├── serializers.py
├── views.py
├── urls.py
├── services.py
├── management/
│   └── commands/
│       └── import_knowledgebase.py
└── migrations/
```

### Models

```python
BehaviorCategory
  id, name, slug, icon, display_order, is_active

Behavior
  id, category_id, title, slug, tags[]
  whats_happening
  what_not_to_do[]
  what_to_say[]
  why_it_works
  common_triggers[]
  bonus_tips[]
  dementia_stage
  is_published
  created_at, updated_at
```

### Important adjustment from the previous plan
- Do not wait for a future JSON/YAML drop
- Use `dementia_behavior_decoder_knowledgebase.md` as the source material already available in the repo
- Build a repeatable import pipeline that converts the markdown content into structured rows
- If markdown parsing becomes brittle, add an intermediate checked-in JSON fixture generated once from the markdown source

### Admin
- Category and behavior CRUD in Django Admin
- Search by title and tags
- Filters for category, published state, and dementia stage
- Ordered categories and clean behavior preview fields

### Deliverable
- The project can import and manage the existing dementia behavior knowledge base in PostgreSQL
- Content editing is possible through Django Admin without code changes

---

## Phase 2 — Behavior Decoder MVP (3–4 days)

Goal: Ship the core caregiver experience first.

### Backend API

Suggested endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/kb/categories/` | List categories with counts |
| `GET /api/kb/categories/:slug/` | Category detail with behaviors |
| `GET /api/kb/behaviors/?search=` | Search and list behaviors |
| `GET /api/kb/behaviors/:slug/` | Full behavior response |

### Backend notes
- Gate endpoints with `LicenseService.has_calm_compass_access`
- Keep search simple and fast
  - start with PostgreSQL `icontains` / indexed search if needed
  - add Postgres full-text search once the basic path is working
- Add basic caching for category and behavior detail responses only after the API is correct

### Frontend
- Add routes for the decoder flow
  - `/decoder`
  - `/decoder/:categorySlug`
  - `/decoder/behavior/:slug`
- Build the response screen around the PRD structure:
  - What's Happening
  - What NOT to Do
  - What to Say Instead
  - Why This Works
- Add optional sections for:
  - Common Triggers
  - Bonus Tips
- Prioritize mobile ergonomics
  - large touch targets
  - high contrast
  - low cognitive load
  - fast back-navigation
- Store the last-viewed behavior for the home screen

### Home screen update
- Primary CTA: "What's happening right now?"
- Secondary cards: Daily Log and Medications
- Last lookup card
- Tip of the day or caregiver reminder

### Deliverable
- A paid caregiver can browse or search a behavior and get a complete, structured response quickly on mobile

---

## Phase 3 — Daily Log (2 days)

Goal: Add lightweight tracking that is useful without making the product feel heavy.

### New Django app: `daily_log`

```python
LogEntry
  id, user, created_at
  moods[]
  linked_behavior (nullable)
  note (max 300 chars, nullable)
```

### API
- `POST /api/log/entries/`
- `GET /api/log/entries/`
- `GET /api/log/summary/?range=week`

### Frontend
- `/log` page
- quick-add entry flow with mood chips
- optional note
- optional behavior link
- simple weekly summary card

### Stretch item
- PDF export can be added here if it is still small enough in scope
- If not, move export to the polish phase

### Deliverable
- Caregivers can record brief mood/behavior snapshots without friction

---

## Phase 4 — Medication Tracker (No Push in MVP) (2–3 days)

Goal: Provide simple medication organization and adherence logging without reminder infrastructure.

### New Django app: `medications`

```python
Medication
  id, user, name, dose, frequency, is_active

MedicationSchedule
  id, medication, time_of_day, days_of_week

MedicationLog
  id, medication, scheduled_for, status, logged_at
```

### MVP behavior
- Caregiver can add medications and schedules
- Caregiver can manually log each dose as:
  - Taken
  - Skipped
  - Refused
- Show upcoming doses in-app
- Show a simple adherence view

### Explicitly not in MVP
- Browser push notifications
- Service worker notification actions
- Background reminder jobs
- Device subscription management

### Deliverable
- Medication management exists as an in-app tracker, with reminder delivery deferred to a later release

---

## Phase 5 — AI Fallback Chat (2–3 days)

Goal: Add AI only as a constrained escape hatch after the static decoder proves insufficient.

### Product rule
- AI is launched only from a behavior detail screen
- No standalone chatbot in primary navigation

### Backend
- Add an `ai_chat` app or a focused module under `knowledgebase`
- Track usage caps per user
- Pass structured context into the model:
  - selected behavior
  - static decoder response
  - caregiver follow-up
- Keep prompts tightly scoped to dementia caregiving support
- Return a clear safety fallback for emergencies

### Frontend
- "This didn't help — ask AI" CTA inside behavior detail only
- Single-turn or lightweight session UI
- Visible remaining query count
- Cap-reached state with helpline information

### Decision still needed
- Lifetime cap vs monthly reset
- Recommendation for MVP: use a simple lifetime cap first unless there is a strong business reason to support resets immediately

### Deliverable
- AI exists as a bounded support layer, not the main product

---

## Phase 6 — PWA, Offline Support & Polish (2 days)

Goal: Make the decoder feel reliable on mobile and usable on weak connections.

### Scope
- Installable PWA shell
- Offline caching for decoder pages and static content already viewed
- Loading states and error boundaries
- Accessibility pass
- Empty states and recovery messaging

### Priority inside this phase
- Cache decoder responses before anything else
- Keep auth/payment endpoints network-only
- Make the home and decoder experience resilient on mobile browsers

### Deliverable
- The core decoder remains usable after initial load, even on unstable connectivity

---

## Phase 7 — QA, Content Validation & Launch Readiness (2–3 days)

Goal: Prepare the app for a real first release with real content and fewer surprises.

### QA
- Walk every category and behavior from admin to frontend
- Verify entitlement gating
- Verify payment success -> access flow
- Verify search behavior on mobile
- Verify Daily Log and Medication Tracker CRUD flows

### Content validation
- Ensure the imported entries map cleanly into the 4-panel decoder format
- Review the quick-reference behaviors and decide whether they launch as full entries or remain admin-draft content
- Add disclaimers and emergency guidance where needed

### Launch prep
- Production env review
- Analytics for key product events
- Error monitoring
- Smoke test on real devices

### Deliverable
- Launch-ready MVP centered on the decoder, with utility tools and no push notification dependency

---

## Cross-Cutting Implementation Notes

| Concern | Approach |
|---|---|
| Access control | Centralize entitlement checks in `LicenseService.has_calm_compass_access` |
| Content source | Treat `dementia_behavior_decoder_knowledgebase.md` as source content until a better editorial workflow is needed |
| Search | Start simple; optimize after the decoder flow is working |
| Admin | Use Django Admin first, not a custom CMS |
| Mobile | Design every core screen for stressed, one-handed use |
| Safety | Add non-medical disclaimer and emergency escalation copy early |
| Testing | Backend tests for models/services, frontend smoke tests for decoder and gated access |

---

## Readiness Assessment

This project is ready to start.

Why:
- The repo already includes a workable Django/React foundation
- Auth, admin, and payments are not theoretical; they already exist
- The domain content already exists in a structured-enough markdown source
- The product can be shipped incrementally, with the Behavior Decoder as the first real milestone

Main implementation risks to manage early:
- repurposing recurring subscription logic into clean one-time access logic
- structuring the markdown knowledge base into maintainable database content
- resisting scope creep around AI and reminders before the decoder experience is strong
