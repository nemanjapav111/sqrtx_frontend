// What the @modal slots show for every page that is not a product or a service opened from a list: nothing. Each page of the site needs one of these files in the slot, so that moving to it
// from an open product or service closes the overlay (a slot that no longer matches the new address would otherwise keep showing what it showed; Next.js parallel routes, a soft move inside the
// site). A catch-all route cannot do this here: it would clash with the business pages that share the address space.
export default function NoOverlay() {
  return null;
}
