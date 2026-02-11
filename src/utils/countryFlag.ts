/**
 * Convert a country code (ISO 3166-1 alpha-2) to a flag emoji.
 * Also handles common country names by mapping them to codes.
 */

const NAME_TO_CODE: Record<string, string> = {
  'afghanistan': 'AF', 'albania': 'AL', 'algeria': 'DZ', 'argentina': 'AR',
  'australia': 'AU', 'austria': 'AT', 'bangladesh': 'BD', 'belgium': 'BE',
  'brazil': 'BR', 'canada': 'CA', 'china': 'CN', 'colombia': 'CO',
  'denmark': 'DK', 'egypt': 'EG', 'finland': 'FI', 'france': 'FR',
  'germany': 'DE', 'greece': 'GR', 'india': 'IN', 'indonesia': 'ID',
  'iran': 'IR', 'iraq': 'IQ', 'ireland': 'IE', 'israel': 'IL',
  'italy': 'IT', 'japan': 'JP', 'kenya': 'KE', 'south korea': 'KR',
  'kuwait': 'KW', 'malaysia': 'MY', 'mexico': 'MX', 'nepal': 'NP',
  'netherlands': 'NL', 'new zealand': 'NZ', 'nigeria': 'NG', 'norway': 'NO',
  'pakistan': 'PK', 'philippines': 'PH', 'poland': 'PL', 'portugal': 'PT',
  'qatar': 'QA', 'romania': 'RO', 'russia': 'RU', 'saudi arabia': 'SA',
  'singapore': 'SG', 'south africa': 'ZA', 'spain': 'ES', 'sri lanka': 'LK',
  'sweden': 'SE', 'switzerland': 'CH', 'thailand': 'TH', 'turkey': 'TR',
  'uae': 'AE', 'united arab emirates': 'AE', 'uk': 'GB',
  'united kingdom': 'GB', 'united states': 'US', 'usa': 'US',
  'vietnam': 'VN',
};

function toCountryCode(input: string): string | null {
  const trimmed = input.trim();
  // Already a 2-letter code
  if (/^[A-Z]{2}$/.test(trimmed.toUpperCase()) && trimmed.length === 2) {
    return trimmed.toUpperCase();
  }
  return NAME_TO_CODE[trimmed.toLowerCase()] ?? null;
}

export function countryToFlag(country: string | null | undefined): string | null {
  if (!country) return null;
  const code = toCountryCode(country);
  if (!code) return null;
  return String.fromCodePoint(
    ...code.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
