// What a product's (or a service's) page shows the moment a card is clicked, while the server is still building the real page (a fraction of a
// second; the four `loading.tsx` files of the product and service pages draw this). Without it Next keeps the OLD page on screen until the new one is ready, so a click seems to do nothing. It is
// the real page's layout (item-detail/item-detail.tsx: same boxes, order and sizes) drawn as plain grey blocks (no moving sweep),
// so the page doesn't jump when the real one replaces it. The top bar and bottom bar are the layout's own and stay.
// `companyLine`: the marketplace's pages have the business's slim line under the price, a business's own pages don't.
function Block({ className }: { className: string }) {
  return (
    <div aria-hidden className={`bg-[#f3f4f6] ${className}`} />
  );
}

export function ItemLoading({ companyLine = false }: { companyLine?: boolean }) {
  return (
    <div className="flex w-full flex-1 flex-col" role="status" aria-label="Loading the page">
      <div className="relative mx-auto w-full max-w-360">
        <main className={`flex w-full flex-col gap-2.5 pt-1.5 pb-10 min-[1120px]:grid min-[1120px]:grid-cols-[minmax(0,740fr)_minmax(0,680fr)] ${companyLine ? "min-[1120px]:grid-rows-[auto_auto_1fr]" : "min-[1120px]:grid-rows-[auto_1fr]"} min-[1120px]:items-start min-[1120px]:gap-x-0 min-[1120px]:gap-y-3.75 min-[1120px]:px-2.5 min-[1120px]:pt-0 min-[1120px]:pb-16`}>
          {/* The photos: the photo (450px high; on desktop with room for its arrows at the sides) and the small photos under it. */}
          <div className={`flex w-full flex-col gap-2.5 max-[1120px]:order-1 md:max-[1120px]:mx-auto md:max-[1120px]:max-w-170 min-[1120px]:col-start-1 ${companyLine ? "min-[1120px]:row-span-3" : "min-[1120px]:row-span-2"} min-[1120px]:row-start-1 min-[1120px]:gap-5 min-[1120px]:pt-24 min-[1120px]:pl-10`}>
            <div className="h-112.5 w-full min-[1120px]:px-17.25">
              <Block className="size-full" />
            </div>
            <div className="flex gap-2.5 px-4 max-md:py-px md:px-0 md:max-[1120px]:self-start min-[1120px]:ml-17.25">
              {[0, 1, 2, 3].map((i) => (
                <Block key={i} className="size-14 shrink-0 md:size-22.5" />
              ))}
            </div>
          </div>

          {/* The name and the price. */}
          <div className="flex flex-col px-4 max-[1120px]:order-2 md:max-[1120px]:mx-auto md:max-[1120px]:w-full md:max-[1120px]:max-w-170 md:max-[1120px]:px-0 md:max-[1120px]:pt-2 min-[1120px]:col-start-2 min-[1120px]:row-start-1 min-[1120px]:gap-3.75 min-[1120px]:pt-25 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)]">
            <Block className="h-7.25 w-3/4 min-[1120px]:h-9.25" />
            <Block className="h-7.25 w-24 min-[1120px]:h-6" />
          </div>

          {companyLine && (
            <div className="flex min-h-11 items-center gap-2.5 px-4 max-[1120px]:order-3 md:max-[1120px]:mx-auto md:max-[1120px]:w-full md:max-[1120px]:max-w-170 md:max-[1120px]:px-0 min-[1120px]:col-start-2 min-[1120px]:row-start-2 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)]">
              <Block className="h-7 w-18 shrink-0 min-[1120px]:h-14.5 min-[1120px]:w-25" />
              <Block className="h-5 w-36" />
            </div>
          )}

          {/* "View contact", then the text. */}
          <div className={`flex w-full flex-col gap-3.75 px-4 pt-2.5 max-[1120px]:order-4 md:max-[1120px]:mx-auto md:max-[1120px]:max-w-170 md:max-[1120px]:px-0 min-[1120px]:col-start-2 ${companyLine ? "min-[1120px]:row-start-3" : "min-[1120px]:row-start-2"} min-[1120px]:pt-0 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)]`}>
            <Block className="h-11 w-full md:w-48" />
            <div className="flex flex-col gap-2.5 pb-5 min-[1120px]:max-w-140 min-[1120px]:pt-8.75 min-[1120px]:pb-0">
              <Block className="h-5 w-full" />
              <Block className="h-5 w-5/6" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
