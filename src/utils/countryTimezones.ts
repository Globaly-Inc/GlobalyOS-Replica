/**
 * Country to Timezone Mapping Utilities
 * Maps ISO 3166-1 alpha-2 country codes to IANA timezones
 */

// Primary timezone for each country
export const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  // Oceania
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
  FJ: 'Pacific/Fiji',
  PG: 'Pacific/Port_Moresby',
  
  // Asia - East
  JP: 'Asia/Tokyo',
  CN: 'Asia/Shanghai',
  HK: 'Asia/Hong_Kong',
  TW: 'Asia/Taipei',
  KR: 'Asia/Seoul',
  MN: 'Asia/Ulaanbaatar',
  
  // Asia - Southeast
  SG: 'Asia/Singapore',
  MY: 'Asia/Kuala_Lumpur',
  TH: 'Asia/Bangkok',
  VN: 'Asia/Ho_Chi_Minh',
  PH: 'Asia/Manila',
  ID: 'Asia/Jakarta',
  MM: 'Asia/Yangon',
  KH: 'Asia/Phnom_Penh',
  LA: 'Asia/Vientiane',
  BN: 'Asia/Brunei',
  
  // Asia - South
  IN: 'Asia/Kolkata',
  NP: 'Asia/Kathmandu',
  PK: 'Asia/Karachi',
  BD: 'Asia/Dhaka',
  LK: 'Asia/Colombo',
  MV: 'Indian/Maldives',
  BT: 'Asia/Thimphu',
  
  // Asia - Central
  KZ: 'Asia/Almaty',
  UZ: 'Asia/Tashkent',
  
  // Asia - Middle East
  AE: 'Asia/Dubai',
  SA: 'Asia/Riyadh',
  QA: 'Asia/Qatar',
  KW: 'Asia/Kuwait',
  BH: 'Asia/Bahrain',
  OM: 'Asia/Muscat',
  IL: 'Asia/Jerusalem',
  JO: 'Asia/Amman',
  LB: 'Asia/Beirut',
  TR: 'Europe/Istanbul',
  IQ: 'Asia/Baghdad',
  IR: 'Asia/Tehran',
  
  // Europe - Western
  GB: 'Europe/London',
  IE: 'Europe/Dublin',
  PT: 'Europe/Lisbon',
  ES: 'Europe/Madrid',
  FR: 'Europe/Paris',
  BE: 'Europe/Brussels',
  NL: 'Europe/Amsterdam',
  LU: 'Europe/Luxembourg',
  MC: 'Europe/Monaco',
  
  // Europe - Central
  DE: 'Europe/Berlin',
  AT: 'Europe/Vienna',
  CH: 'Europe/Zurich',
  IT: 'Europe/Rome',
  PL: 'Europe/Warsaw',
  CZ: 'Europe/Prague',
  SK: 'Europe/Bratislava',
  HU: 'Europe/Budapest',
  SI: 'Europe/Ljubljana',
  HR: 'Europe/Zagreb',
  
  // Europe - Nordic
  SE: 'Europe/Stockholm',
  NO: 'Europe/Oslo',
  DK: 'Europe/Copenhagen',
  FI: 'Europe/Helsinki',
  IS: 'Atlantic/Reykjavik',
  
  // Europe - Eastern
  RU: 'Europe/Moscow',
  UA: 'Europe/Kiev',
  BY: 'Europe/Minsk',
  RO: 'Europe/Bucharest',
  BG: 'Europe/Sofia',
  GR: 'Europe/Athens',
  
  // Europe - Baltic
  EE: 'Europe/Tallinn',
  LV: 'Europe/Riga',
  LT: 'Europe/Vilnius',
  
  // Americas - North
  US: 'America/New_York',
  CA: 'America/Toronto',
  MX: 'America/Mexico_City',
  
  // Americas - Central
  GT: 'America/Guatemala',
  BZ: 'America/Belize',
  SV: 'America/El_Salvador',
  HN: 'America/Tegucigalpa',
  NI: 'America/Managua',
  CR: 'America/Costa_Rica',
  PA: 'America/Panama',
  
  // Americas - Caribbean
  CU: 'America/Havana',
  JM: 'America/Jamaica',
  PR: 'America/Puerto_Rico',
  DO: 'America/Santo_Domingo',
  
  // Americas - South
  BR: 'America/Sao_Paulo',
  AR: 'America/Buenos_Aires',
  CL: 'America/Santiago',
  CO: 'America/Bogota',
  PE: 'America/Lima',
  VE: 'America/Caracas',
  EC: 'America/Guayaquil',
  BO: 'America/La_Paz',
  PY: 'America/Asuncion',
  UY: 'America/Montevideo',
  
  // Africa - North
  EG: 'Africa/Cairo',
  MA: 'Africa/Casablanca',
  TN: 'Africa/Tunis',
  DZ: 'Africa/Algiers',
  LY: 'Africa/Tripoli',
  
  // Africa - West
  NG: 'Africa/Lagos',
  GH: 'Africa/Accra',
  SN: 'Africa/Dakar',
  CI: 'Africa/Abidjan',
  
  // Africa - East
  KE: 'Africa/Nairobi',
  TZ: 'Africa/Dar_es_Salaam',
  UG: 'Africa/Kampala',
  ET: 'Africa/Addis_Ababa',
  RW: 'Africa/Kigali',
  
  // Africa - Southern
  ZA: 'Africa/Johannesburg',
  ZW: 'Africa/Harare',
  BW: 'Africa/Gaborone',
  NA: 'Africa/Windhoek',
  MU: 'Indian/Mauritius',
};

// Countries with multiple major timezones
export const COUNTRY_ALTERNATE_TIMEZONES: Record<string, string[]> = {
  AU: [
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Australia/Perth',
    'Australia/Adelaide',
    'Australia/Darwin',
    'Australia/Hobart',
  ],
  US: [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
  ],
  CA: [
    'America/Toronto',
    'America/Vancouver',
    'America/Edmonton',
    'America/Winnipeg',
    'America/Halifax',
    'America/St_Johns',
  ],
  RU: [
    'Europe/Moscow',
    'Europe/Kaliningrad',
    'Asia/Yekaterinburg',
    'Asia/Novosibirsk',
    'Asia/Krasnoyarsk',
    'Asia/Irkutsk',
    'Asia/Vladivostok',
  ],
  BR: [
    'America/Sao_Paulo',
    'America/Rio_Branco',
    'America/Manaus',
    'America/Fortaleza',
    'America/Recife',
  ],
  ID: [
    'Asia/Jakarta',
    'Asia/Makassar',
    'Asia/Jayapura',
  ],
  MX: [
    'America/Mexico_City',
    'America/Cancun',
    'America/Tijuana',
    'America/Hermosillo',
  ],
  CN: [
    'Asia/Shanghai',
    'Asia/Urumqi',
  ],
};

/**
 * Get the primary timezone for a country code
 */
export function getTimezoneForCountry(countryCode?: string): string {
  if (!countryCode) return 'UTC';
  const code = countryCode.toUpperCase();
  return COUNTRY_TIMEZONE_MAP[code] || 'UTC';
}

/**
 * Get all available timezones for a country (for countries with multiple zones)
 */
export function getTimezonesForCountry(countryCode?: string): string[] {
  if (!countryCode) return ['UTC'];
  const code = countryCode.toUpperCase();
  return COUNTRY_ALTERNATE_TIMEZONES[code] || [COUNTRY_TIMEZONE_MAP[code] || 'UTC'];
}

/**
 * Check if a country has multiple timezones
 */
export function hasMultipleTimezones(countryCode?: string): boolean {
  if (!countryCode) return false;
  return countryCode.toUpperCase() in COUNTRY_ALTERNATE_TIMEZONES;
}
