# FlowLedger — Setup Guide

Everything below requires your accounts and credentials. All code is already written. Work through each step in order.

---

## Step 1 — Create Required Accounts

Open these five websites and create an account on each. All have free tiers or free trials.

| # | Service | URL | What it's for |
|---|---|---|---|
| 1 | Railway | railway.app | Hosts your backend server |
| 2 | Plaid | plaid.com | Bank account linking |
| 3 | Stripe | stripe.com | Subscription billing |
| 4 | Expo | expo.dev | Builds the mobile app |
| 5 | Sentry | sentry.io | Crash/error tracking (free tier) |

---

## Step 2 — Set Up Plaid

1. Log in to [plaid.com/dashboard](https://dashboard.plaid.com)
2. Click **Create App** → name it "FlowLedger" → choose **Sandbox** environment
3. Copy your **Client ID** and **Sandbox Secret** from the Keys page
4. Save them — you'll need them in Step 4

> You can launch with Plaid Sandbox (free, unlimited). To connect real banks, apply for Production access after launch (takes 1–2 weeks; requires your Privacy Policy URL).

---

## Step 3 — Set Up Stripe

1. Log in to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Go to **Products** → **Add Product** → name it "FlowLedger Pro"
3. Add two recurring prices:
   - **Monthly**: $12.99/month, billing interval = Monthly
   - **Annual**: $99.00/year, billing interval = Yearly
4. Copy both **Price IDs** (they look like `price_1AbCdEfGhI...`)
5. Go to **Developers → API Keys** → copy your **Secret key** (`sk_test_...`)
6. Go to **Developers → Webhooks** → **Add endpoint**:
   - URL: `https://YOUR-RAILWAY-URL/v1/webhooks/stripe` *(fill in after Step 4)*
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Webhook Signing Secret** (`whsec_...`)

---

## Step 4 — Deploy the Backend to Railway

### 4a. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 4b. Deploy
```bash
cd backend
railway init          # creates a new Railway project; name it "flowledger-api"
railway up            # deploys via the Dockerfile in the backend/ folder
```

### 4c. Set Environment Variables
In the Railway dashboard → your project → **Variables**, add every line below:

```
NODE_ENV=production
PORT=3000
DATABASE_PATH=/data/flowledger.db
JWT_SECRET=<generate a random 40-character string — e.g. run: openssl rand -hex 20>
PLAID_CLIENT_ID=<from Step 2>
PLAID_SECRET=<from Step 2>
PLAID_ENV=sandbox
STRIPE_SECRET_KEY=<from Step 3>
STRIPE_WEBHOOK_SECRET=<from Step 3>
STRIPE_MONTHLY_PRICE_ID=<from Step 3>
STRIPE_ANNUAL_PRICE_ID=<from Step 3>
APP_URL=https://flowledger.com
```

### 4d. Get Your API URL
After deploy, Railway gives you a public URL like `https://flowledger-api-production.up.railway.app`.
Copy it — you'll use it in the next step.

### 4e. Finish the Stripe webhook
Go back to Stripe → Developers → Webhooks → edit the endpoint URL to:
`https://YOUR-RAILWAY-URL/v1/webhooks/stripe`

### 4f. Verify it's working
```bash
curl https://YOUR-RAILWAY-URL/health
# Should return: {"status":"ok","version":"1.0.0","env":"production"}
```

---

## Step 5 — Configure the Mobile App

### 5a. Update eas.json
Open `eas.json` and replace **both** occurrences of `YOUR_RAILWAY_URL`:
```json
"EXPO_PUBLIC_API_BASE_URL": "https://YOUR-RAILWAY-URL/v1"
```

### 5b. Create your local env file
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in:
```
EXPO_PUBLIC_API_BASE_URL=https://YOUR-RAILWAY-URL/v1
```
(Sentry and PostHog are optional for now — leave blank to skip)

---

## Step 6 — Install Mobile Dependencies

```bash
# From the project root (not the backend/ folder)
npm install --legacy-peer-deps

# Add Sentry (optional but recommended)
npm install sentry-expo @sentry/react-native --legacy-peer-deps

# Add PostHog analytics (optional)
npm install posthog-react-native --legacy-peer-deps
```

---

## Step 7 — Create an Expo Account and Link the Project

```bash
npm install -g eas-cli
eas login            # log in with your expo.dev account
eas init             # links this project to your Expo account; updates app.json with a real projectId
```

---

## Step 8 — Build the App

```bash
# Build for both iOS and Android simultaneously (takes 15–30 min on Expo's servers)
eas build --platform all --profile production
```

You'll receive emails with download links when each build finishes.

> **First time?** You'll be prompted to create iOS distribution certificates and Android keystore. Answer **yes** to let EAS handle this automatically.

---

## Step 9 — Set Up Apple Developer Account (iOS)

1. Go to [developer.apple.com](https://developer.apple.com) → Enroll → Individual ($99/year)
2. Once enrolled, go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
3. **My Apps** → **+** → **New App**:
   - Platform: iOS
   - Name: `FlowLedger — Freelance Finance`
   - Bundle ID: `com.flowledger.app` *(must match eas.json)*
   - SKU: `flowledger-001`
4. Fill in the **App Information** tab:
   - Subtitle: `Tax & Cash Flow for Freelancers`
   - Category: Finance → Personal Finance
5. Set up **In-App Purchases** → **Subscriptions**:
   - Add "FlowLedger Pro Monthly" — Product ID: `com.flowledger.app.pro_monthly` — $12.99/month — 14-day trial
   - Add "FlowLedger Pro Annual" — Product ID: `com.flowledger.app.pro_annual` — $99.00/year — 14-day trial
6. Upload **Screenshots** (required sizes: 6.7" and 6.5" iPhone; take these from Simulator in Xcode)
7. Fill in **Privacy Policy URL**: `https://flowledger.com/privacy`
8. Fill in **Keywords**: `freelance,1099,self employed,tax,quarterly,invoice,cash flow,budget`

---

## Step 10 — Submit to App Store

```bash
# Fill in your Apple ID, App Store Connect App ID, and Team ID in eas.json submit section first
eas submit --platform ios --profile production
```

Review typically takes **24–48 hours**.

---

## Step 11 — Set Up Google Play (Android)

1. Go to [play.google.com/console](https://play.google.com/console) → Pay the $25 one-time fee
2. **Create App** → name: "FlowLedger — Freelance Finance" → App → Free → Not a game
3. Complete the **Dashboard checklist**:
   - App access: All functions available without special access
   - Content rating: Complete the questionnaire (Finance app → Everyone)
   - Target audience: 18+ users
   - Data safety: Declare financial info collected (income/expense tracking), not shared with third parties
4. Set up subscriptions under **Monetize → Subscriptions**:
   - Monthly: `com.flowledger.app.pro_monthly` — $12.99/month
   - Annual: `com.flowledger.app.pro_annual` — $99.00/year

```bash
# Download a Google Play API service account key from Play Console → Setup → API access
# Save it as google-play-key.json in the project root
eas submit --platform android --profile production
```

Review takes **2–7 days** for new apps.

---

## Step 12 — Deploy the Landing Page

1. Go to [vercel.com](https://vercel.com) and create a free account
2. Click **Add New → Project** → **Import Git Repository**
3. Set the **Root Directory** to `landing/`
4. Deploy — Vercel gives you a URL like `flowledger.vercel.app`
5. **(Optional)** Add your custom domain (e.g. `flowledger.com`) in Project Settings → Domains

Update the App Store and Google Play listings with your Vercel URL as the support/privacy URL.

---

## Step 13 — Publish Legal Pages

1. In the `legal/` folder, open `privacy-policy.md` and `terms-of-service.md`
2. Fill in all `[INSERT ...]` placeholders with your name, address, state, and date
3. Convert to HTML (use any Markdown-to-HTML tool, e.g. [markdowntohtml.com](https://markdowntohtml.com))
4. Add to your Vercel site as `/privacy` and `/terms` pages

---

## Step 14 — Get Your First Users

Do these on **launch day**, in order:

1. **Product Hunt** — go to [producthunt.com/posts/new](https://www.producthunt.com/posts/new)
   - Tagline: "AI cash flow & tax manager for freelancers"
   - Launch Tuesday–Thursday for best visibility
   - Ask 5 friends to upvote when it goes live

2. **Reddit** — post in r/freelance and r/personalfinance:
   - Title: *"I built a quarterly tax estimator after getting hit with an $8K surprise bill — free to try"*
   - Be genuine — mention the app naturally at the end, don't spam

3. **Indie Hackers** — [indiehackers.com](https://www.indiehackers.com)
   - Post a "Building in Public" update with your story and launch metrics

---

## Checklist Before Submitting to App Stores

- [ ] Backend deployed and `/health` returns 200
- [ ] Plaid Sandbox connection tested in the app (Settings → Link Bank Account)
- [ ] Stripe test subscription created successfully
- [ ] Privacy Policy live at a public URL
- [ ] Terms of Service live at a public URL
- [ ] Tax disclaimer visible in the TaxEstimator screen
- [ ] App screenshots taken (all required sizes)
- [ ] In-app subscription SKUs configured in App Store Connect and Google Play
- [ ] `eas.json` updated with your real Apple ID, Team ID, and App Store Connect App ID

---

## Quick Reference — Key Files

| File | What to edit |
|---|---|
| `eas.json` | API URL, Apple ID, Team ID, App Store Connect App ID |
| `.env.local` | API URL, Sentry DSN, PostHog key |
| `backend/.env` | All backend secrets (never commit this) |
| `landing/index.html` | App Store links (search for `YOUR_APP_ID`) |
| `legal/privacy-policy.md` | Your name, address, effective date |
| `legal/terms-of-service.md` | Your name, address, state, effective date |

---

## Getting Help

- **Railway issues**: railway.app/docs
- **EAS build issues**: docs.expo.dev/build/introduction
- **Plaid Sandbox**: plaid.com/docs/sandbox
- **Stripe test cards**: stripe.com/docs/testing#cards
- **App Store rejection**: Read the rejection reason carefully; most common issues are missing privacy policy URL or missing tax disclaimer
