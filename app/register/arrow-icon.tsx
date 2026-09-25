// The → character isn't in the Inter font files Google serves, so the arrow is an SVG.
export default function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 11 12" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M0 6h9.6M5.1 1.5L9.6 6l-4.5 4.5" />
    </svg>
  );
}
