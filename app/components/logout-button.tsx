"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// A plain text button for the top-right corner of the registration pages (same look as "Skip for now"). Signs out on
// this device only ("local": nothing to wait for and other devices stay signed in), then goes to the log in page.
// Registration progress is saved on the server, so logging back in continues where the user left off.
export default function LogoutButton() {
  const router = useRouter();

  async function logOut() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
  }

  return (
    <button type="button" onClick={logOut} className="flex h-11 cursor-pointer items-center px-3 text-[14px] font-medium">
      Log out
    </button>
  );
}
