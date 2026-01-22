/**
 * Centralized Timezone Database
 * 
 * Single source of truth for all timezone data across the application.
 * Provides comprehensive timezone list with country associations, flags, and search aliases.
 */

import { getFlagEmoji } from '@/lib/countries';

// ============================================================================
// Core Data Types
// ============================================================================

export interface TimezoneInfo {
  /** IANA timezone identifier (e.g., 'Asia/Kolkata') */
  timezone: string;
  /** ISO 3166-1 alpha-2 country code (e.g., 'IN') */
  countryCode: string;
  /** Display city/location name (e.g., 'Kolkata') */
  city: string;
  /** Region for grouping (e.g., 'Asia - South') */
  region: string;
  /** Searchable aliases (e.g., ['India', 'Mumbai', 'Delhi']) */
  aliases?: string[];
}

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  flag: string;
  countryCode: string;
}

export interface TimezoneGroup {
  region: string;
  timezones: TimezoneOption[];
}

// ============================================================================
// Comprehensive Timezone Database
// ============================================================================

export const TIMEZONE_DATABASE: TimezoneInfo[] = [
  // ========== ASIA - SOUTH ==========
  { timezone: 'Asia/Kolkata', countryCode: 'IN', city: 'Kolkata', region: 'Asia - South', aliases: ['India', 'Mumbai', 'Delhi', 'Chennai', 'Bangalore', 'Hyderabad', 'IST', 'Indian Standard Time'] },
  { timezone: 'Asia/Kathmandu', countryCode: 'NP', city: 'Kathmandu', region: 'Asia - South', aliases: ['Nepal', 'NPT'] },
  { timezone: 'Asia/Dhaka', countryCode: 'BD', city: 'Dhaka', region: 'Asia - South', aliases: ['Bangladesh', 'BST'] },
  { timezone: 'Asia/Karachi', countryCode: 'PK', city: 'Karachi', region: 'Asia - South', aliases: ['Pakistan', 'Lahore', 'Islamabad', 'PKT'] },
  { timezone: 'Asia/Colombo', countryCode: 'LK', city: 'Colombo', region: 'Asia - South', aliases: ['Sri Lanka'] },
  { timezone: 'Indian/Maldives', countryCode: 'MV', city: 'Maldives', region: 'Asia - South', aliases: ['Male'] },
  { timezone: 'Asia/Thimphu', countryCode: 'BT', city: 'Thimphu', region: 'Asia - South', aliases: ['Bhutan'] },

  // ========== ASIA - EAST ==========
  { timezone: 'Asia/Tokyo', countryCode: 'JP', city: 'Tokyo', region: 'Asia - East', aliases: ['Japan', 'Osaka', 'JST'] },
  { timezone: 'Asia/Seoul', countryCode: 'KR', city: 'Seoul', region: 'Asia - East', aliases: ['Korea', 'South Korea', 'KST', 'Busan'] },
  { timezone: 'Asia/Shanghai', countryCode: 'CN', city: 'Shanghai', region: 'Asia - East', aliases: ['China', 'Beijing', 'CST', 'Shenzhen', 'Guangzhou'] },
  { timezone: 'Asia/Hong_Kong', countryCode: 'HK', city: 'Hong Kong', region: 'Asia - East', aliases: ['HKT'] },
  { timezone: 'Asia/Taipei', countryCode: 'TW', city: 'Taipei', region: 'Asia - East', aliases: ['Taiwan'] },
  { timezone: 'Asia/Ulaanbaatar', countryCode: 'MN', city: 'Ulaanbaatar', region: 'Asia - East', aliases: ['Mongolia'] },

  // ========== ASIA - SOUTHEAST ==========
  { timezone: 'Asia/Singapore', countryCode: 'SG', city: 'Singapore', region: 'Asia - Southeast', aliases: ['SGT'] },
  { timezone: 'Asia/Kuala_Lumpur', countryCode: 'MY', city: 'Kuala Lumpur', region: 'Asia - Southeast', aliases: ['Malaysia', 'MYT'] },
  { timezone: 'Asia/Bangkok', countryCode: 'TH', city: 'Bangkok', region: 'Asia - Southeast', aliases: ['Thailand', 'ICT'] },
  { timezone: 'Asia/Ho_Chi_Minh', countryCode: 'VN', city: 'Ho Chi Minh', region: 'Asia - Southeast', aliases: ['Vietnam', 'Saigon', 'Hanoi', 'ICT'] },
  { timezone: 'Asia/Jakarta', countryCode: 'ID', city: 'Jakarta', region: 'Asia - Southeast', aliases: ['Indonesia', 'WIB'] },
  { timezone: 'Asia/Makassar', countryCode: 'ID', city: 'Makassar', region: 'Asia - Southeast', aliases: ['Indonesia Central', 'WITA', 'Bali'] },
  { timezone: 'Asia/Jayapura', countryCode: 'ID', city: 'Jayapura', region: 'Asia - Southeast', aliases: ['Indonesia East', 'WIT'] },
  { timezone: 'Asia/Manila', countryCode: 'PH', city: 'Manila', region: 'Asia - Southeast', aliases: ['Philippines', 'PHT'] },
  { timezone: 'Asia/Yangon', countryCode: 'MM', city: 'Yangon', region: 'Asia - Southeast', aliases: ['Myanmar', 'Burma', 'Rangoon', 'MMT'] },
  { timezone: 'Asia/Phnom_Penh', countryCode: 'KH', city: 'Phnom Penh', region: 'Asia - Southeast', aliases: ['Cambodia', 'ICT'] },
  { timezone: 'Asia/Vientiane', countryCode: 'LA', city: 'Vientiane', region: 'Asia - Southeast', aliases: ['Laos', 'ICT'] },
  { timezone: 'Asia/Brunei', countryCode: 'BN', city: 'Brunei', region: 'Asia - Southeast', aliases: ['Bandar Seri Begawan'] },

  // ========== ASIA - MIDDLE EAST ==========
  { timezone: 'Asia/Dubai', countryCode: 'AE', city: 'Dubai', region: 'Middle East', aliases: ['UAE', 'United Arab Emirates', 'Abu Dhabi', 'GST'] },
  { timezone: 'Asia/Riyadh', countryCode: 'SA', city: 'Riyadh', region: 'Middle East', aliases: ['Saudi Arabia', 'Jeddah', 'AST'] },
  { timezone: 'Asia/Qatar', countryCode: 'QA', city: 'Doha', region: 'Middle East', aliases: ['Qatar'] },
  { timezone: 'Asia/Kuwait', countryCode: 'KW', city: 'Kuwait', region: 'Middle East', aliases: ['Kuwait City'] },
  { timezone: 'Asia/Bahrain', countryCode: 'BH', city: 'Bahrain', region: 'Middle East', aliases: ['Manama'] },
  { timezone: 'Asia/Muscat', countryCode: 'OM', city: 'Muscat', region: 'Middle East', aliases: ['Oman'] },
  { timezone: 'Asia/Jerusalem', countryCode: 'IL', city: 'Jerusalem', region: 'Middle East', aliases: ['Israel', 'Tel Aviv', 'IST'] },
  { timezone: 'Asia/Amman', countryCode: 'JO', city: 'Amman', region: 'Middle East', aliases: ['Jordan'] },
  { timezone: 'Asia/Beirut', countryCode: 'LB', city: 'Beirut', region: 'Middle East', aliases: ['Lebanon'] },
  { timezone: 'Europe/Istanbul', countryCode: 'TR', city: 'Istanbul', region: 'Middle East', aliases: ['Turkey', 'Ankara', 'TRT'] },
  { timezone: 'Asia/Baghdad', countryCode: 'IQ', city: 'Baghdad', region: 'Middle East', aliases: ['Iraq'] },
  { timezone: 'Asia/Tehran', countryCode: 'IR', city: 'Tehran', region: 'Middle East', aliases: ['Iran', 'IRST'] },

  // ========== ASIA - CENTRAL ==========
  { timezone: 'Asia/Almaty', countryCode: 'KZ', city: 'Almaty', region: 'Asia - Central', aliases: ['Kazakhstan'] },
  { timezone: 'Asia/Tashkent', countryCode: 'UZ', city: 'Tashkent', region: 'Asia - Central', aliases: ['Uzbekistan'] },

  // ========== EUROPE - WESTERN ==========
  { timezone: 'Europe/London', countryCode: 'GB', city: 'London', region: 'Europe - Western', aliases: ['UK', 'United Kingdom', 'England', 'Britain', 'GMT', 'BST'] },
  { timezone: 'Europe/Dublin', countryCode: 'IE', city: 'Dublin', region: 'Europe - Western', aliases: ['Ireland', 'IST'] },
  { timezone: 'Europe/Lisbon', countryCode: 'PT', city: 'Lisbon', region: 'Europe - Western', aliases: ['Portugal', 'WET'] },
  { timezone: 'Europe/Madrid', countryCode: 'ES', city: 'Madrid', region: 'Europe - Western', aliases: ['Spain', 'Barcelona', 'CET'] },
  { timezone: 'Europe/Paris', countryCode: 'FR', city: 'Paris', region: 'Europe - Western', aliases: ['France', 'CET', 'Lyon', 'Marseille'] },
  { timezone: 'Europe/Brussels', countryCode: 'BE', city: 'Brussels', region: 'Europe - Western', aliases: ['Belgium', 'CET'] },
  { timezone: 'Europe/Amsterdam', countryCode: 'NL', city: 'Amsterdam', region: 'Europe - Western', aliases: ['Netherlands', 'Holland', 'CET', 'Rotterdam'] },
  { timezone: 'Europe/Luxembourg', countryCode: 'LU', city: 'Luxembourg', region: 'Europe - Western', aliases: ['CET'] },
  { timezone: 'Europe/Monaco', countryCode: 'MC', city: 'Monaco', region: 'Europe - Western', aliases: ['CET'] },

  // ========== EUROPE - CENTRAL ==========
  { timezone: 'Europe/Berlin', countryCode: 'DE', city: 'Berlin', region: 'Europe - Central', aliases: ['Germany', 'Munich', 'Frankfurt', 'Hamburg', 'CET'] },
  { timezone: 'Europe/Vienna', countryCode: 'AT', city: 'Vienna', region: 'Europe - Central', aliases: ['Austria', 'CET'] },
  { timezone: 'Europe/Zurich', countryCode: 'CH', city: 'Zurich', region: 'Europe - Central', aliases: ['Switzerland', 'Geneva', 'Bern', 'CET'] },
  { timezone: 'Europe/Rome', countryCode: 'IT', city: 'Rome', region: 'Europe - Central', aliases: ['Italy', 'Milan', 'CET'] },
  { timezone: 'Europe/Warsaw', countryCode: 'PL', city: 'Warsaw', region: 'Europe - Central', aliases: ['Poland', 'CET', 'Krakow'] },
  { timezone: 'Europe/Prague', countryCode: 'CZ', city: 'Prague', region: 'Europe - Central', aliases: ['Czech Republic', 'Czechia', 'CET'] },
  { timezone: 'Europe/Bratislava', countryCode: 'SK', city: 'Bratislava', region: 'Europe - Central', aliases: ['Slovakia', 'CET'] },
  { timezone: 'Europe/Budapest', countryCode: 'HU', city: 'Budapest', region: 'Europe - Central', aliases: ['Hungary', 'CET'] },
  { timezone: 'Europe/Ljubljana', countryCode: 'SI', city: 'Ljubljana', region: 'Europe - Central', aliases: ['Slovenia', 'CET'] },
  { timezone: 'Europe/Zagreb', countryCode: 'HR', city: 'Zagreb', region: 'Europe - Central', aliases: ['Croatia', 'CET'] },

  // ========== EUROPE - NORDIC ==========
  { timezone: 'Europe/Stockholm', countryCode: 'SE', city: 'Stockholm', region: 'Europe - Nordic', aliases: ['Sweden', 'CET'] },
  { timezone: 'Europe/Oslo', countryCode: 'NO', city: 'Oslo', region: 'Europe - Nordic', aliases: ['Norway', 'CET'] },
  { timezone: 'Europe/Copenhagen', countryCode: 'DK', city: 'Copenhagen', region: 'Europe - Nordic', aliases: ['Denmark', 'CET'] },
  { timezone: 'Europe/Helsinki', countryCode: 'FI', city: 'Helsinki', region: 'Europe - Nordic', aliases: ['Finland', 'EET'] },
  { timezone: 'Atlantic/Reykjavik', countryCode: 'IS', city: 'Reykjavik', region: 'Europe - Nordic', aliases: ['Iceland', 'GMT'] },

  // ========== EUROPE - EASTERN ==========
  { timezone: 'Europe/Moscow', countryCode: 'RU', city: 'Moscow', region: 'Europe - Eastern', aliases: ['Russia', 'MSK', 'Saint Petersburg'] },
  { timezone: 'Europe/Kyiv', countryCode: 'UA', city: 'Kyiv', region: 'Europe - Eastern', aliases: ['Ukraine', 'Kiev', 'EET'] },
  { timezone: 'Europe/Minsk', countryCode: 'BY', city: 'Minsk', region: 'Europe - Eastern', aliases: ['Belarus'] },
  { timezone: 'Europe/Bucharest', countryCode: 'RO', city: 'Bucharest', region: 'Europe - Eastern', aliases: ['Romania', 'EET'] },
  { timezone: 'Europe/Sofia', countryCode: 'BG', city: 'Sofia', region: 'Europe - Eastern', aliases: ['Bulgaria', 'EET'] },
  { timezone: 'Europe/Athens', countryCode: 'GR', city: 'Athens', region: 'Europe - Eastern', aliases: ['Greece', 'EET'] },

  // ========== EUROPE - BALTIC ==========
  { timezone: 'Europe/Tallinn', countryCode: 'EE', city: 'Tallinn', region: 'Europe - Baltic', aliases: ['Estonia', 'EET'] },
  { timezone: 'Europe/Riga', countryCode: 'LV', city: 'Riga', region: 'Europe - Baltic', aliases: ['Latvia', 'EET'] },
  { timezone: 'Europe/Vilnius', countryCode: 'LT', city: 'Vilnius', region: 'Europe - Baltic', aliases: ['Lithuania', 'EET'] },

  // ========== AMERICAS - NORTH (USA) ==========
  { timezone: 'America/New_York', countryCode: 'US', city: 'New York', region: 'Americas - North', aliases: ['USA', 'United States', 'EST', 'EDT', 'Eastern', 'Boston', 'Miami', 'Washington DC', 'Philadelphia', 'Atlanta'] },
  { timezone: 'America/Chicago', countryCode: 'US', city: 'Chicago', region: 'Americas - North', aliases: ['USA', 'Central', 'CST', 'CDT', 'Dallas', 'Houston', 'Minneapolis'] },
  { timezone: 'America/Denver', countryCode: 'US', city: 'Denver', region: 'Americas - North', aliases: ['USA', 'Mountain', 'MST', 'MDT', 'Salt Lake City'] },
  { timezone: 'America/Los_Angeles', countryCode: 'US', city: 'Los Angeles', region: 'Americas - North', aliases: ['USA', 'Pacific', 'PST', 'PDT', 'San Francisco', 'Seattle', 'Las Vegas', 'LA'] },
  { timezone: 'America/Phoenix', countryCode: 'US', city: 'Phoenix', region: 'Americas - North', aliases: ['USA', 'Arizona', 'MST'] },
  { timezone: 'America/Anchorage', countryCode: 'US', city: 'Anchorage', region: 'Americas - North', aliases: ['USA', 'Alaska', 'AKST', 'AKDT'] },
  { timezone: 'Pacific/Honolulu', countryCode: 'US', city: 'Honolulu', region: 'Americas - North', aliases: ['USA', 'Hawaii', 'HST'] },

  // ========== AMERICAS - NORTH (CANADA) ==========
  { timezone: 'America/Toronto', countryCode: 'CA', city: 'Toronto', region: 'Americas - North', aliases: ['Canada', 'Ontario', 'EST', 'EDT', 'Eastern', 'Ottawa', 'Montreal'] },
  { timezone: 'America/Vancouver', countryCode: 'CA', city: 'Vancouver', region: 'Americas - North', aliases: ['Canada', 'British Columbia', 'PST', 'PDT', 'Pacific'] },
  { timezone: 'America/Edmonton', countryCode: 'CA', city: 'Edmonton', region: 'Americas - North', aliases: ['Canada', 'Alberta', 'MST', 'MDT', 'Calgary'] },
  { timezone: 'America/Winnipeg', countryCode: 'CA', city: 'Winnipeg', region: 'Americas - North', aliases: ['Canada', 'Manitoba', 'CST', 'CDT'] },
  { timezone: 'America/Halifax', countryCode: 'CA', city: 'Halifax', region: 'Americas - North', aliases: ['Canada', 'Nova Scotia', 'AST', 'ADT', 'Atlantic'] },
  { timezone: 'America/St_Johns', countryCode: 'CA', city: 'St. Johns', region: 'Americas - North', aliases: ['Canada', 'Newfoundland', 'NST', 'NDT'] },

  // ========== AMERICAS - NORTH (MEXICO) ==========
  { timezone: 'America/Mexico_City', countryCode: 'MX', city: 'Mexico City', region: 'Americas - Central', aliases: ['Mexico', 'CST', 'CDT'] },
  { timezone: 'America/Cancun', countryCode: 'MX', city: 'Cancun', region: 'Americas - Central', aliases: ['Mexico', 'EST'] },
  { timezone: 'America/Tijuana', countryCode: 'MX', city: 'Tijuana', region: 'Americas - Central', aliases: ['Mexico', 'PST', 'PDT'] },

  // ========== AMERICAS - CENTRAL ==========
  { timezone: 'America/Guatemala', countryCode: 'GT', city: 'Guatemala', region: 'Americas - Central', aliases: ['Guatemala City'] },
  { timezone: 'America/Belize', countryCode: 'BZ', city: 'Belize', region: 'Americas - Central', aliases: ['Belmopan'] },
  { timezone: 'America/El_Salvador', countryCode: 'SV', city: 'San Salvador', region: 'Americas - Central', aliases: ['El Salvador'] },
  { timezone: 'America/Tegucigalpa', countryCode: 'HN', city: 'Tegucigalpa', region: 'Americas - Central', aliases: ['Honduras'] },
  { timezone: 'America/Managua', countryCode: 'NI', city: 'Managua', region: 'Americas - Central', aliases: ['Nicaragua'] },
  { timezone: 'America/Costa_Rica', countryCode: 'CR', city: 'San Jose', region: 'Americas - Central', aliases: ['Costa Rica'] },
  { timezone: 'America/Panama', countryCode: 'PA', city: 'Panama', region: 'Americas - Central', aliases: ['Panama City'] },

  // ========== AMERICAS - CARIBBEAN ==========
  { timezone: 'America/Havana', countryCode: 'CU', city: 'Havana', region: 'Americas - Caribbean', aliases: ['Cuba'] },
  { timezone: 'America/Jamaica', countryCode: 'JM', city: 'Kingston', region: 'Americas - Caribbean', aliases: ['Jamaica'] },
  { timezone: 'America/Puerto_Rico', countryCode: 'PR', city: 'San Juan', region: 'Americas - Caribbean', aliases: ['Puerto Rico'] },
  { timezone: 'America/Santo_Domingo', countryCode: 'DO', city: 'Santo Domingo', region: 'Americas - Caribbean', aliases: ['Dominican Republic'] },

  // ========== AMERICAS - SOUTH ==========
  { timezone: 'America/Sao_Paulo', countryCode: 'BR', city: 'São Paulo', region: 'Americas - South', aliases: ['Brazil', 'BRT', 'Rio de Janeiro', 'Brasilia'] },
  { timezone: 'America/Buenos_Aires', countryCode: 'AR', city: 'Buenos Aires', region: 'Americas - South', aliases: ['Argentina', 'ART'] },
  { timezone: 'America/Santiago', countryCode: 'CL', city: 'Santiago', region: 'Americas - South', aliases: ['Chile', 'CLT'] },
  { timezone: 'America/Bogota', countryCode: 'CO', city: 'Bogota', region: 'Americas - South', aliases: ['Colombia', 'COT', 'Medellin'] },
  { timezone: 'America/Lima', countryCode: 'PE', city: 'Lima', region: 'Americas - South', aliases: ['Peru', 'PET'] },
  { timezone: 'America/Caracas', countryCode: 'VE', city: 'Caracas', region: 'Americas - South', aliases: ['Venezuela', 'VET'] },
  { timezone: 'America/Guayaquil', countryCode: 'EC', city: 'Guayaquil', region: 'Americas - South', aliases: ['Ecuador', 'Quito', 'ECT'] },
  { timezone: 'America/La_Paz', countryCode: 'BO', city: 'La Paz', region: 'Americas - South', aliases: ['Bolivia', 'BOT'] },
  { timezone: 'America/Asuncion', countryCode: 'PY', city: 'Asuncion', region: 'Americas - South', aliases: ['Paraguay', 'PYT'] },
  { timezone: 'America/Montevideo', countryCode: 'UY', city: 'Montevideo', region: 'Americas - South', aliases: ['Uruguay', 'UYT'] },

  // ========== OCEANIA ==========
  { timezone: 'Australia/Sydney', countryCode: 'AU', city: 'Sydney', region: 'Oceania', aliases: ['Australia', 'AEST', 'AEDT', 'New South Wales'] },
  { timezone: 'Australia/Melbourne', countryCode: 'AU', city: 'Melbourne', region: 'Oceania', aliases: ['Australia', 'Victoria', 'AEST', 'AEDT'] },
  { timezone: 'Australia/Brisbane', countryCode: 'AU', city: 'Brisbane', region: 'Oceania', aliases: ['Australia', 'Queensland', 'AEST'] },
  { timezone: 'Australia/Perth', countryCode: 'AU', city: 'Perth', region: 'Oceania', aliases: ['Australia', 'Western Australia', 'AWST'] },
  { timezone: 'Australia/Adelaide', countryCode: 'AU', city: 'Adelaide', region: 'Oceania', aliases: ['Australia', 'South Australia', 'ACST', 'ACDT'] },
  { timezone: 'Australia/Darwin', countryCode: 'AU', city: 'Darwin', region: 'Oceania', aliases: ['Australia', 'Northern Territory', 'ACST'] },
  { timezone: 'Australia/Hobart', countryCode: 'AU', city: 'Hobart', region: 'Oceania', aliases: ['Australia', 'Tasmania', 'AEST', 'AEDT'] },
  { timezone: 'Pacific/Auckland', countryCode: 'NZ', city: 'Auckland', region: 'Oceania', aliases: ['New Zealand', 'NZST', 'NZDT', 'Wellington'] },
  { timezone: 'Pacific/Fiji', countryCode: 'FJ', city: 'Fiji', region: 'Oceania', aliases: ['Suva'] },
  { timezone: 'Pacific/Port_Moresby', countryCode: 'PG', city: 'Port Moresby', region: 'Oceania', aliases: ['Papua New Guinea', 'PNG'] },
  { timezone: 'Pacific/Guam', countryCode: 'GU', city: 'Guam', region: 'Oceania', aliases: ['ChST'] },

  // ========== AFRICA - NORTH ==========
  { timezone: 'Africa/Cairo', countryCode: 'EG', city: 'Cairo', region: 'Africa - North', aliases: ['Egypt', 'EET', 'Alexandria'] },
  { timezone: 'Africa/Casablanca', countryCode: 'MA', city: 'Casablanca', region: 'Africa - North', aliases: ['Morocco', 'Rabat', 'WET'] },
  { timezone: 'Africa/Tunis', countryCode: 'TN', city: 'Tunis', region: 'Africa - North', aliases: ['Tunisia', 'CET'] },
  { timezone: 'Africa/Algiers', countryCode: 'DZ', city: 'Algiers', region: 'Africa - North', aliases: ['Algeria', 'CET'] },
  { timezone: 'Africa/Tripoli', countryCode: 'LY', city: 'Tripoli', region: 'Africa - North', aliases: ['Libya', 'EET'] },

  // ========== AFRICA - WEST ==========
  { timezone: 'Africa/Lagos', countryCode: 'NG', city: 'Lagos', region: 'Africa - West', aliases: ['Nigeria', 'WAT', 'Abuja'] },
  { timezone: 'Africa/Accra', countryCode: 'GH', city: 'Accra', region: 'Africa - West', aliases: ['Ghana', 'GMT'] },
  { timezone: 'Africa/Dakar', countryCode: 'SN', city: 'Dakar', region: 'Africa - West', aliases: ['Senegal', 'GMT'] },
  { timezone: 'Africa/Abidjan', countryCode: 'CI', city: 'Abidjan', region: 'Africa - West', aliases: ['Ivory Coast', 'Côte d\'Ivoire', 'GMT'] },

  // ========== AFRICA - EAST ==========
  { timezone: 'Africa/Nairobi', countryCode: 'KE', city: 'Nairobi', region: 'Africa - East', aliases: ['Kenya', 'EAT'] },
  { timezone: 'Africa/Dar_es_Salaam', countryCode: 'TZ', city: 'Dar es Salaam', region: 'Africa - East', aliases: ['Tanzania', 'EAT'] },
  { timezone: 'Africa/Kampala', countryCode: 'UG', city: 'Kampala', region: 'Africa - East', aliases: ['Uganda', 'EAT'] },
  { timezone: 'Africa/Addis_Ababa', countryCode: 'ET', city: 'Addis Ababa', region: 'Africa - East', aliases: ['Ethiopia', 'EAT'] },
  { timezone: 'Africa/Kigali', countryCode: 'RW', city: 'Kigali', region: 'Africa - East', aliases: ['Rwanda', 'CAT'] },

  // ========== AFRICA - SOUTHERN ==========
  { timezone: 'Africa/Johannesburg', countryCode: 'ZA', city: 'Johannesburg', region: 'Africa - Southern', aliases: ['South Africa', 'SAST', 'Cape Town', 'Pretoria', 'Durban'] },
  { timezone: 'Africa/Harare', countryCode: 'ZW', city: 'Harare', region: 'Africa - Southern', aliases: ['Zimbabwe', 'CAT'] },
  { timezone: 'Africa/Gaborone', countryCode: 'BW', city: 'Gaborone', region: 'Africa - Southern', aliases: ['Botswana', 'CAT'] },
  { timezone: 'Africa/Windhoek', countryCode: 'NA', city: 'Windhoek', region: 'Africa - Southern', aliases: ['Namibia', 'WAT'] },
  { timezone: 'Indian/Mauritius', countryCode: 'MU', city: 'Port Louis', region: 'Africa - Southern', aliases: ['Mauritius', 'MUT'] },

  // ========== OTHER ==========
  { timezone: 'UTC', countryCode: '', city: 'UTC', region: 'Other', aliases: ['Coordinated Universal Time', 'GMT', 'Greenwich'] },
];

// ============================================================================
// Lookup Maps (generated from database for O(1) access)
// ============================================================================

const timezoneMap = new Map<string, TimezoneInfo>();
const countryToTimezoneMap = new Map<string, TimezoneInfo[]>();

// Build lookup maps
TIMEZONE_DATABASE.forEach(tz => {
  timezoneMap.set(tz.timezone, tz);
  
  if (tz.countryCode) {
    const existing = countryToTimezoneMap.get(tz.countryCode) || [];
    existing.push(tz);
    countryToTimezoneMap.set(tz.countryCode, existing);
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get timezone offset string (e.g., "GMT+5:30")
 */
export function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value || '';
  } catch {
    return '';
  }
}

/**
 * Get timezone info by IANA timezone string
 */
export function getTimezoneInfo(timezone: string): TimezoneInfo | undefined {
  return timezoneMap.get(timezone);
}

/**
 * Get flag emoji for a timezone
 */
export function getTimezoneFlag(timezone: string): string {
  const info = timezoneMap.get(timezone);
  if (!info || !info.countryCode) return '';
  return getFlagEmoji(info.countryCode);
}

/**
 * Get display name for a timezone (city name)
 */
export function getTimezoneDisplayName(timezone: string): string {
  const info = timezoneMap.get(timezone);
  if (info) return info.city;
  // Fallback for unknown timezones
  return timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
}

/**
 * Get country code for a timezone
 */
export function getTimezoneCountryCode(timezone: string): string {
  const info = timezoneMap.get(timezone);
  return info?.countryCode || '';
}

/**
 * Get all timezones for a country code
 */
export function getTimezonesForCountry(countryCode: string): TimezoneInfo[] {
  if (!countryCode) return [];
  return countryToTimezoneMap.get(countryCode.toUpperCase()) || [];
}

/**
 * Get primary timezone for a country code
 */
export function getPrimaryTimezoneForCountry(countryCode: string): string {
  if (!countryCode) return 'UTC';
  const timezones = countryToTimezoneMap.get(countryCode.toUpperCase());
  return timezones?.[0]?.timezone || 'UTC';
}

/**
 * Search timezones by query (searches city, country, aliases)
 */
export function searchTimezones(query: string): TimezoneInfo[] {
  if (!query) return TIMEZONE_DATABASE;
  
  const searchLower = query.toLowerCase().trim();
  
  return TIMEZONE_DATABASE.filter(tz => {
    // Search in timezone string
    if (tz.timezone.toLowerCase().includes(searchLower)) return true;
    // Search in city
    if (tz.city.toLowerCase().includes(searchLower)) return true;
    // Search in country code
    if (tz.countryCode.toLowerCase() === searchLower) return true;
    // Search in aliases
    if (tz.aliases?.some(alias => alias.toLowerCase().includes(searchLower))) return true;
    // Search in offset
    const offset = getTimezoneOffset(tz.timezone).toLowerCase();
    if (offset.includes(searchLower)) return true;
    
    return false;
  });
}

/**
 * Get timezones grouped by region
 */
export function getTimezonesByRegion(): TimezoneGroup[] {
  const regionMap = new Map<string, TimezoneOption[]>();
  
  TIMEZONE_DATABASE.forEach(tz => {
    const option: TimezoneOption = {
      value: tz.timezone,
      label: tz.city,
      offset: getTimezoneOffset(tz.timezone),
      flag: tz.countryCode ? getFlagEmoji(tz.countryCode) : '',
      countryCode: tz.countryCode,
    };
    
    const existing = regionMap.get(tz.region) || [];
    existing.push(option);
    regionMap.set(tz.region, existing);
  });
  
  // Define region order
  const regionOrder = [
    'Asia - South',
    'Asia - East',
    'Asia - Southeast',
    'Middle East',
    'Asia - Central',
    'Europe - Western',
    'Europe - Central',
    'Europe - Nordic',
    'Europe - Eastern',
    'Europe - Baltic',
    'Americas - North',
    'Americas - Central',
    'Americas - Caribbean',
    'Americas - South',
    'Oceania',
    'Africa - North',
    'Africa - West',
    'Africa - East',
    'Africa - Southern',
    'Other',
  ];
  
  return regionOrder
    .filter(region => regionMap.has(region))
    .map(region => ({
      region,
      timezones: regionMap.get(region) || [],
    }));
}

/**
 * Get all timezone values (IANA strings) - for backwards compatibility
 */
export function getAllTimezones(): string[] {
  return TIMEZONE_DATABASE.map(tz => tz.timezone);
}

/**
 * Format timezone for display with flag
 */
export function formatTimezoneWithFlag(timezone: string): string {
  const info = timezoneMap.get(timezone);
  if (!info) {
    const city = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
    return `${city} (${getTimezoneOffset(timezone)})`;
  }
  
  const flag = info.countryCode ? getFlagEmoji(info.countryCode) : '';
  const offset = getTimezoneOffset(timezone);
  
  return `${flag} ${info.city} (${offset})`.trim();
}

/**
 * Check if a country has multiple timezones
 */
export function hasMultipleTimezones(countryCode: string): boolean {
  if (!countryCode) return false;
  const timezones = countryToTimezoneMap.get(countryCode.toUpperCase());
  return (timezones?.length || 0) > 1;
}
