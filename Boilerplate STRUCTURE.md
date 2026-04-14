# Project Architecture & Structure

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│                    http://localhost:5555                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP Requests + JWT (Bearer token)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    REACT FRONTEND                            │
│                     (Vite + React 19)                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Contexts: AuthContext · SiteThemeContext            │    │
│  │  Providers: ToastProvider                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Pages: Home · Login · Register · Dashboard · Profile        │
│         VerifyEmail · ForgotPassword · ResetPassword         │
│         Pricing · PaymentSuccess · PaymentFailed             │
│         Admin (Dashboard · Users · Payments · Settings)      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Services (api.js · auth.js · payments.js ·          │    │
│  │            subscriptions.js · admin.js)              │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ REST API (http://localhost:8000/api)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   DJANGO BACKEND                             │
│                  (Django 4.2 + DRF)                          │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │              URL Router                             │    │
│  │  /api/auth/*   → accounts.urls                      │    │
│  │  /api/admin/*  → accounts.admin_urls                │    │
│  │  /api/*        → subscriptions.urls                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  Apps: accounts · subscriptions                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼──────────────┐
          │            │              │
┌─────────▼──────┐  ┌──▼─────┐  ┌───▼──────┐
│  PostgreSQL    │  │  Redis │  │  Celery  │
│  (localhost:   │  │  Cache │  │  Worker  │
│   5432)        │  │ :6379  │  │          │
└────────────────┘  └────────┘  └──────────┘
```

## Django Apps

### `accounts` — Authentication & User Management

```
accounts/
├── models.py              # User (UUID PK, org/phone/email_verified), SiteSettings, EmailVerificationToken
├── serializers.py         # Auth serializers, profile serializers
├── views.py               # Register, login, logout, token refresh, email verify, profile
├── admin_views.py         # Admin: user list/detail/update/deactivate
├── admin_serializers.py   # Admin-scoped serializers
├── admin_urls.py          # /api/admin/* routes
├── urls.py                # /api/auth/* routes
├── verification.py        # Email verification token logic
├── password_reset.py      # Password reset token model + email
├── password_reset_views.py# Request/validate/confirm password reset
├── token_cookies.py       # HttpOnly cookie refresh token helpers
├── throttles.py           # Rate limiting classes
└── admin.py               # Django admin registration
```

**User Model fields:**
- `id` (UUID PK), `username`, `email`, `password`
- `first_name`, `last_name`, `bio`, `avatar`
- `organization`, `designation`, `phone`
- `email_verified`, `is_staff`, `is_active`, `is_superuser`
- `created_at`, `updated_at`

**SiteSettings (singleton, pk=1):**
- `require_email_verification` (bool)
- `logged_in_users_only_default` (bool)
- `ai_provider` (openai | anthropic)
- `ai_model_openai`, `ai_model_anthropic`

### `subscriptions` — Plans, Subscriptions & Payments

```
subscriptions/
├── models.py              # Plan, UserSubscription, BkashTransaction, SubscriptionEvent
├── serializers.py         # Plan/Subscription/Transaction serializers
├── views.py               # PlanList, CurrentSubscription, SubscriptionUsage, Cancel
├── services.py            # LicenseService (plan enforcement, bKash lifecycle)
├── admin_services.py      # AdminPaymentsService (dashboard metrics, payment list)
├── stripe_service.py      # Stripe API interactions
├── stripe_views.py        # Checkout, webhook, customer portal, session status
├── bkash_service.py       # bKash tokenized checkout API
├── bkash_views.py         # Create, callback, status, SNS webhook
├── bkash_sns.py           # SNS notification verification
├── tasks.py               # Celery: check expiring/expired subs, expire stale bKash
├── throttles.py           # Rate limiting
└── urls.py                # /api/plans/, /api/subscription/, /api/payments/...
```

**Plan model fields:**
- `name`, `slug`, `tier`
- `max_items` — generic item limit (0 = unlimited). Rename in your app.
- `price_monthly`, `price_yearly` (USD)
- `stripe_price_id_monthly`, `stripe_price_id_yearly`
- `bkash_price_monthly`, `bkash_price_yearly` (BDT)
- `currency`, `is_active`, `features` (JSON list)

**Default seeded plans:** Free (3 items) · Pro ($29/mo, 25 items) · Enterprise ($99/mo, unlimited)

## Frontend Structure

```
frontend/src/
├── App.jsx                # Route definitions + providers
├── main.jsx               # React entry point
├── index.css              # Global styles + CSS variables
│
├── contexts/
│   ├── AuthContext.jsx    # user, login, register, logout, email_verified state
│   └── SiteThemeContext.jsx# Site-wide theme from API
│
├── hooks/
│   └── useToast.jsx       # Toast notification hook
│
├── components/
│   ├── Navbar.jsx         # Logo, navigation, user dropdown, subscription badge
│   ├── ProtectedRoute.jsx # Requires authenticated user
│   ├── AdminRoute.jsx     # Requires is_staff user
│   └── ui/                # shadcn/ui components (button, card, dialog, etc.)
│
├── pages/
│   ├── Home.jsx           # Public landing page
│   ├── Login.jsx          # Login form
│   ├── Register.jsx       # Registration form
│   ├── VerifyEmail.jsx    # Email verification gate
│   ├── ForgotPassword.jsx # Password reset request
│   ├── ResetPassword.jsx  # Password reset confirm
│   ├── Pricing.jsx        # Plans from API, Stripe/bKash CTAs
│   ├── PaymentSuccess.jsx # Post-payment success page
│   ├── PaymentFailed.jsx  # Post-payment failure page
│   ├── Dashboard.jsx      # User dashboard (subscription status, usage)
│   ├── Profile.jsx        # Profile editor (avatar, org, password change)
│   └── admin/
│       ├── AdminLayout.jsx    # Sidebar + outlet
│       ├── AdminDashboard.jsx # Metrics: users, revenue, signups
│       ├── AdminUsers.jsx     # User list with search/filter
│       ├── AdminUserDetail.jsx# User edit + subscription override
│       ├── AdminPayments.jsx  # Stripe + bKash payment history
│       ├── AdminSettings.jsx  # Toggle email verification, AI provider
│       └── admin-helpers.js   # Formatting utilities
│
└── services/
    ├── api.js             # Axios instance + JWT interceptors
    ├── auth.js            # Email verify, password reset endpoints
    ├── payments.js        # Stripe checkout, bKash create, session status
    ├── subscriptions.js   # Plan list, current sub, usage, cancel
    └── admin.js           # Admin users/payments/settings API
```

## Authentication Flow

```
Register → Email verification (if enabled) → Login
           ↓
    JWT access token (1h) + HttpOnly cookie refresh token (7d)
           ↓
    Token auto-refresh via axios interceptor on 401
           ↓
    Logout → blacklist refresh token
```

## Payment Flow

### Stripe
```
User clicks "Upgrade" → POST /api/payments/stripe/create-checkout/
    → redirect to Stripe Checkout
    → Stripe webhook (customer.subscription.updated) → update UserSubscription
    → redirect to /payment/success
```

### bKash
```
User clicks "Pay with bKash" → POST /api/payments/bkash/create/
    → redirect to bKash payment page
    → bKash callback → POST /api/payments/bkash/callback/
    → activate UserSubscription
    → redirect to /payment/success
```

## Admin Panel Routes

| Path | Page | Requirement |
|------|------|-------------|
| `/admin` | AdminDashboard | `is_staff=True` |
| `/admin/users` | AdminUsers | `is_staff=True` |
| `/admin/users/:id` | AdminUserDetail | `is_staff=True` |
| `/admin/payments` | AdminPayments | `is_staff=True` |
| `/admin/settings` | AdminSettings | `is_staff=True` |

## Database Schema

### Key tables

```sql
-- users
id UUID PK, username, email, password (hashed),
first_name, last_name, bio, avatar,
organization, designation, phone, email_verified,
is_staff, is_active, is_superuser, date_joined, created_at, updated_at

-- accounts_sitesettings (singleton pk=1)
require_email_verification, logged_in_users_only_default,
ai_provider, ai_model_openai, ai_model_anthropic

-- accounts_emailverificationtoken
id UUID, user_id FK, token, expires_at, used

-- subscriptions_plan
id UUID, name, slug, tier, max_items,
price_monthly, price_yearly, bkash_price_monthly, bkash_price_yearly,
stripe_price_id_monthly, stripe_price_id_yearly,
currency, is_active, features (JSON)

-- subscriptions_usersubscription
id UUID, user_id (OneToOne), plan_id FK,
status, billing_cycle, payment_provider,
stripe_customer_id, stripe_subscription_id,
bkash_subscription_id,
current_period_start, current_period_end,
cancel_at_period_end, cancel_requested_at

-- subscriptions_bkashtransaction
id UUID, user_id FK, subscription_id FK, target_plan_id FK,
payment_id (unique), trx_id, invoice_number,
amount, currency, status, refund_status, ...

-- subscriptions_subscriptionevent
id UUID, subscription_id FK, user_id FK, event_type,
plan_id FK, status, payment_provider, billing_cycle, metadata (JSON)

-- Token blacklist tables (simplejwt)
token_blacklist_outstandingtoken, token_blacklist_blacklistedtoken
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Secret key for Django |
| `DEBUG` | True in development |
| `ENVIRONMENT` | development / production |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL |
| `REDIS_HOST` | Redis for caching + Celery |
| `CELERY_BROKER_URL` | Celery task queue |
| `EMAIL_BACKEND` | `console.EmailBackend` (dev) or `smtp.EmailBackend` (prod) |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | SMTP config |
| `DEFAULT_FROM_EMAIL` | From address for system emails |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD` | bKash credentials |
| `BKASH_BASE_URL` | bKash API base URL (sandbox or production) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

## Adding Your App Features

```
1. Backend
   ├─ Create a new Django app: python manage.py startapp myapp
   ├─ Add 'myapp' to INSTALLED_APPS in settings.py
   ├─ Define models (FK to accounts.User for ownership)
   ├─ Wire up LicenseService.check_can_create_item() for plan limits
   ├─ Create serializers + views + urls
   └─ Register in calm_compass/urls.py

2. Frontend
   ├─ Add API calls to src/services/
   ├─ Create pages in src/pages/
   ├─ Add routes to src/App.jsx
   └─ Use ProtectedRoute for authenticated pages

3. Subscription limits
   └─ Override LicenseService.get_item_count() in services.py:
      from subscriptions.services import LicenseService
      LicenseService.get_item_count = lambda cls, user: MyModel.objects.filter(user=user).count()
```

## Security Layers

```
1. JWT Authentication — 1-hour access tokens, 7-day refresh tokens
2. HttpOnly cookie refresh — protects refresh token from XSS
3. Token blacklist — logout invalidates refresh tokens
4. CORS — allowed origins from APP_ORIGIN env var
5. Rate limiting — throttle classes on auth endpoints
6. Email verification — optional (configurable in SiteSettings)
7. Content Security Policy — via ContentSecurityPolicyMiddleware
8. HTTPS enforcement in production (SECURE_SSL_REDIRECT)
9. HSTS headers in production
```
