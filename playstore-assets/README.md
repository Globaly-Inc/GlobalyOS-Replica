# GlobalyOS - Google Play Store Assets

This folder contains all documentation and placeholder files needed for Google Play Store submission.

## Quick Start

1. **Build the AAB:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab`

2. **Prepare Graphics:**
   - Replace placeholder images in `/graphics`
   - Create screenshots following `/screenshots/SCREENSHOT_GUIDE.md`

3. **Submit to Play Console:**
   - Follow checklist in `PLAYSTORE_SUBMISSION.md`
   - Copy text from `/store-listing` files
   - Complete data safety using `DATA_SAFETY.md`

## Folder Structure

```
playstore-assets/
├── README.md                    # This file
├── PLAYSTORE_SUBMISSION.md      # Step-by-step submission checklist
├── DATA_SAFETY.md               # Data safety declaration reference
├── store-listing/               # Text content for store listing
├── graphics/                    # App icon & feature graphic
├── screenshots/                 # Screenshot requirements & storage
└── legal/                       # Policy URLs
```

## Key Information

| Field | Value |
|-------|-------|
| App Name | GlobalyOS |
| Package Name | app.lovable.e82dc3a3760d4b67b09d75a73e25acd5 |
| Category | Business (Primary), Productivity (Secondary) |
| Content Rating | PEGI 3 / Everyone |
| Target Audience | 18+ (Business users) |
| Contains Ads | No |

## Required Assets Checklist

- [ ] App Icon (512x512 PNG, no transparency)
- [ ] Feature Graphic (1024x500 PNG/JPG)
- [ ] Phone Screenshots (min 2, max 8) - 1080x1920
- [ ] Short Description (80 chars) - ✅ Ready in `/store-listing`
- [ ] Full Description (4000 chars) - ✅ Ready in `/store-listing`
- [ ] Privacy Policy URL - ✅ Ready in `/legal`
- [ ] Support URL - ✅ Ready in `/legal`

## Support

- Website: https://www.globalyos.com
- Support: https://www.globalyos.com/support
- Privacy: https://www.globalyos.com/privacy
