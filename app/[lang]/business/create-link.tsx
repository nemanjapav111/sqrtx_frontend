"use client";

import Link from "next/link";
import { trackMetaEvent } from "@/lib/meta-pixel";

// A "Create my page" link of the landing page: a plain link to the registration that also tells the Meta Pixel a Lead happened (lib/meta-pixel.ts).
export default function CreateLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Link href="/register" className={className} onClick={() => trackMetaEvent("Lead")}>
      {children}
    </Link>
  );
}
