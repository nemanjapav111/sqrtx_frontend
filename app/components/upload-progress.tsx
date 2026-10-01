import { uploadLabel, uploadPercent, type UploadStatus } from "@/lib/upload";

// The progress of an upload under the Save/Add button: what is going on in words, the percentage, and a thin bar (black on light grey,
// like the rest of the site). It only moves forward (see lib/upload.ts); the bar eases between steps, and not at all for people who
// ask their system for less motion. A screen reader hears the words (the percentage is the bar's value, not read out again and again).
export default function UploadProgress({ status, what, count = 1 }: { status: UploadStatus; what: "photo" | "logo"; count?: number }) {
  const percent = uploadPercent(status);
  const label = uploadLabel(status, what, count);
  return (
    <div className="flex w-full flex-col gap-1.5">
      <p role="status" className="flex items-baseline justify-center gap-2 text-[13px] font-medium text-[#4b5563]">
        <span>{label}…</span>
        <span aria-hidden className="tabular-nums">
          {percent}%
        </span>
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1 w-full overflow-hidden bg-[#e5e7eb]"
      >
        <div className="h-full bg-black transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
