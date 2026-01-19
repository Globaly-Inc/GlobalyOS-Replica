# Data Safety Declaration for Google Play

Complete reference for filling out the Data Safety section in Google Play Console.
Based on GlobalyOS Privacy Policy at https://www.globalyos.com/privacy

---

## Overview Questions

### Does your app collect or share any user data?
**Answer: Yes**

### Is all user data encrypted in transit?
**Answer: Yes** (TLS 1.2+)

### Do you provide a way for users to request that their data be deleted?
**Answer: Yes** (Account deletion available in app settings)

---

## Data Types Collected

### Personal Info

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Name | ✅ Yes | ❌ No | ✅ Yes | Account, App functionality |
| Email address | ✅ Yes | ❌ No | ✅ Yes | Account, Communication |
| Phone number | ✅ Yes | ❌ No | ❌ Optional | Organization registration |
| Address | ✅ Yes | ❌ No | ❌ Optional | Employee HR records |
| User IDs | ✅ Yes | ❌ No | ✅ Yes | Account management |

**Ephemeral processing:** No
**User control:** Users can update profile information

---

### Financial Info

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Payment info | ✅ Yes | ✅ Yes* | ❌ Optional | Subscription payments |

*Shared with payment processor (Stripe) only for payment processing

---

### Photos and Videos

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Photos | ✅ Yes | ❌ No | ❌ Optional | Profile photos, attachments |
| Videos | ✅ Yes | ❌ No | ❌ Optional | Chat/wiki attachments |

**User control:** Users can delete uploaded media

---

### Files and Docs

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Files and docs | ✅ Yes | ❌ No | ❌ Optional | Wiki pages, chat attachments |

**User control:** Users can delete uploaded files

---

### App Activity

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| App interactions | ✅ Yes | ❌ No | ✅ Yes | Analytics, Personalization |
| In-app search history | ✅ Yes | ❌ No | ✅ Yes | Search functionality |
| Other user-generated content | ✅ Yes | ❌ No | ✅ Yes | Posts, comments, wiki content |

---

### App Info and Performance

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Crash logs | ✅ Yes | ❌ No | ✅ Yes | Stability, debugging |
| Diagnostics | ✅ Yes | ❌ No | ✅ Yes | Performance monitoring |
| Other app performance data | ✅ Yes | ❌ No | ✅ Yes | Service improvement |

---

### Device or Other IDs

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Device or other IDs | ✅ Yes | ❌ No | ✅ Yes | Push notifications, security |

---

### Location

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Approximate location | ✅ Yes | ❌ No | ❌ Optional | Attendance check-in (org setting) |
| Precise location | ✅ Yes | ❌ No | ❌ Optional | Attendance check-in (if enabled) |

**User control:** Location is optional and controlled by organization settings

---

### Messages

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Other in-app messages | ✅ Yes | ❌ No | ✅ Yes | Team chat functionality |

**Note:** Messages are only visible within the user's organization

---

## Data Usage Purposes

For each data type collected, select applicable purposes:

### Account Management
- Name, Email, Phone, User IDs

### App Functionality  
- Name, Email, Photos, Files, App activity, Messages, Location

### Analytics
- App interactions, Diagnostics, Performance data

### Developer Communications
- Email (for service updates, security alerts)

### Fraud Prevention, Security, Compliance
- Device IDs, App activity, Location

### Personalization
- App interactions, Search history

---

## Security Practices

### Data encrypted in transit
**Yes** - All data transmitted over HTTPS with TLS 1.2+

### Data encrypted at rest
**Yes** - AES-256 encryption for stored data

### Data deletion
**Yes** - Users can request account and data deletion

### Data retention
- Active accounts: Data retained while account active
- Deleted accounts: Data removed within 90 days

---

## Third-Party Data Sharing

### Payment Processors
- **Who:** Stripe
- **What:** Payment information only
- **Why:** Process subscription payments
- **Data sold:** No

### Cloud Infrastructure
- **Who:** Supabase (via Lovable Cloud)
- **What:** All app data
- **Why:** Service hosting and storage
- **Data sold:** No

### AI Providers
- **Who:** Lovable AI
- **What:** Query content for AI features
- **Why:** AI assistant functionality
- **Data sold:** No
- **Note:** No training on user data

---

## Answers for Common Questions

### Does your app share user data with third parties?
**Answer:** Only with service providers for app functionality (payment processing, hosting). Data is never sold.

### Can users opt out of data collection?
**Answer:** Yes, for optional features like location. Core functionality requires basic account data.

### How long is data retained?
**Answer:** While account is active, plus 90 days after deletion for backup purposes.

### Is data used for advertising?
**Answer:** No. The app contains no ads and data is not used for advertising purposes.

### Is data used to build user profiles for advertising?
**Answer:** No.

### Do you share data with data brokers?
**Answer:** No.

---

## Declaration Summary

When completing the Data Safety form, you will declare that GlobalyOS:

1. ✅ Collects user data (as detailed above)
2. ✅ Encrypts data in transit
3. ✅ Provides data deletion mechanism
4. ❌ Does not sell user data
5. ❌ Does not use data for advertising
6. ❌ Does not share data with data brokers
7. ✅ Shares limited data with service providers for functionality
