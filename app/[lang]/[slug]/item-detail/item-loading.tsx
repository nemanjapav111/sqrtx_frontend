"use client";

import Loading from "@/app/[lang]/components/loading";

// What a product's (or a service's) page shows the moment a card is clicked, while the server is still building the real page (a fraction of a
// second; the four `loading.tsx` files of the product and service pages draw this). Without it Next keeps the OLD page on screen until the new one is ready, so a click seems to do nothing.
// It is the site's own loading mark (components/loading.tsx: the turning black square and "Loading"), centred in the page, in place of the grey blocks drawn before (2026-10-20, the owner).
// The top bar and bottom bar are the layout's own and stay. `companyLine` is no longer needed (the marketplace's pages had a line under the price in the grey blocks); kept so the four callers do not change.
export function ItemLoading({}: { companyLine?: boolean }) {
  return (
    <div className="flex w-full flex-1 items-center justify-center py-24">
      <Loading />
    </div>
  );
}
