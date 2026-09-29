// The → character isn't in the Inter font files Google serves, so the arrow is an SVG.
// strokeWidth: 2 is the registration pages' arrow; a smaller number draws a lighter line.
export default function ArrowIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 11 12" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M0 6h9.6M5.1 1.5L9.6 6l-4.5 4.5" />
    </svg>
  );
}
