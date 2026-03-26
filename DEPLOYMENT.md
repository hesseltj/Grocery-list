# FlowLedger — Deployment & Go-to-Market Guide

> AI-powered cash flow & tax manager for freelancers.
> Target: 74M+ U.S. freelancers. Price: $99/year (Pro Annual) / $12.99/month.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Third-Party Service Setup](#third-party-service-setup)
4. [Build & Deploy to App Stores](#build--deploy-to-app-stores)
5. [App Store Listing Optimization (ASO)](#app-store-listing-optimization-aso)
6. [Pricing & Subscription Configuration](#pricing--subscription-configuration)
7. [Analytics & Monitoring](#analytics--monitoring)
8. [Go-to-Market: Acquiring First 1,000 Users](#go-to-market-acquiring-first-1000-users)
9. [Making Sales: Ongoing Revenue Growth](#making-sales-ongoing-revenue-growth)
10. [Legal & Compliance](#legal--compliance)

---

## Prerequisites

### Development Environment

```bash
# Install Node.js 20+ and npm
node --version  # should be >= 20
npm --version

# Install Expo CLI
npm install -g @expo/cli eas-cli

# Install project dependencies
cd flowledger
npm install --legacy-peer-deps

# Verify tests pass
npx jest --config jest.config.js
# Expected: 180 passed, 0 failed
```

### Required Accounts (create before proceeding)

| Service | Purpose | URL |
|---|---|---|
| Expo / EAS | Build & deployment | expo.dev |
| Apple Developer | iOS App Store | developer.apple.com ($99/year) |
| Google Play Console | Android | play.google.com/console ($25 one-time) |
| Plaid | Bank account linking | plaid.com (Sandbox is free) |
| Stripe | Subscription billing | stripe.com |
| Supabase or Railway | Backend hosting | supabase.com / railway.app |
| Sentry | Error tracking | sentry.io (free tier) |
| Mixpanel or PostHog | Product analytics | mixpanel.com / posthog.com |

---

## Backend Setup

FlowLedger requires a backend API to proxy Plaid and Stripe calls securely (never expose API keys to the mobile app).

### Option A: Supabase + Edge Functions (Recommended for speed)

```bash
# 1. Create a Supabase project at supabase.com
# 2. Install Supabase CLI
npm install -g supabase

# 3. Initialize
supabase init
supabase login

# 4. Create the database schema
supabase db push  # applies migrations from /supabase/migrations/

# 5. Deploy Edge Functions
supabase functions deploy plaid-link-token
supabase functions deploy plaid-exchange
supabase functions deploy plaid-sync
supabase functions deploy subscription-checkout
supabase functions deploy subscription-portal
```

### Option B: Node.js + Railway

```bash
# 1. Create a Railway project at railway.app
# 2. Deploy your Node.js API (Express or Fastify)
railway init
railway up

# 3. Set environment variables in Railway dashboard:
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox  # switch to production when ready
STRIPE_SECRET_KEY=sk_live_...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=your_jwt_secret_256_bits
```

### Required API Endpoints

Your backend must expose these REST endpoints:

```
POST /v1/auth/register       - Create user account
POST /v1/auth/login          - Sign in, return JWT
POST /v1/plaid/link-token    - Create Plaid Link token
POST /v1/plaid/exchange      - Exchange public_token
POST /v1/plaid/sync          - Sync transactions
GET  /v1/accounts            - List linked bank accounts
GET  /v1/transactions        - Fetch transactions with pagination
POST /v1/subscription/checkout - Create Stripe checkout session
POST /v1/subscription/portal   - Customer portal session
POST /v1/subscription/trial    - Start free trial
GET  /v1/subscription          - Get subscription status
```

---

## Third-Party Service Setup

### 1. Plaid Setup

```bash
# 1. Sign up at plaid.com → Dashboard → Create app

# 2. Get credentials from Dashboard:
PLAID_CLIENT_ID=...
PLAID_SECRET=...  # Use Sandbox key during development

# 3. Configure in your backend .env:
PLAID_ENV=sandbox  # or 'development' or 'production'
PLAID_PRODUCTS=transactions,accounts
PLAID_COUNTRY_CODES=US

# 4. Apply for Production access:
# Go to Dashboard → Compliance → Apply for Production
# Requires: Privacy Policy URL, Terms of Service URL, security questionnaire
# Approval: typically 1–2 weeks

# Cost: Plaid charges per connected account per month
# Startup pricing: ~$0.30–0.50 per active account/month
# Negotiate startup rates: plaid.com/pricing
```

### 2. Stripe Setup

```bash
# 1. Sign up at stripe.com → Dashboard → Developers → API Keys

# 2. Create subscription products in Stripe Dashboard:
# Products → Add Product → "FlowLedger Pro"
# Add two prices:
#   - $12.99/month (recurring, monthly)
#   - $99.00/year  (recurring, annual)
# Copy the Price IDs (price_xxx) — add to your backend

# 3. Configure webhooks:
# Dashboard → Developers → Webhooks → Add endpoint
# URL: https://your-api.com/v1/webhooks/stripe
# Events to listen for:
#   - customer.subscription.created
#   - customer.subscription.updated
#   - customer.subscription.deleted
#   - invoice.payment_succeeded
#   - invoice.payment_failed

# 4. Test with Stripe CLI:
stripe listen --forward-to localhost:3000/v1/webhooks/stripe
stripe trigger customer.subscription.created

# 5. Set environment variables:
STRIPE_SECRET_KEY=sk_test_...  # sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...
```

### 3. Push Notifications Setup

```bash
# iOS (APNs):
# 1. Apple Developer → Certificates → Keys → Create Key
# 2. Enable "Apple Push Notifications service (APNs)"
# 3. Download the .p8 key file
# 4. Add to Expo EAS: eas credentials

# Android (FCM):
# 1. Firebase Console → Project Settings → Cloud Messaging
# 2. Copy Server Key
# 3. Add to EAS: eas credentials

# Configure in app.json:
# "plugins": ["expo-notifications"]  (already done)
```

---

## Build & Deploy to App Stores

### Step 1: Configure EAS Build

```bash
# Login to Expo
eas login

# Initialize EAS project (links to your Expo account)
eas init

# This creates eas.json — review and commit it
```

Create `eas.json`:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "ios": {
        "bundleIdentifier": "com.flowledger.app",
        "buildNumber": "1"
      },
      "android": {
        "applicationId": "com.flowledger.app",
        "versionCode": 1
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "production"
      }
    }
  }
}
```

### Step 2: Set Environment Variables for Production

Create `.env.production`:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.flowledger.com/v1
EXPO_PUBLIC_PLAID_ENV=production
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

Add to EAS secrets (never commit):

```bash
eas secret:create --scope project --name API_BASE_URL --value "https://api.flowledger.com/v1"
eas secret:create --scope project --name PLAID_CLIENT_ID --value "your_plaid_client_id"
```

### Step 3: Build Production Binaries

```bash
# Build for both platforms simultaneously
eas build --platform all --profile production

# Or separately:
eas build --platform ios --profile production
eas build --platform android --profile production

# EAS builds on Expo's cloud infrastructure (~15-30 min)
# You receive download links for .ipa and .aab files
```

### Step 4: Submit to App Stores

```bash
# Submit to both stores automatically:
eas submit --platform all --profile production

# This uploads .ipa to App Store Connect and .aab to Google Play Console
```

### Step 5: iOS App Store Review Process

1. **App Store Connect** → My Apps → New App
2. Fill out metadata:
   - App Name: "FlowLedger — Freelance Finance"
   - Bundle ID: com.flowledger.app
   - SKU: flowledger-001
3. **Screenshots**: Required sizes:
   - iPhone 6.7" (1290 × 2796)
   - iPhone 6.5" (1242 × 2688)
   - iPad 12.9" (if supporting iPad)
4. **App Preview Videos**: 15–30 seconds showing key features
5. **Keywords** (100 chars): `freelance,taxes,invoice,cash flow,self employed,budget,1099`
6. **Privacy Policy URL**: Required (host at flowledger.com/privacy)
7. **Age Rating**: 4+ (no objectionable content)
8. **In-App Purchases**: Add both subscription SKUs in App Store Connect
9. Submit for review → Typical review time: 24–48 hours

### Step 6: Google Play Store Submission

1. **Google Play Console** → Create app
2. Upload .aab file
3. Fill out store listing (title, description, screenshots)
4. **Content Rating**: Complete questionnaire (Finance app = PEGI 3 / Everyone)
5. **Data Safety**: Declare:
   - Financial info (collected, not shared with third parties)
   - App activity data
6. Set up subscriptions under Monetize → Subscriptions
7. Submit for review → Typically 2–7 days for new apps

---

## App Store Listing Optimization (ASO)

### iOS & Google Play Listing Copy

**App Name**: `FlowLedger — Freelance Finance`

**Subtitle** (iOS, 30 chars): `Tax & Cash Flow for Freelancers`

**Description** (first 3 lines most important):

```
Finally — a financial app built for how you actually work.

FlowLedger is the only app that combines irregular income budgeting,
quarterly tax estimation, invoice tracking, and AI cash flow forecasting
in one place. Built exclusively for freelancers.

FEATURES:
✅ AI Cash Flow Forecasting — 12-week projection based on your income history
✅ Quarterly Tax Estimator — Automatic SE tax + federal + state estimates
✅ Invoice Tracker — Create, send, and track client invoices
✅ Bank Sync — Connect accounts via Plaid for automatic transaction import
✅ Smart Categorization — Auto-classifies business vs. personal expenses
✅ Tax Reserve Bucket — Know exactly how much to set aside every week

BUILT FOR:
• Freelance designers, developers, writers, consultants
• Independent contractors and 1099 workers
• Gig workers with multiple income streams
• Small business owners who need simple financial visibility

PRICING:
• 14-day free trial — no credit card required
• Pro Monthly: $12.99/month
• Pro Annual: $99/year (save 37%)

DISCLAIMER: FlowLedger provides tax estimates for informational purposes
only. Consult a qualified CPA for authoritative tax advice.
```

**Keywords** (iOS, 100 chars max):
```
freelance,1099,self employed,tax,quarterly,invoice,cash flow,budget,gig,contractor
```

---

## Pricing & Subscription Configuration

### Subscription SKU Setup (App Store Connect)

| Field | Pro Monthly | Pro Annual |
|---|---|---|
| Reference Name | FlowLedger Pro Monthly | FlowLedger Pro Annual |
| Product ID | com.flowledger.app.pro_monthly | com.flowledger.app.pro_annual |
| Price | $12.99 | $99.00 |
| Duration | 1 Month | 1 Year |
| Free Trial | 14 Days | 14 Days |
| Promotional Offer | — | 1 Month Free (first year) |

### Pricing Strategy

1. **Default to Annual**: Show annual plan first in the paywall UI, with monthly as secondary option.
2. **Hard Paywall Trial**: Users get 14 days of full Pro access before requiring payment. Do NOT offer a watered-down free tier initially — this increases trial-to-paid conversion.
3. **Annual Anchoring**: "$99/year = less than $2/week" framing in paywall copy.
4. **Tax Season Urgency**: Run Q1 and Q4 promotional pricing (10% off) coinciding with IRS payment deadlines.

---

## Analytics & Monitoring

### Sentry (Error Tracking)

```bash
npm install @sentry/react-native --legacy-peer-deps

# Initialize in App.tsx:
import * as Sentry from '@sentry/react-native';
Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
```

### Key Metrics to Track (Mixpanel / PostHog)

```typescript
// Onboarding funnel
track('onboarding_started')
track('onboarding_step_completed', { step: 1 })
track('onboarding_completed')

// Core activation
track('bank_account_connected')
track('first_transaction_viewed')
track('tax_estimate_viewed')
track('invoice_created')

// Monetization
track('paywall_viewed')
track('trial_started', { plan: 'pro_annual' })
track('subscription_purchased', { plan, price })
track('subscription_cancelled', { reason })
```

**North Star Metric**: % of users who view their tax estimate within 7 days of signup (indicator of core value delivered).

### Crash Monitoring Dashboard

Set up alerts for:
- Crash-free sessions < 99.5%
- API error rate > 1%
- Plaid sync failure rate > 5%
- Subscription webhook failures

---

## Go-to-Market: Acquiring First 1,000 Users

### Month 1–2: Zero-Cost Acquisition

**Reddit** (highest ROI for this niche):
- Post genuinely helpful content in:
  - r/freelance (580K members)
  - r/personalfinance (18M members)
  - r/digitalnomad (350K members)
  - r/Entrepreneur (3M members)
- DO: Answer tax questions and mention FlowLedger naturally
- DO NOT: Spam promotional posts — leads to permanent bans
- Template post: "I built a quarterly tax estimator for freelancers after getting hit with a $6K surprise bill — here's how I think about it" (include tool at end)

**Product Hunt Launch**:
- Submit at producthunt.com/ship to build a pre-launch list
- Launch on a Tuesday–Thursday for best visibility
- Ask early users to upvote on launch day
- Goal: Top 5 Product of the Day → 500–2,000 signups

**Indie Hacker Post**:
- Write a "Building in Public" post about FlowLedger
- indieHackers.com has an audience of solopreneurs who are your exact target

**Twitter/X**:
- Post about the tax calculation logic, the challenges you faced
- Target: #buildinpublic, #indiehacker, #freelance hashtags
- DM 20 freelance influencers (>10K followers) offering free Pro accounts

### Month 2–4: Content & SEO

**Blog/SEO** (host at flowledger.com/blog):
High-intent keywords to target:
- "quarterly estimated taxes freelancer" (2,400/mo, low competition)
- "how much to set aside for taxes freelancer" (3,200/mo)
- "freelance cash flow management" (880/mo)
- "1099 tax calculator" (8,100/mo)

Create calculators and embed them in blog posts — these attract backlinks.

**YouTube**:
- "How I Manage Taxes as a Freelancer" (tutorial using FlowLedger)
- "Quarterly Estimated Tax Payment Walkthrough 2025"
- Reach out to 10 YouTube creators in the finance/freelance space for partnership

### Month 3–6: Paid Acquisition (once unit economics are proven)

Target CAC < $30 (LTV is ~$99–$255)

**Meta/Facebook Ads**:
- Audience: Freelancers, self-employed, 1099 workers, ages 25–45
- Creative: Video testimonial "I used to dread tax season..."
- CTA: "Start Free Trial"
- Budget: Start at $20/day, scale winners

**Google Search Ads**:
- Keywords: "freelance tax app", "self employed budget app", "quarterly tax estimator app"
- Match type: exact and phrase match only
- Budget: $15/day to start

**App Store Search Ads (Apple)**:
- Bid on: "freelance", "1099 taxes", "self employed budget", "invoice tracker"
- CPT budget: $0.50–1.50 per tap

### Partnerships

1. **Accounting/CPA Firms**: Partner with 5–10 independent CPAs who serve freelancers. Offer them a referral commission (20%) or white-label landing pages.
2. **Freelance Platforms**: Reach out to Upwork, Toptal, and Fiverr about integration or co-marketing. Even a blog post mention drives meaningful signups.
3. **Coworking Spaces**: Many host freelancer meetups — offer a free Pro account for event attendees.

---

## Making Sales: Ongoing Revenue Growth

### Conversion Optimization

**Onboarding → Trial Conversion**:
- Show the tax estimate on Day 1 (immediate "aha" moment)
- Send Day 3 push notification: "Your tax estimate is ready — set aside $X this week"
- Hard paywall on Day 14 — don't extend trials without explicit request

**Trial → Paid Conversion** (target: 30%):
- Day 7 email: "Your 7-day snapshot: You've tracked $X in income, estimated $Y in taxes"
- Day 12 email: "Your trial ends in 48 hours — lock in annual pricing"
- Day 14: Paywall with prominent annual plan + "This saves the average freelancer 4+ hours at tax time"

**Annual vs. Monthly**:
- Default to annual on the paywall
- Show monthly as "monthly — or save 37% annually"
- First-year promotion: Offer 2 months free with annual = $82 effective price

### Reducing Churn

- **Tax season retention**: Users who complete Q1 filing stay 40% longer — build a "Tax Summary" report that makes this easy
- **Annual billing**: 40% lower churn than monthly — always push annual
- **Engagement emails**: Weekly "Your Cash Flow This Week" email keeps users active even when they don't open the app
- **Win-back**: 7 days after cancellation, offer 25% off annual plan via email

### Revenue Milestones & Unit Economics

| Milestone | Users | MRR | ARR |
|---|---|---|---|
| Ramen profitable | 250 paying | ~$2,000 | $24K |
| Side project income | 750 paying | ~$6,000 | $72K |
| Full-time founder | 1,500 paying | ~$12,000 | $144K |
| Venture-scale | 7,400 paying | ~$60,000 | $720K |

Assumptions: 60% annual plan ($8.25 MRR equiv.), 40% monthly ($12.99 MRR).

### Customer Support

- **Intercom** or **Crisp** for in-app chat (free tiers available)
- **Response SLA**: < 4 hours for Pro users, < 24 hours for free
- FAQ in the app: Reduces support volume by ~60%
- CPA Partnership: One CPA on retainer to escalate complex tax questions

---

## Legal & Compliance

### Required Legal Pages

Host these at flowledger.com before submitting to app stores:

1. **Privacy Policy** — Required by Apple, Google, and Plaid
   - Key disclosures: What data you collect, Plaid data, no selling to third parties
   - Use: privacypolicies.com or tosdr.org for templates
   - Cost: ~$100 for a lawyer-reviewed policy

2. **Terms of Service**
   - Key clauses: Not financial advice, limitation of liability, dispute resolution
   - Cost: ~$150 for lawyer-reviewed terms

3. **Tax Disclaimer** (in-app, shown prominently)
   ```
   FlowLedger provides tax estimates for informational purposes only
   and does not constitute tax advice. Tax calculations are estimates
   based on publicly available IRS guidelines. Always consult a
   qualified CPA or tax professional for authoritative guidance.
   ```

### Data Security Requirements

- All API calls over HTTPS (TLS 1.3)
- JWT tokens expire in 7 days, refresh tokens in 90 days
- Plaid access tokens encrypted at rest (AES-256)
- No storing of bank credentials (Plaid handles this)
- GDPR-ready: User data export and deletion endpoints
- Biometric auth via Expo SecureStore for token storage

### App Store Policy Compliance

- **Apple**: Finance apps must display the tax disclaimer; cannot claim to provide "tax advice"
- **Google**: Finance apps require enhanced verification for apps that handle financial data
- **CCPA** (California): Required if serving California users (which you will)

---

## Checklist: Launch Readiness

### Technical
- [ ] All 180 tests passing
- [ ] Backend API deployed and responding
- [ ] Plaid Sandbox integration working
- [ ] Stripe test subscriptions working
- [ ] Push notifications configured
- [ ] Sentry error tracking active
- [ ] Analytics events firing

### Legal
- [ ] Privacy Policy live at flowledger.com/privacy
- [ ] Terms of Service live at flowledger.com/terms
- [ ] Tax disclaimer visible in app

### App Store
- [ ] EAS production build created
- [ ] App Store Connect listing complete
- [ ] Screenshots uploaded (all required sizes)
- [ ] In-app purchase SKUs configured
- [ ] Submitted for review

### Marketing
- [ ] Landing page at flowledger.com
- [ ] Email list set up (Mailchimp / ConvertKit)
- [ ] Product Hunt scheduled
- [ ] Reddit community presence established
- [ ] 3–5 beta users providing testimonials

---

*FlowLedger — Built with Expo / React Native. Market research validated June 2025.*
