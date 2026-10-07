import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness, type PublicBusiness } from "@/lib/public-site";
import { directionsUrl, staticMapUrl, viewOnMapUrl } from "@/lib/static-map";
import ContactForm from "./contact-form";
import ContactMap from "./contact-map";

// sqrtx.co/<address>/contact: the business's contact details, a map and a form to write to it (Figma "Contact Phone new" 2157:611,
// "Contact Tablet new" 2036:761, "Contact Desktop new" 1681:347, measured 2026-10-01). The layout next to this file draws the top and
// bottom bars and 404s a business that isn't public. Everything here but the form is plain HTML made on the server (no JavaScript).
//  - Phone: 50px under the bar, then the details (Inter 16/19, 11px apart), 30px under them the map (328 x 250), "Contact us" (24px
//    medium, centered, 50px above and below) and the form (contact-form.tsx).
//  - Tablet (from 500px of content, the width of its map and form): the same in a centered column, the details 494px wide and the map and the form 500px.
//  - Desktop (from 1030px of content): the details (494px) and the map (500px) side by side, 30px apart, in a 1024px row; the form is 924px.
// The detail lines are the profile's own: Location (city, state, country), Address (street and postal code), Phone, Email, Hours, and
// the Facebook and Instagram icons (the design also draws YouTube; a profile has no YouTube link). A line the business left empty is
// not shown. Not in the design: the lines are links (phone, email, the address's map), and the heading says "Contact us" (the designs
// have a typo, "Contac us").
// The map is a picture of the neighbourhood from Google's Static Maps in the site's greys with a black pin at the business's position (about 45 KB,
// no script), with a black "Get directions" button under it (contact-map.tsx, lib/static-map.ts). When Google's picture is not available (no key, or
// the service refuses the request) OpenStreetMap's embedded map behind a "Show map" button (map-embed.tsx, about 345 KB of script, so it loads only
// when pressed) takes its place.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  return business ? { title: `Contact – ${business.company_name}` } : {};
}

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();

  const location = [business.city, business.state_province, countryName(business.country_code)].filter(Boolean).join(", ");
  const address = [business.street_address, business.postal_code].filter(Boolean).join(", ");
  const link = "hover:underline focus-visible:underline";
  const social = [
    business.facebook_link && { label: "Facebook", href: business.facebook_link, icon: <FacebookIcon /> },
    business.instagram_link && { label: "Instagram", href: business.instagram_link, icon: <InstagramIcon /> },
  ].filter((item) => !!item);

  return (
    <main className="@container mx-auto flex w-full flex-col px-4 pt-12.5 pb-17.5 md:px-10 md:pb-25">
      <div className="mx-auto flex w-full max-w-82 flex-col @min-[500px]:max-w-125 @min-[1030px]:max-w-256">
        <section className="flex flex-col gap-7.5 @min-[1030px]:flex-row @min-[1030px]:justify-center">
          <div className="flex flex-col gap-2.75 text-[16px] leading-[1.21] text-black @min-[500px]:w-123.5 @min-[500px]:self-center @min-[1030px]:self-auto">
            {location && <p>Location: {location}</p>}
            {address && <p>Address: {address}</p>}
            {business.phone && (
              <p>
                Phone:{" "}
                <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} className={link}>
                  {business.phone}
                </a>
              </p>
            )}
            <p>
              Email:{" "}
              <a href={`mailto:${business.contact_email}`} className={`${link} wrap-anywhere`}>
                {business.contact_email}
              </a>
            </p>
            {business.hours && <p>Hours: {business.hours}</p>}
            {social.length > 0 && (
              <div className="flex items-center gap-3">
                {social.map((item) => (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label} className="flex size-7 items-center justify-center">
                    {item.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          <Map business={business} />
        </section>

        <h1 className="my-12.5 text-center text-[24px] leading-[1.21] font-medium text-black">Contact us</h1>

        <div className="mx-auto w-full @min-[1030px]:max-w-231">
          <ContactForm userId={business.user_id} />
        </div>
      </div>
    </main>
  );
}

// The country's name from its two-letter code ("US" -> "United States"); the code itself if the browser's list doesn't know it.
function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

// The map of the business's position: Google's picture, and OpenStreetMap's embedded map as its fallback (a box of about 1.3 x 1.3 km around the
// position, with a marker in the middle).
function Map({ business }: { business: PublicBusiness }) {
  const point = business.coordinates?.coordinates;
  if (!point) return null;
  const [lon, lat] = point;
  const dLon = 0.009;
  const dLat = 0.006;
  const box = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((n) => n.toFixed(5)).join("%2C");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lon.toFixed(5)}`;
  return (
    <ContactMap
      // NEXT_PUBLIC_ values must be written out in full like this so Next.js can put them into the browser bundle.
      imageSrc={staticMapUrl(lat, lon, process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)}
      osmSrc={src}
      title={`Map: ${business.formatted_address}`}
      viewHref={viewOnMapUrl(lat, lon)}
      directionsHref={directionsUrl(lat, lon)}
    />
  );
}

// The two icons of the design, drawn as thin outlines at its sizes (its own vector shapes did not come with the capture).
function FacebookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 26 26" className="h-6.5 w-6.5" fill="none" stroke="#1e1e1e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.2 24.5V14.2h3.6l.6-4.2h-4.2V7.6c0-1.2.4-2 2.1-2h2.2V1.9c-.4 0-1.7-.2-3.2-.2-3.1 0-5.2 1.9-5.2 5.4V10H7v4.2h3.9v10.3" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 26 26" className="h-6.5 w-6.5" fill="none" stroke="#1e1e1e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.2" y="2.2" width="21.6" height="21.6" rx="6" />
      <circle cx="13" cy="13" r="5.2" />
      <circle cx="19.4" cy="6.6" r="0.9" fill="#1e1e1e" stroke="none" />
    </svg>
  );
}
