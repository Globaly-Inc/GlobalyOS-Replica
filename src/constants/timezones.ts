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
// Comprehensive Timezone Database (200+ timezones)
// ============================================================================

export const TIMEZONE_DATABASE: TimezoneInfo[] = [
  // ========== ASIA - SOUTH ==========
  { timezone: 'Asia/Kolkata', countryCode: 'IN', city: 'India (Kolkata)', region: 'Asia - South', aliases: ['India', 'Mumbai', 'Delhi', 'Chennai', 'Bangalore', 'Hyderabad', 'IST', 'Indian Standard Time', 'Calcutta', 'New Delhi', 'Pune', 'Ahmedabad'] },
  { timezone: 'Asia/Kathmandu', countryCode: 'NP', city: 'Nepal (Kathmandu)', region: 'Asia - South', aliases: ['Nepal', 'NPT', 'Katmandu', 'Pokhara'] },
  { timezone: 'Asia/Dhaka', countryCode: 'BD', city: 'Bangladesh (Dhaka)', region: 'Asia - South', aliases: ['Bangladesh', 'BST', 'Chittagong'] },
  { timezone: 'Asia/Karachi', countryCode: 'PK', city: 'Pakistan (Karachi)', region: 'Asia - South', aliases: ['Pakistan', 'Lahore', 'Islamabad', 'PKT', 'Rawalpindi', 'Faisalabad'] },
  { timezone: 'Asia/Colombo', countryCode: 'LK', city: 'Sri Lanka (Colombo)', region: 'Asia - South', aliases: ['Sri Lanka', 'Kandy'] },
  { timezone: 'Indian/Maldives', countryCode: 'MV', city: 'Maldives (Male)', region: 'Asia - South', aliases: ['Male', 'Malé'] },
  { timezone: 'Asia/Thimphu', countryCode: 'BT', city: 'Bhutan (Thimphu)', region: 'Asia - South', aliases: ['Bhutan'] },
  { timezone: 'Indian/Chagos', countryCode: 'IO', city: 'Chagos', region: 'Asia - South', aliases: ['British Indian Ocean Territory', 'Diego Garcia'] },

  // ========== ASIA - EAST ==========
  { timezone: 'Asia/Tokyo', countryCode: 'JP', city: 'Japan (Tokyo)', region: 'Asia - East', aliases: ['Japan', 'Osaka', 'JST', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo'] },
  { timezone: 'Asia/Seoul', countryCode: 'KR', city: 'South Korea (Seoul)', region: 'Asia - East', aliases: ['Korea', 'South Korea', 'KST', 'Busan', 'Incheon', 'Korean'] },
  { timezone: 'Asia/Shanghai', countryCode: 'CN', city: 'China (Shanghai)', region: 'Asia - East', aliases: ['China', 'Beijing', 'CST', 'Shenzhen', 'Guangzhou', 'Chengdu', 'Hangzhou', 'Wuhan', 'Nanjing', 'Chinese'] },
  { timezone: 'Asia/Hong_Kong', countryCode: 'HK', city: 'Hong Kong', region: 'Asia - East', aliases: ['HKT', 'HK'] },
  { timezone: 'Asia/Macau', countryCode: 'MO', city: 'Macau', region: 'Asia - East', aliases: ['Macao'] },
  { timezone: 'Asia/Taipei', countryCode: 'TW', city: 'Taiwan (Taipei)', region: 'Asia - East', aliases: ['Taiwan', 'Kaohsiung'] },
  { timezone: 'Asia/Ulaanbaatar', countryCode: 'MN', city: 'Mongolia (Ulaanbaatar)', region: 'Asia - East', aliases: ['Mongolia', 'Ulan Bator'] },
  { timezone: 'Asia/Pyongyang', countryCode: 'KP', city: 'North Korea (Pyongyang)', region: 'Asia - East', aliases: ['North Korea', 'DPRK'] },

  // ========== ASIA - SOUTHEAST ==========
  { timezone: 'Asia/Singapore', countryCode: 'SG', city: 'Singapore', region: 'Asia - Southeast', aliases: ['SGT', 'SG'] },
  { timezone: 'Asia/Kuala_Lumpur', countryCode: 'MY', city: 'Malaysia (Kuala Lumpur)', region: 'Asia - Southeast', aliases: ['Malaysia', 'MYT', 'Penang', 'KL'] },
  { timezone: 'Asia/Bangkok', countryCode: 'TH', city: 'Thailand (Bangkok)', region: 'Asia - Southeast', aliases: ['Thailand', 'ICT', 'Phuket', 'Chiang Mai', 'Thai'] },
  { timezone: 'Asia/Ho_Chi_Minh', countryCode: 'VN', city: 'Vietnam (Ho Chi Minh)', region: 'Asia - Southeast', aliases: ['Vietnam', 'Saigon', 'Hanoi', 'ICT', 'Vietnamese'] },
  { timezone: 'Asia/Jakarta', countryCode: 'ID', city: 'Indonesia (Jakarta)', region: 'Asia - Southeast', aliases: ['Indonesia', 'WIB', 'Surabaya', 'Bandung', 'Indonesian'] },
  { timezone: 'Asia/Makassar', countryCode: 'ID', city: 'Indonesia (Makassar)', region: 'Asia - Southeast', aliases: ['Indonesia Central', 'WITA', 'Bali', 'Denpasar', 'Borneo'] },
  { timezone: 'Asia/Jayapura', countryCode: 'ID', city: 'Indonesia (Jayapura)', region: 'Asia - Southeast', aliases: ['Indonesia East', 'WIT', 'Papua'] },
  { timezone: 'Asia/Manila', countryCode: 'PH', city: 'Philippines (Manila)', region: 'Asia - Southeast', aliases: ['Philippines', 'PHT', 'Cebu', 'Davao', 'Filipino'] },
  { timezone: 'Asia/Yangon', countryCode: 'MM', city: 'Myanmar (Yangon)', region: 'Asia - Southeast', aliases: ['Myanmar', 'Burma', 'Rangoon', 'MMT', 'Burmese'] },
  { timezone: 'Asia/Phnom_Penh', countryCode: 'KH', city: 'Cambodia (Phnom Penh)', region: 'Asia - Southeast', aliases: ['Cambodia', 'ICT', 'Siem Reap', 'Cambodian'] },
  { timezone: 'Asia/Vientiane', countryCode: 'LA', city: 'Laos (Vientiane)', region: 'Asia - Southeast', aliases: ['Laos', 'ICT', 'Lao'] },
  { timezone: 'Asia/Brunei', countryCode: 'BN', city: 'Brunei', region: 'Asia - Southeast', aliases: ['Bandar Seri Begawan'] },
  { timezone: 'Asia/Dili', countryCode: 'TL', city: 'Timor-Leste (Dili)', region: 'Asia - Southeast', aliases: ['East Timor', 'Timor Leste'] },

  // ========== ASIA - MIDDLE EAST ==========
  { timezone: 'Asia/Dubai', countryCode: 'AE', city: 'UAE (Dubai)', region: 'Middle East', aliases: ['UAE', 'United Arab Emirates', 'Abu Dhabi', 'GST', 'Sharjah', 'Emirates'] },
  { timezone: 'Asia/Riyadh', countryCode: 'SA', city: 'Saudi Arabia (Riyadh)', region: 'Middle East', aliases: ['Saudi Arabia', 'Jeddah', 'AST', 'Mecca', 'Medina', 'Saudi'] },
  { timezone: 'Asia/Qatar', countryCode: 'QA', city: 'Qatar (Doha)', region: 'Middle East', aliases: ['Qatar', 'Doha'] },
  { timezone: 'Asia/Kuwait', countryCode: 'KW', city: 'Kuwait', region: 'Middle East', aliases: ['Kuwait City'] },
  { timezone: 'Asia/Bahrain', countryCode: 'BH', city: 'Bahrain (Manama)', region: 'Middle East', aliases: ['Manama'] },
  { timezone: 'Asia/Muscat', countryCode: 'OM', city: 'Oman (Muscat)', region: 'Middle East', aliases: ['Oman'] },
  { timezone: 'Asia/Jerusalem', countryCode: 'IL', city: 'Israel (Jerusalem)', region: 'Middle East', aliases: ['Israel', 'Tel Aviv', 'IST', 'Israeli', 'Haifa'] },
  { timezone: 'Asia/Amman', countryCode: 'JO', city: 'Jordan (Amman)', region: 'Middle East', aliases: ['Jordan', 'Jordanian'] },
  { timezone: 'Asia/Beirut', countryCode: 'LB', city: 'Lebanon (Beirut)', region: 'Middle East', aliases: ['Lebanon', 'Lebanese'] },
  { timezone: 'Europe/Istanbul', countryCode: 'TR', city: 'Turkey (Istanbul)', region: 'Middle East', aliases: ['Turkey', 'Ankara', 'TRT', 'Turkish', 'Izmir', 'Antalya'] },
  { timezone: 'Asia/Baghdad', countryCode: 'IQ', city: 'Iraq (Baghdad)', region: 'Middle East', aliases: ['Iraq', 'Basra', 'Erbil', 'Iraqi'] },
  { timezone: 'Asia/Tehran', countryCode: 'IR', city: 'Iran (Tehran)', region: 'Middle East', aliases: ['Iran', 'IRST', 'Persian', 'Isfahan', 'Shiraz', 'Iranian'] },
  { timezone: 'Asia/Damascus', countryCode: 'SY', city: 'Syria (Damascus)', region: 'Middle East', aliases: ['Syria', 'Aleppo', 'Syrian'] },
  { timezone: 'Asia/Nicosia', countryCode: 'CY', city: 'Cyprus (Nicosia)', region: 'Middle East', aliases: ['Cyprus', 'Limassol', 'Cypriot'] },
  { timezone: 'Asia/Aden', countryCode: 'YE', city: 'Yemen (Aden)', region: 'Middle East', aliases: ['Yemen', 'Sanaa', 'Sana\'a'] },

  // ========== ASIA - CENTRAL ==========
  { timezone: 'Asia/Almaty', countryCode: 'KZ', city: 'Kazakhstan (Almaty)', region: 'Asia - Central', aliases: ['Kazakhstan', 'Astana', 'Nur-Sultan'] },
  { timezone: 'Asia/Tashkent', countryCode: 'UZ', city: 'Uzbekistan (Tashkent)', region: 'Asia - Central', aliases: ['Uzbekistan', 'Samarkand'] },
  { timezone: 'Asia/Ashgabat', countryCode: 'TM', city: 'Turkmenistan (Ashgabat)', region: 'Asia - Central', aliases: ['Turkmenistan'] },
  { timezone: 'Asia/Dushanbe', countryCode: 'TJ', city: 'Tajikistan (Dushanbe)', region: 'Asia - Central', aliases: ['Tajikistan'] },
  { timezone: 'Asia/Bishkek', countryCode: 'KG', city: 'Kyrgyzstan (Bishkek)', region: 'Asia - Central', aliases: ['Kyrgyzstan'] },
  { timezone: 'Asia/Kabul', countryCode: 'AF', city: 'Afghanistan (Kabul)', region: 'Asia - Central', aliases: ['Afghanistan', 'Afghan'] },
  { timezone: 'Asia/Baku', countryCode: 'AZ', city: 'Azerbaijan (Baku)', region: 'Asia - Central', aliases: ['Azerbaijan'] },
  { timezone: 'Asia/Tbilisi', countryCode: 'GE', city: 'Georgia (Tbilisi)', region: 'Asia - Central', aliases: ['Georgia', 'Georgian'] },
  { timezone: 'Asia/Yerevan', countryCode: 'AM', city: 'Armenia (Yerevan)', region: 'Asia - Central', aliases: ['Armenia', 'Armenian'] },

  // ========== EUROPE - WESTERN ==========
  { timezone: 'Europe/London', countryCode: 'GB', city: 'UK (London)', region: 'Europe - Western', aliases: ['UK', 'United Kingdom', 'England', 'Britain', 'GMT', 'BST', 'British', 'Manchester', 'Birmingham', 'Edinburgh', 'Scotland', 'Wales'] },
  { timezone: 'Europe/Dublin', countryCode: 'IE', city: 'Ireland (Dublin)', region: 'Europe - Western', aliases: ['Ireland', 'IST', 'Irish', 'Cork'] },
  { timezone: 'Europe/Lisbon', countryCode: 'PT', city: 'Portugal (Lisbon)', region: 'Europe - Western', aliases: ['Portugal', 'WET', 'Porto', 'Portuguese'] },
  { timezone: 'Europe/Madrid', countryCode: 'ES', city: 'Spain (Madrid)', region: 'Europe - Western', aliases: ['Spain', 'Barcelona', 'CET', 'Spanish', 'Valencia', 'Seville', 'Malaga'] },
  { timezone: 'Atlantic/Canary', countryCode: 'ES', city: 'Spain (Canary Islands)', region: 'Europe - Western', aliases: ['Canary', 'Canarias', 'Tenerife', 'Gran Canaria'] },
  { timezone: 'Europe/Paris', countryCode: 'FR', city: 'France (Paris)', region: 'Europe - Western', aliases: ['France', 'CET', 'Lyon', 'Marseille', 'French', 'Nice', 'Toulouse'] },
  { timezone: 'Europe/Brussels', countryCode: 'BE', city: 'Belgium (Brussels)', region: 'Europe - Western', aliases: ['Belgium', 'CET', 'Antwerp', 'Belgian'] },
  { timezone: 'Europe/Amsterdam', countryCode: 'NL', city: 'Netherlands (Amsterdam)', region: 'Europe - Western', aliases: ['Netherlands', 'Holland', 'CET', 'Rotterdam', 'Dutch', 'The Hague'] },
  { timezone: 'Europe/Luxembourg', countryCode: 'LU', city: 'Luxembourg', region: 'Europe - Western', aliases: ['CET'] },
  { timezone: 'Europe/Monaco', countryCode: 'MC', city: 'Monaco', region: 'Europe - Western', aliases: ['CET', 'Monte Carlo'] },
  { timezone: 'Europe/Andorra', countryCode: 'AD', city: 'Andorra', region: 'Europe - Western', aliases: ['Andorra la Vella'] },
  { timezone: 'Europe/Gibraltar', countryCode: 'GI', city: 'Gibraltar', region: 'Europe - Western', aliases: [] },

  // ========== EUROPE - CENTRAL ==========
  { timezone: 'Europe/Berlin', countryCode: 'DE', city: 'Germany (Berlin)', region: 'Europe - Central', aliases: ['Germany', 'Munich', 'Frankfurt', 'Hamburg', 'CET', 'German', 'Cologne', 'Dusseldorf', 'Stuttgart'] },
  { timezone: 'Europe/Vienna', countryCode: 'AT', city: 'Austria (Vienna)', region: 'Europe - Central', aliases: ['Austria', 'CET', 'Salzburg', 'Austrian', 'Innsbruck'] },
  { timezone: 'Europe/Zurich', countryCode: 'CH', city: 'Switzerland (Zurich)', region: 'Europe - Central', aliases: ['Switzerland', 'Geneva', 'Bern', 'CET', 'Swiss', 'Basel'] },
  { timezone: 'Europe/Rome', countryCode: 'IT', city: 'Italy (Rome)', region: 'Europe - Central', aliases: ['Italy', 'Milan', 'CET', 'Italian', 'Florence', 'Venice', 'Naples', 'Turin'] },
  { timezone: 'Europe/Vatican', countryCode: 'VA', city: 'Vatican City', region: 'Europe - Central', aliases: ['Vatican', 'Holy See'] },
  { timezone: 'Europe/San_Marino', countryCode: 'SM', city: 'San Marino', region: 'Europe - Central', aliases: [] },
  { timezone: 'Europe/Warsaw', countryCode: 'PL', city: 'Poland (Warsaw)', region: 'Europe - Central', aliases: ['Poland', 'CET', 'Krakow', 'Polish', 'Wroclaw', 'Gdansk'] },
  { timezone: 'Europe/Prague', countryCode: 'CZ', city: 'Czech Republic (Prague)', region: 'Europe - Central', aliases: ['Czech Republic', 'Czechia', 'CET', 'Czech', 'Brno'] },
  { timezone: 'Europe/Bratislava', countryCode: 'SK', city: 'Slovakia (Bratislava)', region: 'Europe - Central', aliases: ['Slovakia', 'CET', 'Slovak'] },
  { timezone: 'Europe/Budapest', countryCode: 'HU', city: 'Hungary (Budapest)', region: 'Europe - Central', aliases: ['Hungary', 'CET', 'Hungarian'] },
  { timezone: 'Europe/Ljubljana', countryCode: 'SI', city: 'Slovenia (Ljubljana)', region: 'Europe - Central', aliases: ['Slovenia', 'CET', 'Slovenian'] },
  { timezone: 'Europe/Zagreb', countryCode: 'HR', city: 'Croatia (Zagreb)', region: 'Europe - Central', aliases: ['Croatia', 'CET', 'Croatian', 'Split', 'Dubrovnik'] },
  { timezone: 'Europe/Sarajevo', countryCode: 'BA', city: 'Bosnia (Sarajevo)', region: 'Europe - Central', aliases: ['Bosnia', 'Herzegovina', 'Bosnian'] },
  { timezone: 'Europe/Belgrade', countryCode: 'RS', city: 'Serbia (Belgrade)', region: 'Europe - Central', aliases: ['Serbia', 'Serbian', 'Novi Sad'] },
  { timezone: 'Europe/Podgorica', countryCode: 'ME', city: 'Montenegro (Podgorica)', region: 'Europe - Central', aliases: ['Montenegro'] },
  { timezone: 'Europe/Skopje', countryCode: 'MK', city: 'North Macedonia (Skopje)', region: 'Europe - Central', aliases: ['Macedonia', 'North Macedonia', 'Macedonian'] },
  { timezone: 'Europe/Tirane', countryCode: 'AL', city: 'Albania (Tirana)', region: 'Europe - Central', aliases: ['Albania', 'Albanian', 'Tirana'] },
  { timezone: 'Europe/Malta', countryCode: 'MT', city: 'Malta (Valletta)', region: 'Europe - Central', aliases: ['Malta', 'Maltese', 'Valletta'] },

  // ========== EUROPE - NORDIC ==========
  { timezone: 'Europe/Stockholm', countryCode: 'SE', city: 'Sweden (Stockholm)', region: 'Europe - Nordic', aliases: ['Sweden', 'CET', 'Swedish', 'Gothenburg', 'Malmo'] },
  { timezone: 'Europe/Oslo', countryCode: 'NO', city: 'Norway (Oslo)', region: 'Europe - Nordic', aliases: ['Norway', 'CET', 'Norwegian', 'Bergen', 'Trondheim'] },
  { timezone: 'Europe/Copenhagen', countryCode: 'DK', city: 'Denmark (Copenhagen)', region: 'Europe - Nordic', aliases: ['Denmark', 'CET', 'Danish', 'Aarhus'] },
  { timezone: 'Europe/Helsinki', countryCode: 'FI', city: 'Finland (Helsinki)', region: 'Europe - Nordic', aliases: ['Finland', 'EET', 'Finnish', 'Tampere', 'Turku'] },
  { timezone: 'Atlantic/Reykjavik', countryCode: 'IS', city: 'Iceland (Reykjavik)', region: 'Europe - Nordic', aliases: ['Iceland', 'GMT', 'Icelandic'] },
  { timezone: 'Atlantic/Faroe', countryCode: 'FO', city: 'Faroe Islands', region: 'Europe - Nordic', aliases: ['Faroe', 'Føroyar'] },

  // ========== EUROPE - EASTERN ==========
  { timezone: 'Europe/Moscow', countryCode: 'RU', city: 'Russia (Moscow)', region: 'Europe - Eastern', aliases: ['Russia', 'MSK', 'Saint Petersburg', 'Russian', 'St Petersburg'] },
  { timezone: 'Europe/Kyiv', countryCode: 'UA', city: 'Ukraine (Kyiv)', region: 'Europe - Eastern', aliases: ['Ukraine', 'Kiev', 'EET', 'Ukrainian', 'Kharkiv', 'Odessa', 'Lviv'] },
  { timezone: 'Europe/Minsk', countryCode: 'BY', city: 'Belarus (Minsk)', region: 'Europe - Eastern', aliases: ['Belarus', 'Belarusian'] },
  { timezone: 'Europe/Bucharest', countryCode: 'RO', city: 'Romania (Bucharest)', region: 'Europe - Eastern', aliases: ['Romania', 'EET', 'Romanian', 'Cluj'] },
  { timezone: 'Europe/Sofia', countryCode: 'BG', city: 'Bulgaria (Sofia)', region: 'Europe - Eastern', aliases: ['Bulgaria', 'EET', 'Bulgarian'] },
  { timezone: 'Europe/Athens', countryCode: 'GR', city: 'Greece (Athens)', region: 'Europe - Eastern', aliases: ['Greece', 'EET', 'Greek', 'Thessaloniki'] },
  { timezone: 'Europe/Chisinau', countryCode: 'MD', city: 'Moldova (Chisinau)', region: 'Europe - Eastern', aliases: ['Moldova', 'Moldovan'] },
  { timezone: 'Europe/Kaliningrad', countryCode: 'RU', city: 'Russia (Kaliningrad)', region: 'Europe - Eastern', aliases: ['Kaliningrad'] },

  // ========== EUROPE - BALTIC ==========
  { timezone: 'Europe/Tallinn', countryCode: 'EE', city: 'Estonia (Tallinn)', region: 'Europe - Baltic', aliases: ['Estonia', 'EET', 'Estonian'] },
  { timezone: 'Europe/Riga', countryCode: 'LV', city: 'Latvia (Riga)', region: 'Europe - Baltic', aliases: ['Latvia', 'EET', 'Latvian'] },
  { timezone: 'Europe/Vilnius', countryCode: 'LT', city: 'Lithuania (Vilnius)', region: 'Europe - Baltic', aliases: ['Lithuania', 'EET', 'Lithuanian', 'Kaunas'] },

  // ========== RUSSIA (Additional zones) ==========
  { timezone: 'Asia/Yekaterinburg', countryCode: 'RU', city: 'Russia (Yekaterinburg)', region: 'Russia', aliases: ['Yekaterinburg', 'Ural'] },
  { timezone: 'Asia/Novosibirsk', countryCode: 'RU', city: 'Russia (Novosibirsk)', region: 'Russia', aliases: ['Novosibirsk', 'Siberia'] },
  { timezone: 'Asia/Krasnoyarsk', countryCode: 'RU', city: 'Russia (Krasnoyarsk)', region: 'Russia', aliases: ['Krasnoyarsk'] },
  { timezone: 'Asia/Irkutsk', countryCode: 'RU', city: 'Russia (Irkutsk)', region: 'Russia', aliases: ['Irkutsk', 'Lake Baikal'] },
  { timezone: 'Asia/Vladivostok', countryCode: 'RU', city: 'Russia (Vladivostok)', region: 'Russia', aliases: ['Vladivostok', 'Far East'] },
  { timezone: 'Asia/Magadan', countryCode: 'RU', city: 'Russia (Magadan)', region: 'Russia', aliases: ['Magadan'] },
  { timezone: 'Asia/Kamchatka', countryCode: 'RU', city: 'Russia (Kamchatka)', region: 'Russia', aliases: ['Kamchatka', 'Petropavlovsk'] },
  { timezone: 'Asia/Sakhalin', countryCode: 'RU', city: 'Russia (Sakhalin)', region: 'Russia', aliases: ['Sakhalin'] },

  // ========== AMERICAS - NORTH (USA) ==========
  { timezone: 'America/New_York', countryCode: 'US', city: 'USA (New York)', region: 'Americas - North', aliases: ['USA', 'United States', 'EST', 'EDT', 'Eastern', 'Boston', 'Miami', 'Washington DC', 'Philadelphia', 'Atlanta', 'American', 'US'] },
  { timezone: 'America/Chicago', countryCode: 'US', city: 'USA (Chicago)', region: 'Americas - North', aliases: ['USA', 'Central', 'CST', 'CDT', 'Dallas', 'Houston', 'Minneapolis', 'Austin', 'San Antonio'] },
  { timezone: 'America/Denver', countryCode: 'US', city: 'USA (Denver)', region: 'Americas - North', aliases: ['USA', 'Mountain', 'MST', 'MDT', 'Salt Lake City', 'Albuquerque', 'Colorado'] },
  { timezone: 'America/Los_Angeles', countryCode: 'US', city: 'USA (Los Angeles)', region: 'Americas - North', aliases: ['USA', 'Pacific', 'PST', 'PDT', 'San Francisco', 'Seattle', 'Las Vegas', 'LA', 'California', 'Portland', 'San Diego'] },
  { timezone: 'America/Phoenix', countryCode: 'US', city: 'USA (Phoenix)', region: 'Americas - North', aliases: ['USA', 'Arizona', 'MST', 'Tucson'] },
  { timezone: 'America/Anchorage', countryCode: 'US', city: 'USA (Anchorage)', region: 'Americas - North', aliases: ['USA', 'Alaska', 'AKST', 'AKDT'] },
  { timezone: 'Pacific/Honolulu', countryCode: 'US', city: 'USA (Honolulu)', region: 'Americas - North', aliases: ['USA', 'Hawaii', 'HST', 'Hawaiian'] },
  { timezone: 'America/Detroit', countryCode: 'US', city: 'USA (Detroit)', region: 'Americas - North', aliases: ['Michigan', 'Detroit'] },
  { timezone: 'America/Indiana/Indianapolis', countryCode: 'US', city: 'USA (Indianapolis)', region: 'Americas - North', aliases: ['Indiana', 'Indianapolis'] },

  // ========== AMERICAS - NORTH (CANADA) ==========
  { timezone: 'America/Toronto', countryCode: 'CA', city: 'Canada (Toronto)', region: 'Americas - North', aliases: ['Canada', 'Ontario', 'EST', 'EDT', 'Eastern', 'Ottawa', 'Montreal', 'Canadian'] },
  { timezone: 'America/Vancouver', countryCode: 'CA', city: 'Canada (Vancouver)', region: 'Americas - North', aliases: ['Canada', 'British Columbia', 'PST', 'PDT', 'Pacific', 'BC'] },
  { timezone: 'America/Edmonton', countryCode: 'CA', city: 'Canada (Edmonton)', region: 'Americas - North', aliases: ['Canada', 'Alberta', 'MST', 'MDT', 'Calgary'] },
  { timezone: 'America/Winnipeg', countryCode: 'CA', city: 'Canada (Winnipeg)', region: 'Americas - North', aliases: ['Canada', 'Manitoba', 'CST', 'CDT'] },
  { timezone: 'America/Halifax', countryCode: 'CA', city: 'Canada (Halifax)', region: 'Americas - North', aliases: ['Canada', 'Nova Scotia', 'AST', 'ADT', 'Atlantic'] },
  { timezone: 'America/St_Johns', countryCode: 'CA', city: 'Canada (St. Johns)', region: 'Americas - North', aliases: ['Canada', 'Newfoundland', 'NST', 'NDT'] },
  { timezone: 'America/Regina', countryCode: 'CA', city: 'Canada (Regina)', region: 'Americas - North', aliases: ['Saskatchewan', 'Saskatoon'] },

  // ========== AMERICAS - CENTRAL & MEXICO ==========
  { timezone: 'America/Mexico_City', countryCode: 'MX', city: 'Mexico (Mexico City)', region: 'Americas - Central', aliases: ['Mexico', 'CST', 'CDT', 'Mexican', 'Guadalajara', 'Monterrey'] },
  { timezone: 'America/Cancun', countryCode: 'MX', city: 'Mexico (Cancun)', region: 'Americas - Central', aliases: ['Mexico', 'EST', 'Quintana Roo', 'Riviera Maya'] },
  { timezone: 'America/Tijuana', countryCode: 'MX', city: 'Mexico (Tijuana)', region: 'Americas - Central', aliases: ['Mexico', 'PST', 'PDT', 'Baja California'] },
  { timezone: 'America/Hermosillo', countryCode: 'MX', city: 'Mexico (Hermosillo)', region: 'Americas - Central', aliases: ['Sonora'] },
  { timezone: 'America/Guatemala', countryCode: 'GT', city: 'Guatemala', region: 'Americas - Central', aliases: ['Guatemala City', 'Guatemalan'] },
  { timezone: 'America/Belize', countryCode: 'BZ', city: 'Belize', region: 'Americas - Central', aliases: ['Belmopan', 'Belizean'] },
  { timezone: 'America/El_Salvador', countryCode: 'SV', city: 'El Salvador (San Salvador)', region: 'Americas - Central', aliases: ['El Salvador', 'Salvadoran'] },
  { timezone: 'America/Tegucigalpa', countryCode: 'HN', city: 'Honduras (Tegucigalpa)', region: 'Americas - Central', aliases: ['Honduras', 'Honduran'] },
  { timezone: 'America/Managua', countryCode: 'NI', city: 'Nicaragua (Managua)', region: 'Americas - Central', aliases: ['Nicaragua', 'Nicaraguan'] },
  { timezone: 'America/Costa_Rica', countryCode: 'CR', city: 'Costa Rica (San Jose)', region: 'Americas - Central', aliases: ['Costa Rica', 'Costa Rican'] },
  { timezone: 'America/Panama', countryCode: 'PA', city: 'Panama', region: 'Americas - Central', aliases: ['Panama City', 'Panamanian'] },

  // ========== AMERICAS - CARIBBEAN ==========
  { timezone: 'America/Havana', countryCode: 'CU', city: 'Cuba (Havana)', region: 'Americas - Caribbean', aliases: ['Cuba', 'Cuban'] },
  { timezone: 'America/Jamaica', countryCode: 'JM', city: 'Jamaica (Kingston)', region: 'Americas - Caribbean', aliases: ['Jamaica', 'Jamaican'] },
  { timezone: 'America/Puerto_Rico', countryCode: 'PR', city: 'Puerto Rico (San Juan)', region: 'Americas - Caribbean', aliases: ['Puerto Rico'] },
  { timezone: 'America/Santo_Domingo', countryCode: 'DO', city: 'Dominican Republic', region: 'Americas - Caribbean', aliases: ['Dominican Republic', 'Dominican'] },
  { timezone: 'America/Port-au-Prince', countryCode: 'HT', city: 'Haiti (Port-au-Prince)', region: 'Americas - Caribbean', aliases: ['Haiti', 'Haitian'] },
  { timezone: 'America/Nassau', countryCode: 'BS', city: 'Bahamas (Nassau)', region: 'Americas - Caribbean', aliases: ['Bahamas', 'Bahamian'] },
  { timezone: 'America/Barbados', countryCode: 'BB', city: 'Barbados (Bridgetown)', region: 'Americas - Caribbean', aliases: ['Barbados', 'Barbadian'] },
  { timezone: 'America/Port_of_Spain', countryCode: 'TT', city: 'Trinidad & Tobago', region: 'Americas - Caribbean', aliases: ['Trinidad', 'Tobago'] },
  { timezone: 'America/Curacao', countryCode: 'CW', city: 'Curaçao (Willemstad)', region: 'Americas - Caribbean', aliases: ['Curacao'] },
  { timezone: 'America/Aruba', countryCode: 'AW', city: 'Aruba (Oranjestad)', region: 'Americas - Caribbean', aliases: ['Aruba'] },

  // ========== AMERICAS - SOUTH ==========
  { timezone: 'America/Sao_Paulo', countryCode: 'BR', city: 'Brazil (São Paulo)', region: 'Americas - South', aliases: ['Brazil', 'BRT', 'Rio de Janeiro', 'Brasilia', 'Brazilian', 'Rio'] },
  { timezone: 'America/Manaus', countryCode: 'BR', city: 'Brazil (Manaus)', region: 'Americas - South', aliases: ['Amazon', 'AMT'] },
  { timezone: 'America/Fortaleza', countryCode: 'BR', city: 'Brazil (Fortaleza)', region: 'Americas - South', aliases: ['Recife', 'Salvador', 'Northeast Brazil'] },
  { timezone: 'America/Buenos_Aires', countryCode: 'AR', city: 'Argentina (Buenos Aires)', region: 'Americas - South', aliases: ['Argentina', 'ART', 'Argentine', 'Cordoba', 'Mendoza'] },
  { timezone: 'America/Santiago', countryCode: 'CL', city: 'Chile (Santiago)', region: 'Americas - South', aliases: ['Chile', 'CLT', 'Chilean', 'Valparaiso'] },
  { timezone: 'Pacific/Easter', countryCode: 'CL', city: 'Chile (Easter Island)', region: 'Americas - South', aliases: ['Easter Island', 'Rapa Nui'] },
  { timezone: 'America/Bogota', countryCode: 'CO', city: 'Colombia (Bogota)', region: 'Americas - South', aliases: ['Colombia', 'COT', 'Medellin', 'Colombian', 'Cali', 'Cartagena'] },
  { timezone: 'America/Lima', countryCode: 'PE', city: 'Peru (Lima)', region: 'Americas - South', aliases: ['Peru', 'PET', 'Peruvian', 'Cusco'] },
  { timezone: 'America/Caracas', countryCode: 'VE', city: 'Venezuela (Caracas)', region: 'Americas - South', aliases: ['Venezuela', 'VET', 'Venezuelan'] },
  { timezone: 'America/Guayaquil', countryCode: 'EC', city: 'Ecuador (Guayaquil)', region: 'Americas - South', aliases: ['Ecuador', 'Quito', 'ECT', 'Ecuadorian'] },
  { timezone: 'Pacific/Galapagos', countryCode: 'EC', city: 'Ecuador (Galapagos)', region: 'Americas - South', aliases: ['Galapagos Islands'] },
  { timezone: 'America/La_Paz', countryCode: 'BO', city: 'Bolivia (La Paz)', region: 'Americas - South', aliases: ['Bolivia', 'BOT', 'Bolivian', 'Sucre', 'Santa Cruz'] },
  { timezone: 'America/Asuncion', countryCode: 'PY', city: 'Paraguay (Asuncion)', region: 'Americas - South', aliases: ['Paraguay', 'PYT', 'Paraguayan'] },
  { timezone: 'America/Montevideo', countryCode: 'UY', city: 'Uruguay (Montevideo)', region: 'Americas - South', aliases: ['Uruguay', 'UYT', 'Uruguayan'] },
  { timezone: 'America/Guyana', countryCode: 'GY', city: 'Guyana (Georgetown)', region: 'Americas - South', aliases: ['Guyana', 'Guyanese'] },
  { timezone: 'America/Paramaribo', countryCode: 'SR', city: 'Suriname (Paramaribo)', region: 'Americas - South', aliases: ['Suriname'] },
  { timezone: 'America/Cayenne', countryCode: 'GF', city: 'French Guiana (Cayenne)', region: 'Americas - South', aliases: ['French Guiana'] },
  { timezone: 'Atlantic/Stanley', countryCode: 'FK', city: 'Falkland Islands', region: 'Americas - South', aliases: ['Falklands', 'Malvinas'] },

  // ========== OCEANIA ==========
  { timezone: 'Australia/Sydney', countryCode: 'AU', city: 'Australia (Sydney)', region: 'Oceania', aliases: ['Australia', 'AEST', 'AEDT', 'New South Wales', 'Australian', 'NSW'] },
  { timezone: 'Australia/Melbourne', countryCode: 'AU', city: 'Australia (Melbourne)', region: 'Oceania', aliases: ['Australia', 'Victoria', 'AEST', 'AEDT', 'VIC'] },
  { timezone: 'Australia/Brisbane', countryCode: 'AU', city: 'Australia (Brisbane)', region: 'Oceania', aliases: ['Australia', 'Queensland', 'AEST', 'QLD', 'Gold Coast'] },
  { timezone: 'Australia/Perth', countryCode: 'AU', city: 'Australia (Perth)', region: 'Oceania', aliases: ['Australia', 'Western Australia', 'AWST', 'WA'] },
  { timezone: 'Australia/Adelaide', countryCode: 'AU', city: 'Australia (Adelaide)', region: 'Oceania', aliases: ['Australia', 'South Australia', 'ACST', 'ACDT', 'SA'] },
  { timezone: 'Australia/Darwin', countryCode: 'AU', city: 'Australia (Darwin)', region: 'Oceania', aliases: ['Australia', 'Northern Territory', 'ACST', 'NT'] },
  { timezone: 'Australia/Hobart', countryCode: 'AU', city: 'Australia (Hobart)', region: 'Oceania', aliases: ['Australia', 'Tasmania', 'AEST', 'AEDT', 'TAS'] },
  { timezone: 'Australia/Lord_Howe', countryCode: 'AU', city: 'Australia (Lord Howe)', region: 'Oceania', aliases: ['Lord Howe Island'] },
  { timezone: 'Pacific/Auckland', countryCode: 'NZ', city: 'New Zealand (Auckland)', region: 'Oceania', aliases: ['New Zealand', 'NZST', 'NZDT', 'Wellington', 'Kiwi', 'NZ'] },
  { timezone: 'Pacific/Chatham', countryCode: 'NZ', city: 'New Zealand (Chatham)', region: 'Oceania', aliases: ['Chatham Islands'] },
  { timezone: 'Pacific/Fiji', countryCode: 'FJ', city: 'Fiji (Suva)', region: 'Oceania', aliases: ['Fiji', 'Fijian', 'Suva'] },
  { timezone: 'Pacific/Port_Moresby', countryCode: 'PG', city: 'Papua New Guinea', region: 'Oceania', aliases: ['Papua New Guinea', 'PNG'] },
  { timezone: 'Pacific/Guam', countryCode: 'GU', city: 'Guam', region: 'Oceania', aliases: ['ChST', 'Chamorro'] },
  { timezone: 'Pacific/Noumea', countryCode: 'NC', city: 'New Caledonia (Noumea)', region: 'Oceania', aliases: ['New Caledonia'] },
  { timezone: 'Pacific/Tahiti', countryCode: 'PF', city: 'French Polynesia (Tahiti)', region: 'Oceania', aliases: ['French Polynesia', 'Papeete', 'Bora Bora'] },
  { timezone: 'Pacific/Samoa', countryCode: 'WS', city: 'Samoa (Apia)', region: 'Oceania', aliases: ['Samoa', 'Western Samoa', 'Apia'] },
  { timezone: 'Pacific/Tongatapu', countryCode: 'TO', city: 'Tonga (Nukualofa)', region: 'Oceania', aliases: ['Tonga'] },
  { timezone: 'Pacific/Tarawa', countryCode: 'KI', city: 'Kiribati (Tarawa)', region: 'Oceania', aliases: ['Kiribati'] },
  { timezone: 'Pacific/Majuro', countryCode: 'MH', city: 'Marshall Islands', region: 'Oceania', aliases: ['Marshall Islands'] },
  { timezone: 'Pacific/Palau', countryCode: 'PW', city: 'Palau', region: 'Oceania', aliases: ['Koror'] },
  { timezone: 'Pacific/Pohnpei', countryCode: 'FM', city: 'Micronesia (Pohnpei)', region: 'Oceania', aliases: ['Micronesia', 'FSM'] },

  // ========== AFRICA - NORTH ==========
  { timezone: 'Africa/Cairo', countryCode: 'EG', city: 'Egypt (Cairo)', region: 'Africa - North', aliases: ['Egypt', 'EET', 'Alexandria', 'Egyptian'] },
  { timezone: 'Africa/Casablanca', countryCode: 'MA', city: 'Morocco (Casablanca)', region: 'Africa - North', aliases: ['Morocco', 'Rabat', 'WET', 'Moroccan', 'Marrakech'] },
  { timezone: 'Africa/Tunis', countryCode: 'TN', city: 'Tunisia (Tunis)', region: 'Africa - North', aliases: ['Tunisia', 'CET', 'Tunisian'] },
  { timezone: 'Africa/Algiers', countryCode: 'DZ', city: 'Algeria (Algiers)', region: 'Africa - North', aliases: ['Algeria', 'CET', 'Algerian'] },
  { timezone: 'Africa/Tripoli', countryCode: 'LY', city: 'Libya (Tripoli)', region: 'Africa - North', aliases: ['Libya', 'EET', 'Libyan'] },
  { timezone: 'Africa/Khartoum', countryCode: 'SD', city: 'Sudan (Khartoum)', region: 'Africa - North', aliases: ['Sudan', 'Sudanese'] },

  // ========== AFRICA - WEST ==========
  { timezone: 'Africa/Lagos', countryCode: 'NG', city: 'Nigeria (Lagos)', region: 'Africa - West', aliases: ['Nigeria', 'WAT', 'Abuja', 'Nigerian'] },
  { timezone: 'Africa/Accra', countryCode: 'GH', city: 'Ghana (Accra)', region: 'Africa - West', aliases: ['Ghana', 'GMT', 'Ghanaian'] },
  { timezone: 'Africa/Dakar', countryCode: 'SN', city: 'Senegal (Dakar)', region: 'Africa - West', aliases: ['Senegal', 'GMT', 'Senegalese'] },
  { timezone: 'Africa/Abidjan', countryCode: 'CI', city: 'Ivory Coast (Abidjan)', region: 'Africa - West', aliases: ['Ivory Coast', 'Côte d\'Ivoire', 'GMT', 'Ivorian'] },
  { timezone: 'Africa/Bamako', countryCode: 'ML', city: 'Mali (Bamako)', region: 'Africa - West', aliases: ['Mali', 'Malian'] },
  { timezone: 'Africa/Ouagadougou', countryCode: 'BF', city: 'Burkina Faso (Ouagadougou)', region: 'Africa - West', aliases: ['Burkina Faso'] },
  { timezone: 'Africa/Niamey', countryCode: 'NE', city: 'Niger (Niamey)', region: 'Africa - West', aliases: ['Niger'] },
  { timezone: 'Africa/Conakry', countryCode: 'GN', city: 'Guinea (Conakry)', region: 'Africa - West', aliases: ['Guinea'] },
  { timezone: 'Africa/Freetown', countryCode: 'SL', city: 'Sierra Leone (Freetown)', region: 'Africa - West', aliases: ['Sierra Leone'] },
  { timezone: 'Africa/Monrovia', countryCode: 'LR', city: 'Liberia (Monrovia)', region: 'Africa - West', aliases: ['Liberia'] },

  // ========== AFRICA - EAST ==========
  { timezone: 'Africa/Nairobi', countryCode: 'KE', city: 'Kenya (Nairobi)', region: 'Africa - East', aliases: ['Kenya', 'EAT', 'Kenyan', 'Mombasa'] },
  { timezone: 'Africa/Dar_es_Salaam', countryCode: 'TZ', city: 'Tanzania (Dar es Salaam)', region: 'Africa - East', aliases: ['Tanzania', 'EAT', 'Tanzanian', 'Zanzibar'] },
  { timezone: 'Africa/Kampala', countryCode: 'UG', city: 'Uganda (Kampala)', region: 'Africa - East', aliases: ['Uganda', 'EAT', 'Ugandan'] },
  { timezone: 'Africa/Addis_Ababa', countryCode: 'ET', city: 'Ethiopia (Addis Ababa)', region: 'Africa - East', aliases: ['Ethiopia', 'EAT', 'Ethiopian'] },
  { timezone: 'Africa/Kigali', countryCode: 'RW', city: 'Rwanda (Kigali)', region: 'Africa - East', aliases: ['Rwanda', 'CAT', 'Rwandan'] },
  { timezone: 'Africa/Bujumbura', countryCode: 'BI', city: 'Burundi (Bujumbura)', region: 'Africa - East', aliases: ['Burundi'] },
  { timezone: 'Africa/Mogadishu', countryCode: 'SO', city: 'Somalia (Mogadishu)', region: 'Africa - East', aliases: ['Somalia', 'Somali'] },
  { timezone: 'Africa/Djibouti', countryCode: 'DJ', city: 'Djibouti', region: 'Africa - East', aliases: [] },
  { timezone: 'Africa/Asmara', countryCode: 'ER', city: 'Eritrea (Asmara)', region: 'Africa - East', aliases: ['Eritrea'] },
  { timezone: 'Indian/Antananarivo', countryCode: 'MG', city: 'Madagascar (Antananarivo)', region: 'Africa - East', aliases: ['Madagascar', 'Malagasy'] },

  // ========== AFRICA - SOUTHERN ==========
  { timezone: 'Africa/Johannesburg', countryCode: 'ZA', city: 'South Africa (Johannesburg)', region: 'Africa - Southern', aliases: ['South Africa', 'SAST', 'Cape Town', 'Pretoria', 'Durban', 'South African'] },
  { timezone: 'Africa/Harare', countryCode: 'ZW', city: 'Zimbabwe (Harare)', region: 'Africa - Southern', aliases: ['Zimbabwe', 'CAT', 'Zimbabwean'] },
  { timezone: 'Africa/Gaborone', countryCode: 'BW', city: 'Botswana (Gaborone)', region: 'Africa - Southern', aliases: ['Botswana', 'CAT'] },
  { timezone: 'Africa/Windhoek', countryCode: 'NA', city: 'Namibia (Windhoek)', region: 'Africa - Southern', aliases: ['Namibia', 'WAT', 'Namibian'] },
  { timezone: 'Africa/Lusaka', countryCode: 'ZM', city: 'Zambia (Lusaka)', region: 'Africa - Southern', aliases: ['Zambia', 'Zambian'] },
  { timezone: 'Africa/Maputo', countryCode: 'MZ', city: 'Mozambique (Maputo)', region: 'Africa - Southern', aliases: ['Mozambique', 'Mozambican'] },
  { timezone: 'Africa/Blantyre', countryCode: 'MW', city: 'Malawi (Blantyre)', region: 'Africa - Southern', aliases: ['Malawi', 'Lilongwe'] },
  { timezone: 'Africa/Luanda', countryCode: 'AO', city: 'Angola (Luanda)', region: 'Africa - Southern', aliases: ['Angola', 'Angolan'] },
  { timezone: 'Africa/Kinshasa', countryCode: 'CD', city: 'DR Congo (Kinshasa)', region: 'Africa - Southern', aliases: ['DRC', 'Congo', 'Democratic Republic of Congo'] },
  { timezone: 'Africa/Lubumbashi', countryCode: 'CD', city: 'DR Congo (Lubumbashi)', region: 'Africa - Southern', aliases: ['DRC East', 'Katanga'] },
  { timezone: 'Africa/Douala', countryCode: 'CM', city: 'Cameroon (Douala)', region: 'Africa - Southern', aliases: ['Cameroon', 'Yaounde', 'Cameroonian'] },
  { timezone: 'Indian/Mauritius', countryCode: 'MU', city: 'Mauritius (Port Louis)', region: 'Africa - Southern', aliases: ['Mauritius', 'MUT', 'Mauritian'] },
  { timezone: 'Indian/Reunion', countryCode: 'RE', city: 'Réunion (Saint-Denis)', region: 'Africa - Southern', aliases: ['Reunion', 'La Réunion'] },
  { timezone: 'Indian/Mayotte', countryCode: 'YT', city: 'Mayotte (Mamoudzou)', region: 'Africa - Southern', aliases: ['Mayotte'] },
  { timezone: 'Africa/Juba', countryCode: 'SS', city: 'South Sudan (Juba)', region: 'Africa - Southern', aliases: ['South Sudan'] },

  // ========== ATLANTIC ==========
  { timezone: 'Atlantic/Azores', countryCode: 'PT', city: 'Portugal (Azores)', region: 'Atlantic', aliases: ['Azores', 'Açores'] },
  { timezone: 'Atlantic/Cape_Verde', countryCode: 'CV', city: 'Cape Verde (Praia)', region: 'Atlantic', aliases: ['Cape Verde', 'Cabo Verde'] },
  { timezone: 'Atlantic/Bermuda', countryCode: 'BM', city: 'Bermuda (Hamilton)', region: 'Atlantic', aliases: ['Bermuda'] },
  { timezone: 'Atlantic/South_Georgia', countryCode: 'GS', city: 'South Georgia', region: 'Atlantic', aliases: ['South Georgia and the South Sandwich Islands'] },

  // ========== OTHER ==========
  { timezone: 'UTC', countryCode: '', city: 'UTC', region: 'Other', aliases: ['Coordinated Universal Time', 'GMT', 'Greenwich', 'Zulu', 'Z'] },
  { timezone: 'Etc/GMT+12', countryCode: '', city: 'GMT-12', region: 'Other', aliases: ['International Date Line West'] },
  { timezone: 'Etc/GMT-14', countryCode: '', city: 'GMT+14', region: 'Other', aliases: ['Line Islands'] },
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
    'Russia',
    'Americas - North',
    'Americas - Central',
    'Americas - Caribbean',
    'Americas - South',
    'Oceania',
    'Africa - North',
    'Africa - West',
    'Africa - East',
    'Africa - Southern',
    'Atlantic',
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
