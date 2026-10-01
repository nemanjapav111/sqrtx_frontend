// What a product's page shows the moment a card is clicked, while the server is still building the real page (a fraction of a
// second). Without it Next keeps the OLD page on screen until the new one is ready, so a click seems to do nothing. It is
// the real page's layout (item-detail/item-detail.tsx, same boxes and sizes) drawn as plain grey blocks (no moving sweep),
// so the page doesn't jump when the real one replaces it. The top bar and bottom bar are the layout's own and stay.
function Block({ className }: { className: string }) {
  return (
    <div aria-hidden className={`bg-[#f3f4f6] ${className}`} />
  );
}

export default function Loading() {
  return (
    <div className="flex w-full flex-1 flex-col" role="status" aria-label="Loading the product">
      <div className="relative mx-auto w-full max-w-360">
        <main className="flex w-full flex-col gap-2.5 pt-4.75 pb-10 min-[1120px]:grid min-[1120px]:grid-cols-[minmax(0,740fr)_minmax(0,680fr)] min-[1120px]:grid-rows-[auto_1fr] min-[1120px]:items-start min-[1120px]:gap-x-0 min-[1120px]:gap-y-3.75 min-[1120px]:px-2.5 min-[1120px]:pt-0 min-[1120px]:pb-16">
          <div className="flex flex-col gap-2.5 px-4 md:max-[1120px]:items-center md:max-[1120px]:px-10 min-[1120px]:col-start-2 min-[1120px]:row-start-1 min-[1120px]:gap-3.75 min-[1120px]:pt-25 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)]">
            <Block className="h-6 w-3/4 min-[1120px]:h-9" />
            <Block className="h-6.5 w-24 min-[1120px]:h-6" />
          </div>

          <div className="flex w-full flex-col gap-2.5 md:max-[1120px]:mx-auto md:max-[1120px]:max-w-225 min-[1120px]:col-start-1 min-[1120px]:row-span-2 min-[1120px]:row-start-1 min-[1120px]:gap-5 min-[1120px]:pt-17.5 min-[1120px]:pl-10">
            <Block className="h-112.5 w-full" />
            <div className="flex justify-center gap-2.5 self-center px-4 md:px-0">
              <Block className="size-20 md:size-22.5" />
              <Block className="size-20 md:size-22.5" />
              <Block className="size-20 md:size-22.5" />
            </div>
          </div>

          <div className="flex w-full flex-col gap-3.75 px-4 pt-2.5 md:max-[1120px]:mx-auto md:max-[1120px]:max-w-170 md:max-[1120px]:px-5 min-[1120px]:col-start-2 min-[1120px]:row-start-2 min-[1120px]:pt-0 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)]">
            <Block className="h-4 w-full" />
            <Block className="h-4 w-5/6" />
            <Block className="h-9 w-35" />
          </div>
        </main>
      </div>
    </div>
  );
}
