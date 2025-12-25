/**
 * Zodiac utility functions for determining zodiac sign from date of birth
 */

export interface ZodiacSign {
  sign: string;
  symbol: string;
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
  dateRange: string;
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  { sign: 'Aries', symbol: '♈', element: 'Fire', dateRange: 'Mar 21 - Apr 19' },
  { sign: 'Taurus', symbol: '♉', element: 'Earth', dateRange: 'Apr 20 - May 20' },
  { sign: 'Gemini', symbol: '♊', element: 'Air', dateRange: 'May 21 - Jun 20' },
  { sign: 'Cancer', symbol: '♋', element: 'Water', dateRange: 'Jun 21 - Jul 22' },
  { sign: 'Leo', symbol: '♌', element: 'Fire', dateRange: 'Jul 23 - Aug 22' },
  { sign: 'Virgo', symbol: '♍', element: 'Earth', dateRange: 'Aug 23 - Sep 22' },
  { sign: 'Libra', symbol: '♎', element: 'Air', dateRange: 'Sep 23 - Oct 22' },
  { sign: 'Scorpio', symbol: '♏', element: 'Water', dateRange: 'Oct 23 - Nov 21' },
  { sign: 'Sagittarius', symbol: '♐', element: 'Fire', dateRange: 'Nov 22 - Dec 21' },
  { sign: 'Capricorn', symbol: '♑', element: 'Earth', dateRange: 'Dec 22 - Jan 19' },
  { sign: 'Aquarius', symbol: '♒', element: 'Air', dateRange: 'Jan 20 - Feb 18' },
  { sign: 'Pisces', symbol: '♓', element: 'Water', dateRange: 'Feb 19 - Mar 20' },
];

/**
 * Determines the zodiac sign based on a date of birth
 * @param dateOfBirth - The date of birth (Date object or ISO string)
 * @returns The zodiac sign information or null if invalid date
 */
export function getZodiacSign(dateOfBirth: Date | string): ZodiacSign | null {
  const date = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  
  if (isNaN(date.getTime())) {
    return null;
  }

  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();

  // Zodiac sign date boundaries
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return ZODIAC_SIGNS[0]; // Aries
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return ZODIAC_SIGNS[1]; // Taurus
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return ZODIAC_SIGNS[2]; // Gemini
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return ZODIAC_SIGNS[3]; // Cancer
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return ZODIAC_SIGNS[4]; // Leo
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return ZODIAC_SIGNS[5]; // Virgo
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return ZODIAC_SIGNS[6]; // Libra
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return ZODIAC_SIGNS[7]; // Scorpio
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return ZODIAC_SIGNS[8]; // Sagittarius
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return ZODIAC_SIGNS[9]; // Capricorn
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return ZODIAC_SIGNS[10]; // Aquarius
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return ZODIAC_SIGNS[11]; // Pisces

  return null;
}

export { ZODIAC_SIGNS };
