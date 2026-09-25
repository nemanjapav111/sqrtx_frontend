import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

// Everything about Google Places (address search) lives in this file, so the rest of the site never touches
// Google's objects. It uses the current "Places API (New)": type a few letters, get suggestions, pick one.
//
// Google's script is only downloaded the first time someone types in the address box.
// Google bills address search per "session" (all the typing until a place is picked), so one session token is
// used for a whole search and a new one is made after each pick.

// What we keep about a chosen address. The field names match what the business profile API needs.
export interface PlaceDetails {
  id: string; // Google's place id
  formattedAddress: string;
  latitude: number;
  longitude: number;
  countryCode: string; // two letters, like "RS" or "US"
  city: string;
  street: string | null; // "15 Main St"
  state: string | null;
  postalCode: string | null;
}

export interface AddressSuggestion {
  text: string; // what to show in the list
  prediction: google.maps.places.PlacePrediction;
}

export type SessionToken = google.maps.places.AutocompleteSessionToken;

let configured = false;

async function placesLibrary() {
  if (!configured) {
    // NEXT_PUBLIC_ values must be written out in full like this so Next.js can put them into the browser bundle.
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) throw new Error("Address search is not set up: missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (see .env.local).");
    setOptions({ key, v: "weekly" }); // the loader allows this only once
    configured = true;
  }
  return importLibrary("places");
}

export async function newSessionToken(): Promise<SessionToken> {
  const { AutocompleteSessionToken } = await placesLibrary();
  return new AutocompleteSessionToken();
}

/** Up to 5 address suggestions for what the user has typed so far. */
export async function searchAddresses(input: string, token: SessionToken): Promise<AddressSuggestion[]> {
  const { AutocompleteSuggestion } = await placesLibrary();
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, sessionToken: token });
  return suggestions
    .flatMap((s) => (s.placePrediction ? [{ text: s.placePrediction.text.text, prediction: s.placePrediction }] : []))
    .slice(0, 5);
}

/** Fetches the details of a picked suggestion. Throws if Google's answer lacks something the profile needs. */
export async function getPlaceDetails(suggestion: AddressSuggestion): Promise<PlaceDetails> {
  const place = suggestion.prediction.toPlace();
  await place.fetchFields({ fields: ["id", "formattedAddress", "location", "addressComponents"] });
  return parsePlace(place);
}

// Google describes an address as a list of parts, each with types like "locality" or "postal_code".
type Part = { types: string[]; longText: string | null; shortText: string | null };

function part(parts: Part[] | null | undefined, type: string, which: "longText" | "shortText" = "longText") {
  return parts?.find((p) => p.types.includes(type))?.[which] ?? null;
}

export function parsePlace(place: {
  id: string;
  formattedAddress?: string | null;
  location?: { lat(): number; lng(): number } | null;
  addressComponents?: Part[] | null;
}): PlaceDetails {
  const parts = place.addressComponents;
  // Villages, boroughs and postal towns don't always have a "locality", so fall back through the alternatives.
  const city =
    part(parts, "locality") ??
    part(parts, "postal_town") ??
    part(parts, "sublocality") ??
    part(parts, "administrative_area_level_2") ??
    part(parts, "administrative_area_level_1");
  const countryCode = part(parts, "country", "shortText");
  const street = [part(parts, "street_number"), part(parts, "route")].filter(Boolean).join(" ") || null;

  if (!place.formattedAddress || !place.location || !city || !countryCode) {
    throw new Error("The chosen address has no city or country.");
  }
  return {
    id: place.id,
    formattedAddress: place.formattedAddress,
    latitude: place.location.lat(),
    longitude: place.location.lng(),
    countryCode,
    city,
    street,
    state: part(parts, "administrative_area_level_1"),
    postalCode: part(parts, "postal_code"),
  };
}
