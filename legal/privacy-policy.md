# Privacy Policy

**FlowLedger** | Effective Date: [INSERT DATE] | Last Updated: [INSERT DATE]

---

## 1. Who We Are

FlowLedger ("we", "us", "our") is a financial management application built for freelancers and independent contractors. Our registered business address is [YOUR ADDRESS].

For privacy questions, contact us at: privacy@flowledger.com

---

## 2. Information We Collect

### 2.1 Information You Provide Directly
- **Account information**: name, email address, password (stored as a one-way hash — we cannot read it)
- **Profile information**: freelancer type, U.S. state, tax filing status
- **Invoice data**: client names, email addresses, invoice amounts, and payment status that you enter manually
- **Notes**: any notes you add to transactions or invoices

### 2.2 Financial Data (via Plaid)
When you connect a bank account, FlowLedger uses **Plaid Technologies, Inc.** to retrieve:
- Account names, types, and balances
- Transaction history (dates, amounts, merchant names, categories)

**We never see or store your bank login credentials.** Plaid handles authentication directly with your bank. Plaid's privacy policy is available at [plaid.com/legal/privacy-policy](https://plaid.com/legal/privacy-policy).

### 2.3 Usage Data (automatically collected)
- App events (e.g., screens visited, features used) — collected via PostHog for product analytics
- Crash reports and error logs — collected via Sentry
- Device type, operating system version, and app version

### 2.4 Payment Information
Subscription payments are processed by **Stripe, Inc.** We store only your Stripe Customer ID and subscription status. We never see or store full credit card numbers. Stripe's privacy policy is at [stripe.com/privacy](https://stripe.com/privacy).

---

## 3. How We Use Your Information

| Purpose | Legal Basis |
|---|---|
| Provide the FlowLedger service (tax estimates, cash flow forecasting, invoicing) | Contract performance |
| Send quarterly tax reminders and weekly summaries (push notifications) | Contract performance |
| Improve the app (product analytics, crash reports) | Legitimate interests |
| Respond to support requests | Legitimate interests |
| Comply with legal obligations | Legal obligation |

We do **not** sell, rent, or share your personal data with third parties for their marketing purposes.

---

## 4. Data Sharing

We share data only with the following categories of service providers, strictly to operate the service:

- **Plaid** — bank account linking and transaction retrieval
- **Stripe** — subscription billing
- **Railway / cloud hosting provider** — servers that run the FlowLedger API (data stored in the U.S.)
- **Sentry** — error and crash reporting (anonymized where possible)
- **PostHog** — product usage analytics (you can opt out in Settings)

---

## 5. Data Retention

- **Account data**: retained for as long as your account is active, plus 30 days after deletion to allow recovery
- **Transaction and invoice data**: retained for 7 years to support tax record-keeping, unless you request earlier deletion
- **Crash logs**: retained for 90 days
- **Analytics events**: retained for 12 months in aggregate

---

## 6. Your Rights

Depending on your location, you may have the right to:

- **Access**: request a copy of all data we hold about you (use the in-app "Export My Data" feature or email privacy@flowledger.com)
- **Deletion**: request permanent deletion of your account and all associated data (use the in-app "Delete Account" feature — this is immediate and irreversible)
- **Correction**: update incorrect information via the Profile screen
- **Portability**: receive your data in machine-readable JSON format via the Export feature
- **Opt out of analytics**: toggle off "Share usage data" in Settings → Privacy

**California residents (CCPA)**: You have the right to know what personal information we collect, the right to delete it, and the right to opt out of its sale. We do not sell personal information.

---

## 7. Data Security

- All data in transit is encrypted with TLS 1.3
- Passwords are hashed with bcrypt (cost factor 12) — we cannot recover them
- Bank credentials are never stored by FlowLedger (Plaid manages this)
- Access tokens are stored in device secure storage (iOS Keychain / Android Keystore)
- Our servers are hosted in SOC 2-compliant infrastructure

---

## 8. Children's Privacy

FlowLedger is not directed to individuals under 18. We do not knowingly collect personal information from children.

---

## 9. Changes to This Policy

We will notify you of material changes via email or in-app notification at least 14 days before they take effect. Your continued use of FlowLedger after the effective date constitutes acceptance.

---

## 10. Contact Us

**Email**: privacy@flowledger.com
**Response time**: within 5 business days

For EU/UK users, you have the right to lodge a complaint with your local data protection authority.
