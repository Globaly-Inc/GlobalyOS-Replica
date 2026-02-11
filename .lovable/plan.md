

## Make Phone Compulsory with Country Code Selector

### What
Replace the simple phone input with a two-part phone field: a searchable country code dropdown (with flags) on the left, and a phone number input on the right with country-specific placeholder formatting. Phone becomes a required field. The country code auto-detects from the user's browser locale.

### Changes

**1. New file: `src/lib/phoneCountries.ts`**
Create a data file mapping country codes to their dial codes and phone number placeholder formats:
```
{ code: 'US', dialCode: '+1', format: '(201) 555-0123' },
{ code: 'GB', dialCode: '+44', format: '7911 123456' },
{ code: 'IN', dialCode: '+91', format: '98765 43210' },
...
```
Include a helper function `getDefaultCountryCode()` that reads `navigator.language` (e.g. `en-US` -> `US`, `en-GB` -> `GB`) to auto-select the user's country. Also include a `validatePhoneNumber(phone, countryCode)` function with basic length/digit validation per country.

**2. New component: `src/components/ui/phone-input.tsx`**
A reusable `PhoneInput` component containing:
- A split row layout (`flex gap-2`)
- Left side (~35% width): A `Popover` + `Command` searchable dropdown (reusing the same pattern as `CountrySelector`) showing flag emoji + dial code. Scrollable, searchable by country name or dial code.
- Right side (~65% width): A standard `Input` for the phone number, with a dynamic placeholder based on the selected country.
- Props: `countryCode`, `onCountryChange`, `phone`, `onPhoneChange`, `required`, `error`

**3. Edit: `src/pages/careers/JobDetailPublic.tsx`**
- Add state for `phoneCountryCode` (initialized via `getDefaultCountryCode()`)
- Replace the plain phone `Input` (lines 421-429) with the new `PhoneInput` component
- Make phone required: add `*` to the label, add validation in `handleSubmit` that checks the phone is not empty and passes `validatePhoneNumber`
- On submission, concatenate the dial code + phone number before sending (e.g. `+1 2015550123`)
- Update the mutation type to make `phone` required instead of optional

### Technical Details
- The country code dropdown reuses the existing `Popover` + `Command` pattern from `CountrySelector` for consistency
- Phone validation is basic but covers digit count ranges per country (e.g. US: 10 digits, UK: 10-11 digits, IN: 10 digits)
- Auto-detection uses `navigator.language` which is available in all modern browsers
- The `PhoneInput` component is fully reusable across the app
