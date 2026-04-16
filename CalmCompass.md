# CalmCompass — Project Report

## What It Is

CalmCompass is a mobile-friendly web app that helps families and professional caregivers look after loved ones with dementia. Think of it as a calm, always-available guide you can pull out of your pocket during a stressful moment — day or night — to get instant, expert-backed advice.

It replaces a traditional caregiving ebook with something interactive, searchable, and much faster to use when you actually need help.

---

## What It Does (Features)

### 1. Behavior Decoder (the heart of the app)
When a loved one does something confusing or upsetting (refusing to shower, becoming aggressive, repeating questions, wandering), the caregiver picks or searches the behavior and instantly sees four clear panels:

- **What's Happening** — why the behavior is occurring, in plain language
- **What NOT to Do** — common mistakes to avoid
- **What to Say Instead** — exact phrases the caregiver can use right away
- **Why This Works** — a short explanation of the psychology behind it

Behaviors are grouped into easy categories like *Aggression*, *Sleep & Sundowning*, *Suspicion*, *Wandering*, and *Personal Care Resistance*.

### 2. AI Helper (backup only)
If the built-in guidance isn't quite enough, the caregiver can tap "Ask AI" for a more tailored answer. This is a safety net, not the main product — each user gets a limited number of AI questions included with their purchase.

### 3. Daily Log
A quick way to track the loved one's mood and behavior each day. Just tap a chip (Calm, Confused, Agitated, Happy, Anxious, Aggressive) and optionally add a note. You can export a simple PDF summary to bring to doctor visits.

### 4. Medication Reminders
Add medications, get reminders at the right time, and log each dose as *Taken*, *Skipped*, or *Refused*. A weekly view shows how well the schedule was followed.

### 5. One-Time Purchase
Users pay once (around $7–$10) and get full access — no subscriptions or ongoing fees.

---

## Simple Tech Stack

Here's what powers the app, explained without jargon:

| Piece | What It Does | Everyday Analogy |
|---|---|---|
| **React** (frontend) | Builds the screens the user sees and taps | The "storefront" — what the customer looks at |
| **Django** (backend) | Handles logic, accounts, and saves data | The "back office" — staff working behind the scenes |
| **PostgreSQL** (database) | Stores all the behaviors, logs, and user info | The "filing cabinet" where everything is kept organized |
| **OPENAI AI** | Powers the optional AI helper | A specialist on call for tricky questions |
| **Ubuntu server + Nginx** | Hosts the app on the internet | The "building" where the store and office live |
| **PWA (Progressive Web App)** | Works on phones like an app, even offline | A regular website that behaves like a phone app |

---

## Why It Matters

Caregiving for someone with dementia is exhausting and often happens in high-stress moments. CalmCompass is designed to be usable with one hand, in the middle of the night, with minimal friction — giving caregivers calm, trustworthy guidance exactly when they need it most.
