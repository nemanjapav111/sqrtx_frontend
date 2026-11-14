// The US states (and DC) with their two-letter codes. A business saves the state as Google writes it in full ("Texas"); the location picker shows the
// short form next to the city ("Austin, TX"). Nothing is changed in the database: the code is worked out when the place is shown.
const US_STATES: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

const CODES = new Set(Object.values(US_STATES));

/** "Texas" → "TX". Already a code ("tx") → "TX". Anything else (a typo, a territory) is shown as it was saved. */
export function usStateCode(state: string): string {
  const trimmed = state.trim();
  const byName = US_STATES[trimmed.toLowerCase()];
  if (byName) return byName;
  const upper = trimmed.toUpperCase();
  return CODES.has(upper) ? upper : trimmed;
}
