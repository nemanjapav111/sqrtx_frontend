// The loading state from the design ("Load_more_products", Figma 1549:99): a plain white 124 x 42 block with a black
// square and the word "Loading". The design's content sits 26px from the left and 35px from the right, so it is not
// centred in the block; that is kept as drawn. The square turns around its centre so the block doesn't look frozen (the
// design is a still picture; the movement is an addition, and it is switched off for people who asked for less motion).
export default function Loading() {
  return (
    <div role="status" className="flex h-10.5 w-31 items-center bg-white pr-8.75 pl-6.5 text-[12px] text-black">
      <span aria-hidden className="size-2.75 shrink-0 bg-black motion-safe:animate-spin" />
      <span className="ml-1.75">Loading</span>
    </div>
  );
}
