import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness, type PublicBusiness } from "@/lib/public-site";
import { directionsUrl, staticMapUrl, viewOnMapUrl, STATIC_MAP_DESKTOP_HEIGHT } from "@/lib/static-map";
import ContactForm from "./contact-form";
import ContactMap from "./contact-map";

// sqrtx.co/<address>/contact: the business's contact details, a map and a form to write to it. The layout next to this file draws the top and
// bottom bars and 404s a business that isn't public. Everything here but the form is plain HTML made on the server (no JavaScript).
// Redesigned 2026-10-07 (owner's choice from a mock-up; the older Figma designs "Contact Phone new" 2157:611, "Contact Tablet new" 2036:761 and
// "Contact Desktop new" 1681:347 had the details as plain lines): nothing above the details, no heading block.
//  - The details are ROWS between thin lines: a small grey label ("Location", "Address", "Phone", "Email", "Hours", "Follow") over the value in
//    larger black type. A thin black line opens the list. Address, phone and email are links (the address opens Google Maps, the phone dials, the email
//    writes), with a small square icon at the row's end that says so. A row the business left empty is not shown.
//  - Phone: 50px under the bar, the rows, 30px under them the map (328 x 250) and its black "Get directions" button, then "Send a message" (24px
//    medium, centered, 50px above and below) and the form (contact-form.tsx).
//  - Tablet (from 500px of content, the width of its map and form): the same in a centered column, the rows 494px wide and the map and the form 500px.
//  - Desktop (from 1030px of content): the rows (468px) and the map (500px) side by side, 56px apart, in a 1024px row; the map has a FIXED size, the one
//    that matches the rows when all six are there (438px high, so that with its button it is as tall as the six rows: 491px) and its button is under it; the form is as wide as the row (1024px) and "Send a message"
//    is at the left, like the rows.
// The values are the profile's own: Location (city, state, country), Address (street and postal code), Phone, Email, Hours, and the Facebook and
// Instagram icons (the design also draws YouTube; a profile has no YouTube link).
// The map is a picture of the neighbourhood from Google's Static Maps in the site's greys with a red pin at the business's position (about 45 KB,
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
  // The hours are ONE line of text the owner typed (a text box of up to 255 characters; its hint says "Mon-Sat 5am-7pm, Sunday Closed"): each part
  // between commas, semicolons or line breaks goes on its own line, so that example reads as two lines and a longer one does not run together.
  const hoursLines = (business.hours ?? "")
    .split(/\s*[,;\n]\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
  const point = business.coordinates?.coordinates;
  // Where the address row leads: the business's position on Google Maps (its address as words when the position is not known).
  const addressHref = point
    ? viewOnMapUrl(point[1], point[0])
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.formatted_address)}`;
  const social = [
    business.facebook_link && { label: "Facebook", href: business.facebook_link, icon: <FacebookIcon /> },
    business.instagram_link && { label: "Instagram", href: business.instagram_link, icon: <InstagramIcon /> },
  ].filter((item) => !!item);

  return (
    <main className="@container mx-auto flex w-full flex-col px-4 pt-12.5 pb-17.5 md:px-10 md:pb-25">
      <div className="mx-auto flex w-full max-w-82 flex-col @min-[500px]:max-w-125 @min-[1030px]:max-w-256">
        <section className="flex flex-col gap-7.5 @min-[1030px]:flex-row @min-[1030px]:items-start @min-[1030px]:gap-14">
          <div className="flex flex-col @min-[500px]:w-123.5 @min-[500px]:self-center @min-[1030px]:w-117 @min-[1030px]:shrink-0 @min-[1030px]:self-start">
            {location && <Row label="Location">{location}</Row>}
            {address && (
              <Row label="Address" href={addressHref} external icon={<ArrowIcon />}>
                {address}
              </Row>
            )}
            {business.phone && (
              <Row label="Phone" href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} icon={<PhoneIcon />}>
                {business.phone}
              </Row>
            )}
            <Row label="Email" href={`mailto:${business.contact_email}`} icon={<MailIcon />} breakAnywhere>
              {business.contact_email}
            </Row>
            {hoursLines.length > 0 && (
              <Row label="Hours">
                {hoursLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </Row>
            )}
            {social.length > 0 && (
              <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] py-4.5">
                <span className="text-[13px] leading-[1.2] font-medium text-[#8f8f8f]">Follow</span>
                <div className="flex items-center gap-2">
                  {social.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      className="flex size-9 items-center justify-center border border-[#d4d4d4] hover:border-black focus-visible:border-black"
                    >
                      {item.icon}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Map business={business} />
        </section>

        <h2 className="mt-14 mb-9 text-left text-[24px] leading-[1.15] font-medium tracking-[-0.02em] text-black @min-[1030px]:mt-18 @min-[1030px]:text-[28px]">Send a message</h2>

        <div className="w-full">
          <ContactForm userId={business.user_id} />
        </div>
      </div>
    </main>
  );
}

// One row of the details: the label over the value, a thin grey line under it. With `href` the whole row is a link (an `icon` at its end says what it
// does); `external` opens it in a new tab.
function Row({
  label,
  children,
  href,
  icon,
  external,
  breakAnywhere,
}: {
  label: string;
  children: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  external?: boolean;
  breakAnywhere?: boolean;
}) {
  const content = (
    <>
      <span className="min-w-0">
        <span className="block text-[13px] leading-[1.2] font-medium text-[#8f8f8f]">{label}</span>
        <span className={`mt-1.5 block text-[16px] leading-[1.3] text-black ${breakAnywhere ? "wrap-anywhere" : ""}`}>
          {children}
        </span>
      </span>
      {icon && (
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center border border-[#d4d4d4] group-hover:border-black group-focus-visible:border-black">
          {icon}
        </span>
      )}
    </>
  );
  const box = "flex items-center justify-between gap-4 border-b border-[#e5e7eb] py-4.5";
  return href ? (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`group ${box}`}>
      {content}
    </a>
  ) : (
    <div className={box}>{content}</div>
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

// The map of the business's position: Google's picture (a 500 x 250 one for the phone and the tablet, a 500 x 438 one for the desktop, where the map
// has a fixed height), and OpenStreetMap's embedded map as its fallback (a box of about 1.3 x 1.3 km around the position, with a marker in the middle).
function Map({ business }: { business: PublicBusiness }) {
  const point = business.coordinates?.coordinates;
  if (!point) return null;
  const [lon, lat] = point;
  const dLon = 0.009;
  const dLat = 0.006;
  const box = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((n) => n.toFixed(5)).join("%2C");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lon.toFixed(5)}`;
  // NEXT_PUBLIC_ values must be written out in full like this so Next.js can put them into the browser bundle.
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return (
    <ContactMap
      imageSrc={staticMapUrl(lat, lon, key)}
      desktopImageSrc={staticMapUrl(lat, lon, key, STATIC_MAP_DESKTOP_HEIGHT)}
      osmSrc={src}
      title={`Map: ${business.formatted_address}`}
      viewHref={viewOnMapUrl(lat, lon)}
      directionsHref={directionsUrl(lat, lon)}
    />
  );
}

// The icons are thin outlines like the site's own.
const icon = { "aria-hidden": true, viewBox: "0 0 24 24", fill: "none", stroke: "#000", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", className: "size-4" } as const;

function ArrowIcon() {
  return (
    <svg {...icon} strokeWidth={1.8} className="size-3.5">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...icon}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...icon}>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

// The two icons of the design, drawn as thin outlines at its sizes (its own vector shapes did not come with the capture).
function FacebookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 26 26" className="size-4.5" fill="none" stroke="#1e1e1e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.2 24.5V14.2h3.6l.6-4.2h-4.2V7.6c0-1.2.4-2 2.1-2h2.2V1.9c-.4 0-1.7-.2-3.2-.2-3.1 0-5.2 1.9-5.2 5.4V10H7v4.2h3.9v10.3" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 26 26" className="size-4.5" fill="none" stroke="#1e1e1e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.2" y="2.2" width="21.6" height="21.6" rx="6" />
      <circle cx="13" cy="13" r="5.2" />
      <circle cx="19.4" cy="6.6" r="0.9" fill="#1e1e1e" stroke="none" />
    </svg>
  );
}
