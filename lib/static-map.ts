// The links of the Contact page's map (Google Maps), made from a business's position. No script of Google's is loaded: the map is one picture.

// The look of the map: the site's own greys (the light grey #f3f4f6 of the services' photos for the land, white roads, a darker grey water, dark grey
// labels), no shops, no transit, no icons and no neighbourhood names (they crowded a map this small). It is the URL's `style` parameters, which
// Google does not bill separately: only the picture's request counts (Static Maps, 10,000 a month free at the time of writing, then about $2 per 1,000).
const STYLE = [
  "element:geometry|color:0xf3f4f6",
  "element:labels.icon|visibility:off",
  "element:labels.text.fill|color:0x4b5563",
  "element:labels.text.stroke|color:0xf3f4f6",
  "feature:road|element:geometry|color:0xffffff",
  "feature:road|element:geometry.stroke|color:0xe5e7eb",
  "feature:water|element:geometry|color:0xd9dde3",
  "feature:poi|visibility:off",
  "feature:transit|visibility:off",
  "feature:administrative.neighborhood|element:labels|visibility:off",
  "feature:administrative.land_parcel|visibility:off",
];

// The size of the picture in CSS pixels: the box of the Contact page's map on desktop (500 x 250). On a phone the box is narrower and the picture is
// cropped to it (object-cover), the pin stays in the middle. It is asked for at 2x (1000 x 500 px, about 45 KB) so it is sharp on retina screens.
export const STATIC_MAP_WIDTH = 500;
export const STATIC_MAP_HEIGHT = 250;
const ZOOM = 15; // about the neighbourhood: the streets around the address, readable at this size

/**
 * The address of the map picture, with a black pin at the business's position, or null when there is no key. The key is the browser key of the site
 * (the one of the address search): it is in the page's HTML like any such key, so it must be restricted in Google Cloud to the site's addresses and to
 * the APIs it needs (Places and Static Maps).
 */
export function staticMapUrl(latitude: number, longitude: number, key: string | undefined): string | null {
  if (!key) return null;
  const point = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const parts = [
    `center=${point}`,
    `zoom=${ZOOM}`,
    `size=${STATIC_MAP_WIDTH}x${STATIC_MAP_HEIGHT}`,
    "scale=2",
    "maptype=roadmap",
    ...STYLE.map((rule) => `style=${encodeURIComponent(rule)}`),
    `markers=${encodeURIComponent(`color:black|${point}`)}`,
    `key=${encodeURIComponent(key)}`,
  ];
  return `https://maps.googleapis.com/maps/api/staticmap?${parts.join("&")}`;
}

/** Opens Google Maps (the app on a phone that has it) with the route TO the business, starting from where the visitor is. */
export const directionsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

/** Opens Google Maps on the business's position. */
export const viewOnMapUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
