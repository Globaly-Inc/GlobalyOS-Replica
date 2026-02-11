/**
 * Phone country codes, dial codes, placeholders, and validation
 */

export interface PhoneCountry {
  code: string;
  name: string;
  dialCode: string;
  format: string;
  minDigits: number;
  maxDigits: number;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'AF', name: 'Afghanistan', dialCode: '+93', format: '70 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'AL', name: 'Albania', dialCode: '+355', format: '66 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'DZ', name: 'Algeria', dialCode: '+213', format: '551 23 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'AR', name: 'Argentina', dialCode: '+54', format: '11 2345 6789', minDigits: 10, maxDigits: 10 },
  { code: 'AM', name: 'Armenia', dialCode: '+374', format: '77 123456', minDigits: 8, maxDigits: 8 },
  { code: 'AU', name: 'Australia', dialCode: '+61', format: '412 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'AT', name: 'Austria', dialCode: '+43', format: '664 123 4567', minDigits: 10, maxDigits: 11 },
  { code: 'AZ', name: 'Azerbaijan', dialCode: '+994', format: '40 123 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', format: '3600 1234', minDigits: 8, maxDigits: 8 },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', format: '1812 345678', minDigits: 10, maxDigits: 10 },
  { code: 'BY', name: 'Belarus', dialCode: '+375', format: '29 491 23 45', minDigits: 9, maxDigits: 10 },
  { code: 'BE', name: 'Belgium', dialCode: '+32', format: '470 12 34 56', minDigits: 9, maxDigits: 9 },
  { code: 'BR', name: 'Brazil', dialCode: '+55', format: '11 91234 5678', minDigits: 10, maxDigits: 11 },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359', format: '48 123 456', minDigits: 8, maxDigits: 9 },
  { code: 'CA', name: 'Canada', dialCode: '+1', format: '(201) 555-0123', minDigits: 10, maxDigits: 10 },
  { code: 'CL', name: 'Chile', dialCode: '+56', format: '9 1234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'CN', name: 'China', dialCode: '+86', format: '131 2345 6789', minDigits: 11, maxDigits: 11 },
  { code: 'CO', name: 'Colombia', dialCode: '+57', format: '321 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'HR', name: 'Croatia', dialCode: '+385', format: '91 234 5678', minDigits: 8, maxDigits: 9 },
  { code: 'CY', name: 'Cyprus', dialCode: '+357', format: '96 123456', minDigits: 8, maxDigits: 8 },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', format: '601 123 456', minDigits: 9, maxDigits: 9 },
  { code: 'DK', name: 'Denmark', dialCode: '+45', format: '32 12 34 56', minDigits: 8, maxDigits: 8 },
  { code: 'EG', name: 'Egypt', dialCode: '+20', format: '100 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'EE', name: 'Estonia', dialCode: '+372', format: '5123 4567', minDigits: 7, maxDigits: 8 },
  { code: 'FI', name: 'Finland', dialCode: '+358', format: '41 234 5678', minDigits: 9, maxDigits: 10 },
  { code: 'FR', name: 'France', dialCode: '+33', format: '6 12 34 56 78', minDigits: 9, maxDigits: 9 },
  { code: 'GE', name: 'Georgia', dialCode: '+995', format: '555 12 34 56', minDigits: 9, maxDigits: 9 },
  { code: 'DE', name: 'Germany', dialCode: '+49', format: '151 2345 6789', minDigits: 10, maxDigits: 11 },
  { code: 'GH', name: 'Ghana', dialCode: '+233', format: '23 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'GR', name: 'Greece', dialCode: '+30', format: '691 234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', format: '5123 4567', minDigits: 8, maxDigits: 8 },
  { code: 'HU', name: 'Hungary', dialCode: '+36', format: '20 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'IS', name: 'Iceland', dialCode: '+354', format: '611 1234', minDigits: 7, maxDigits: 7 },
  { code: 'IN', name: 'India', dialCode: '+91', format: '98765 43210', minDigits: 10, maxDigits: 10 },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', format: '812 345 6789', minDigits: 9, maxDigits: 12 },
  { code: 'IR', name: 'Iran', dialCode: '+98', format: '912 345 6789', minDigits: 10, maxDigits: 10 },
  { code: 'IQ', name: 'Iraq', dialCode: '+964', format: '791 234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'IE', name: 'Ireland', dialCode: '+353', format: '85 012 3456', minDigits: 9, maxDigits: 9 },
  { code: 'IL', name: 'Israel', dialCode: '+972', format: '50 234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'IT', name: 'Italy', dialCode: '+39', format: '312 345 6789', minDigits: 9, maxDigits: 10 },
  { code: 'JP', name: 'Japan', dialCode: '+81', format: '90 1234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'JO', name: 'Jordan', dialCode: '+962', format: '7 9012 3456', minDigits: 9, maxDigits: 9 },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '+7', format: '701 234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'KE', name: 'Kenya', dialCode: '+254', format: '712 345678', minDigits: 9, maxDigits: 9 },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', format: '500 12345', minDigits: 8, maxDigits: 8 },
  { code: 'LV', name: 'Latvia', dialCode: '+371', format: '2123 4567', minDigits: 8, maxDigits: 8 },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', format: '71 123 456', minDigits: 7, maxDigits: 8 },
  { code: 'LT', name: 'Lithuania', dialCode: '+370', format: '612 34567', minDigits: 8, maxDigits: 8 },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352', format: '628 123 456', minDigits: 9, maxDigits: 9 },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', format: '12 345 6789', minDigits: 9, maxDigits: 10 },
  { code: 'MT', name: 'Malta', dialCode: '+356', format: '9696 1234', minDigits: 8, maxDigits: 8 },
  { code: 'MX', name: 'Mexico', dialCode: '+52', format: '222 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'MA', name: 'Morocco', dialCode: '+212', format: '650 123456', minDigits: 9, maxDigits: 9 },
  { code: 'NP', name: 'Nepal', dialCode: '+977', format: '984 1234567', minDigits: 10, maxDigits: 10 },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', format: '6 12345678', minDigits: 9, maxDigits: 9 },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', format: '21 123 4567', minDigits: 8, maxDigits: 10 },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', format: '802 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'NO', name: 'Norway', dialCode: '+47', format: '406 12 345', minDigits: 8, maxDigits: 8 },
  { code: 'OM', name: 'Oman', dialCode: '+968', format: '9212 3456', minDigits: 8, maxDigits: 8 },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', format: '301 2345678', minDigits: 10, maxDigits: 10 },
  { code: 'PA', name: 'Panama', dialCode: '+507', format: '6123 4567', minDigits: 7, maxDigits: 8 },
  { code: 'PE', name: 'Peru', dialCode: '+51', format: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'PH', name: 'Philippines', dialCode: '+63', format: '905 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'PL', name: 'Poland', dialCode: '+48', format: '512 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'PT', name: 'Portugal', dialCode: '+351', format: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'QA', name: 'Qatar', dialCode: '+974', format: '3312 3456', minDigits: 8, maxDigits: 8 },
  { code: 'RO', name: 'Romania', dialCode: '+40', format: '712 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'RU', name: 'Russia', dialCode: '+7', format: '912 345 67 89', minDigits: 10, maxDigits: 10 },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', format: '51 234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'RS', name: 'Serbia', dialCode: '+381', format: '60 1234567', minDigits: 8, maxDigits: 9 },
  { code: 'SG', name: 'Singapore', dialCode: '+65', format: '8123 4567', minDigits: 8, maxDigits: 8 },
  { code: 'SK', name: 'Slovakia', dialCode: '+421', format: '912 123 456', minDigits: 9, maxDigits: 9 },
  { code: 'SI', name: 'Slovenia', dialCode: '+386', format: '31 234 567', minDigits: 8, maxDigits: 8 },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', format: '71 234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'KR', name: 'South Korea', dialCode: '+82', format: '10 1234 5678', minDigits: 9, maxDigits: 10 },
  { code: 'ES', name: 'Spain', dialCode: '+34', format: '612 34 56 78', minDigits: 9, maxDigits: 9 },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', format: '71 234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'SE', name: 'Sweden', dialCode: '+46', format: '70 123 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', format: '78 123 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', format: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'TH', name: 'Thailand', dialCode: '+66', format: '81 234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'TR', name: 'Turkey', dialCode: '+90', format: '501 234 56 78', minDigits: 10, maxDigits: 10 },
  { code: 'UA', name: 'Ukraine', dialCode: '+380', format: '50 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', format: '50 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', format: '7911 123456', minDigits: 10, maxDigits: 11 },
  { code: 'US', name: 'United States', dialCode: '+1', format: '(201) 555-0123', minDigits: 10, maxDigits: 10 },
  { code: 'UY', name: 'Uruguay', dialCode: '+598', format: '94 123 456', minDigits: 8, maxDigits: 8 },
  { code: 'UZ', name: 'Uzbekistan', dialCode: '+998', format: '91 234 56 78', minDigits: 9, maxDigits: 9 },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', format: '412 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', format: '91 234 56 78', minDigits: 9, maxDigits: 9 },
];

/**
 * Get a PhoneCountry by ISO code
 */
export const getPhoneCountry = (code: string): PhoneCountry | undefined =>
  PHONE_COUNTRIES.find(c => c.code.toUpperCase() === code.toUpperCase());

/**
 * Auto-detect country code from browser locale
 */
// Map IANA timezones to country codes for reliable geo-detection
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU', 'Australia/Lord_Howe': 'AU', 'Australia/Lindeman': 'AU',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
  'America/Phoenix': 'US', 'America/Indianapolis': 'US', 'America/Detroit': 'US',
  'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT',
  'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO', 'Europe/Sofia': 'BG',
  'Europe/Athens': 'GR', 'Europe/Istanbul': 'TR', 'Europe/Moscow': 'RU',
  'Europe/Dublin': 'IE', 'Europe/Lisbon': 'PT', 'Europe/Belgrade': 'RS',
  'Europe/Zagreb': 'HR', 'Europe/Bratislava': 'SK', 'Europe/Ljubljana': 'SI',
  'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT',
  'Europe/Luxembourg': 'LU', 'Europe/Malta': 'MT', 'Europe/Nicosia': 'CY',
  'Europe/Reykjavik': 'IS', 'Europe/Minsk': 'BY', 'Europe/Kiev': 'UA',
  'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK',
  'Asia/Singapore': 'SG', 'Asia/Seoul': 'KR', 'Asia/Taipei': 'TW',
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP',
  'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Kuala_Lumpur': 'MY',
  'Asia/Manila': 'PH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH',
  'Asia/Kuwait': 'KW', 'Asia/Muscat': 'OM', 'Asia/Baghdad': 'IQ',
  'Asia/Tehran': 'IR', 'Asia/Jerusalem': 'IL', 'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB', 'Asia/Tbilisi': 'GE', 'Asia/Yerevan': 'AM',
  'Asia/Baku': 'AZ', 'Asia/Almaty': 'KZ', 'Asia/Tashkent': 'UZ',
  'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
  'Africa/Johannesburg': 'ZA', 'Africa/Casablanca': 'MA', 'Africa/Accra': 'GH',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA',
  'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL', 'America/Bogota': 'CO', 'America/Lima': 'PE',
  'America/Mexico_City': 'MX', 'America/Caracas': 'VE', 'America/Montevideo': 'UY',
  'America/Panama': 'PA', 'Pacific/Auckland': 'NZ',
};

export const getDefaultCountryCode = (): string => {
  // 1. Try timezone first (most reliable for geographic location)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzCountry = TIMEZONE_TO_COUNTRY[tz];
    if (tzCountry && getPhoneCountry(tzCountry)) return tzCountry;
  } catch {}

  // 2. Fall back to navigator.language region subtag
  try {
    const lang = navigator.language || (navigator as any).userLanguage || '';
    const parts = lang.split('-');
    const region = parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
    if (getPhoneCountry(region)) return region;
  } catch {}

  return 'US';
};

/**
 * Validate phone number: digits only, within min/max length for country
 */
export const validatePhoneNumber = (phone: string, countryCode: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return false;
  const country = getPhoneCountry(countryCode);
  if (!country) return digits.length >= 7 && digits.length <= 15;
  return digits.length >= country.minDigits && digits.length <= country.maxDigits;
};

/**
 * Get the flag emoji for a country code
 */
export const getPhoneCountryFlag = (code: string): string => {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
  );
};
