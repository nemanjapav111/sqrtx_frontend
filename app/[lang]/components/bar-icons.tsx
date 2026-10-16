// The icons of the phone's bottom bars, the marketplace's (home/home-nav.tsx) and the business pages' (app/[slug]/business-footer.tsx) (2026-10-10, the owner: the old
// shopping bag / briefcase / building / info set looked like a stock icon set). One family: thin 1.6px lines (the bar's CSS sets the width) with square ends and sharp
// corners, like the logo's square. Products is a grid of four squares (a feed of products), Services a service (concierge) bell, Companies a briefcase, About an "i" in a
// square. The page you are on is drawn FILLED (details in white), the others as outlines.
export const BarIcon = ({ on, children }: { on: boolean; children: (fill: string, detail: string) => React.ReactNode }) => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="square" strokeLinejoin="miter">
    {children(on ? "currentColor" : "none", on ? "#fff" : "currentColor")}
  </svg>
);

export const productsIcon = (on: boolean) => (
  <BarIcon on={on}>
    {(fill) => (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" fill={fill} />
        <rect x="13.5" y="3.5" width="7" height="7" fill={fill} />
        <rect x="3.5" y="13.5" width="7" height="7" fill={fill} />
        <rect x="13.5" y="13.5" width="7" height="7" fill={fill} />
      </>
    )}
  </BarIcon>
);

export const servicesIcon = (on: boolean) => (
  <BarIcon on={on}>
    {(fill) => (
      <>
        <path d="M4 17.5a8 8 0 0 1 16 0z" fill={fill} />
        <path d="M2.5 20.5h19" />
        <path d="M12 6v2.5M10 6h4" />
      </>
    )}
  </BarIcon>
);

export const companiesIcon = (on: boolean) => (
  <BarIcon on={on}>
    {(fill, detail) => (
      <>
        <path d="M3.5 8h17v12.5h-17z" fill={fill} />
        <path d="M9 8V4h6v4" />
        <path d="M3.5 13.5h17" stroke={detail} />
      </>
    )}
  </BarIcon>
);

// Contact (the businesses' bar): an envelope, its flap in white when filled.
export const contactIcon = (on: boolean) => (
  <BarIcon on={on}>
    {(fill, detail) => (
      <>
        <path d="M2.5 5h19v14h-19z" fill={fill} />
        <path d="M2.5 5l9.5 8 9.5-8" stroke={detail} />
      </>
    )}
  </BarIcon>
);

// The way back to sqrtx (the businesses' bar): a chevron. It is never the current page, so it has no filled look.
export const backIcon = (
  <BarIcon on={false}>{() => <path d="M15 4.5L7 12l8 7.5" />}</BarIcon>
);

export const aboutIcon = (on: boolean) => (
  <BarIcon on={on}>
    {(fill, detail) => (
      <>
        <path d="M3.5 3.5h17v17h-17z" fill={fill} />
        <path d="M12 11v5" stroke={detail} />
        <path d="M12 7.6h.01" stroke={detail} strokeLinecap="round" />
      </>
    )}
  </BarIcon>
);
