# Google Play Store Submission Checklist

Complete step-by-step guide for submitting GlobalyOS to Google Play Store.

---

## Phase 1: Prerequisites

### Google Play Developer Account
- [ ] Create account at [Google Play Console](https://play.google.com/console)
- [ ] Pay one-time $25 registration fee
- [ ] Complete identity verification (2-3 business days)
- [ ] Add payment profile for receiving payments

### Build Production AAB
```bash
cd android
./gradlew bundleRelease
```
- [ ] AAB generated at `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Verify AAB file size (should be under 150MB)

---

## Phase 2: Create App in Play Console

### Basic Information
- [ ] Click "Create app"
- [ ] App name: **GlobalyOS**
- [ ] Default language: **English (United States)**
- [ ] App or game: **App**
- [ ] Free or paid: **Free**
- [ ] Accept Developer Program Policies
- [ ] Accept US export laws

---

## Phase 3: Store Listing

### Main Store Listing
- [ ] App name: GlobalyOS
- [ ] Short description: Copy from `/store-listing/short-description.txt`
- [ ] Full description: Copy from `/store-listing/full-description.txt`

### Graphics
- [ ] App icon: Upload 512x512 PNG (no transparency)
- [ ] Feature graphic: Upload 1024x500 PNG/JPG
- [ ] Phone screenshots: Upload 2-8 screenshots (1080x1920)
- [ ] (Optional) 7-inch tablet screenshots
- [ ] (Optional) 10-inch tablet screenshots

### Contact Details
- [ ] Developer name: Your company name
- [ ] Email: support@globalyos.com
- [ ] Phone: (Optional)
- [ ] Website: https://www.globalyos.com

---

## Phase 4: App Content

### Privacy Policy
- [ ] Add URL: `https://www.globalyos.com/privacy`

### App Access
- [ ] Select "All functionality is available without special access"
- [ ] OR provide test credentials if login required for review

### Ads Declaration
- [ ] Select: "No, my app does not contain ads"

### Content Rating
Complete the questionnaire:
- [ ] Violence: No
- [ ] Fear: No
- [ ] Sexuality: No
- [ ] Language: No (mild language from user content)
- [ ] Controlled substances: No
- [ ] Crude humor: No
- [ ] Gambling: No
- [ ] User-generated content: Yes
- [ ] Data shared with third parties: No (not sold)
- [ ] Submit and receive rating (Expected: PEGI 3 / Everyone)

### Target Audience
- [ ] Target age group: 18 and over
- [ ] App not designed for children: Confirmed
- [ ] No appeal to children: Confirmed

### News App
- [ ] Select: "No, my app is not a news app"

### COVID-19 Contact Tracing/Status Apps
- [ ] Select: "No"

### Data Safety
Complete using `DATA_SAFETY.md` as reference:
- [ ] Data collection overview
- [ ] Data types collected
- [ ] Data usage and handling
- [ ] Security practices
- [ ] Submit data safety form

### Government Apps
- [ ] Select: "No, my app is not a government app"

### Financial Features
- [ ] Select appropriate options if app handles financial data

---

## Phase 5: App Signing

### Play App Signing
- [ ] Accept Play App Signing (recommended)
- [ ] Google manages your app signing key
- [ ] Download upload key certificate for backup

---

## Phase 6: Release

### Create Internal Testing Track (Recommended First)
1. [ ] Go to Testing → Internal testing
2. [ ] Create new release
3. [ ] Upload AAB file
4. [ ] Add release notes from `/store-listing/release-notes.txt`
5. [ ] Add tester email addresses
6. [ ] Review and start rollout

### Verify Internal Testing
- [ ] Install app via internal testing link
- [ ] Test core functionality:
  - [ ] Login/Signup
  - [ ] Attendance check-in/out
  - [ ] Leave requests
  - [ ] Team chat
  - [ ] Wiki access
  - [ ] AI assistant

### Production Release
After successful testing:
1. [ ] Go to Production
2. [ ] Create new release
3. [ ] Upload AAB (or promote from testing)
4. [ ] Add release notes
5. [ ] Select rollout percentage (start with 20%)
6. [ ] Submit for review

---

## Phase 7: Review & Launch

### Review Timeline
- Initial review: 1-7 days (usually 1-3 for new apps)
- Updates: Usually within 24 hours

### Common Review Issues
- [ ] Missing privacy policy
- [ ] Incomplete data safety form
- [ ] Login issues for reviewers
- [ ] Policy violations in content

### After Approval
- [ ] Monitor crash reports in Android Vitals
- [ ] Respond to user reviews
- [ ] Track installs and ratings
- [ ] Plan update schedule

---

## Post-Launch Optimization

### App Store Optimization (ASO)
- [ ] Monitor keyword rankings
- [ ] A/B test screenshots
- [ ] Update description based on feedback
- [ ] Add seasonal keywords

### User Feedback
- [ ] Set up review response workflow
- [ ] Create FAQ for common issues
- [ ] Monitor feature requests

---

## Useful Links

- [Google Play Console](https://play.google.com/console)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [Policy Center](https://play.google.com/about/developer-content-policy/)
- [Android Vitals](https://play.google.com/console/about/vitals/)
