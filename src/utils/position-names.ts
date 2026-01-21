/**
 * Position name utilities - expands common abbreviations to full forms
 */

const POSITION_ABBREVIATIONS: Record<string, string> = {
  'CEO': 'Chief Executive Officer (CEO)',
  'CFO': 'Chief Financial Officer (CFO)',
  'COO': 'Chief Operating Officer (COO)',
  'CTO': 'Chief Technology Officer (CTO)',
  'CMO': 'Chief Marketing Officer (CMO)',
  'CHRO': 'Chief Human Resources Officer (CHRO)',
  'CIO': 'Chief Information Officer (CIO)',
  'CSO': 'Chief Security Officer (CSO)',
  'CCO': 'Chief Compliance Officer (CCO)',
  'CDO': 'Chief Data Officer (CDO)',
  'CPO': 'Chief Product Officer (CPO)',
  'CLO': 'Chief Legal Officer (CLO)',
  'CRO': 'Chief Revenue Officer (CRO)',
  'VP': 'Vice President (VP)',
  'SVP': 'Senior Vice President (SVP)',
  'EVP': 'Executive Vice President (EVP)',
  'AVP': 'Assistant Vice President (AVP)',
  'MD': 'Managing Director (MD)',
  'GM': 'General Manager (GM)',
  'HR': 'Human Resources (HR)',
  'IT': 'Information Technology (IT)',
  'PR': 'Public Relations (PR)',
  'PA': 'Personal Assistant (PA)',
  'EA': 'Executive Assistant (EA)',
  'PM': 'Project Manager (PM)',
  'QA': 'Quality Assurance (QA)',
  'UX': 'User Experience (UX)',
  'UI': 'User Interface (UI)',
};

/**
 * Expands position abbreviations to their full form.
 * For pure abbreviations (e.g., "CEO"), returns full form with abbreviation.
 * For mixed text (e.g., "HR Manager"), expands the abbreviation part.
 */
export function expandPositionName(name: string): string {
  // Check for exact match first (pure abbreviation)
  if (POSITION_ABBREVIATIONS[name]) {
    return POSITION_ABBREVIATIONS[name];
  }

  // Check if the name starts with an abbreviation followed by a space
  for (const [abbr, full] of Object.entries(POSITION_ABBREVIATIONS)) {
    if (name.startsWith(abbr + ' ')) {
      // Extract the full form without the abbreviation in parentheses
      const fullWithoutAbbr = full.replace(` (${abbr})`, '');
      return name.replace(abbr, fullWithoutAbbr);
    }
  }

  return name;
}

/**
 * Gets just the abbreviation from a full position name if applicable
 */
export function getPositionAbbreviation(name: string): string | null {
  for (const [abbr, full] of Object.entries(POSITION_ABBREVIATIONS)) {
    if (name === abbr || name === full) {
      return abbr;
    }
  }
  return null;
}
