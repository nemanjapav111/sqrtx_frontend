import PathTracker from "@/app/[slug]/path-tracker";
import { getHomeView } from "@/lib/home-view";
import { HomeProvider } from "../home/home-context";
import HomeHeader from "../home/home-header";
import { HomeFooter } from "../home/home-nav";

// The shell of the sqrtx marketplace: the home page (page.tsx) and a product's page in it (product/[id]/page.tsx). The black top bar with the
// search, the page, and, on a phone, the bottom bar with the pages and the country. The shell stays when the visitor moves between the two,
// so what was typed in the search box (and the country) is still there, and the box keeps the cursor when typing takes the visitor from a
// product's page back to the list. (The folder name in brackets only groups the pages: it is not part of the address.)
export default async function SqrtxLayout({ children }: { children: React.ReactNode }) {
  const { country, initial } = await getHomeView();
  const countries = initial.countries ?? [];

  return (
    <HomeProvider initialCountry={country}>
      <PathTracker />
      <div className="flex min-h-dvh flex-col bg-white leading-[normal] text-black">
        <HomeHeader countries={countries} />
        {/* pb: on a phone, room for the fixed bottom bar (44px + its 1px top line, plus the phone's own bottom edge where it has one). */}
        <div className="keep-width flex flex-1 flex-col pb-[calc(45px+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
        <HomeFooter countries={countries} />
      </div>
    </HomeProvider>
  );
}
