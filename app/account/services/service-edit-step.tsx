"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { recall, remember } from "@/lib/memory-cache";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { getMyService, getServiceCategories, type MyService } from "@/lib/services";
import { useRequireSession } from "@/lib/use-session";
import ServiceEditForm from "./service-edit-form";

// `service` is null for a new service, and for an id that isn't the owner's (then `missing` is true).
type Ready = { status: "ready"; service: MyService | null; missing: boolean; categories: string[] };
type Load = { status: "loading" } | { status: "error" } | Ready;

// What this page loaded last time (see lib/memory-cache.ts): a service opened again from the list is shown filled in at
// once, and only checked for changes behind the scenes, instead of an empty, dimmed form under "Loading". Cleared by anything
// that saves or deletes a service (service-edit-form.tsx).
const SERVICE_CACHE = "owner:service:"; // forgetOwnerServices() in lib/memory-cache.ts clears everything under "owner:service"
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// The owner's service, or null when the API says it doesn't exist or isn't theirs (404).
async function findService(id: string): Promise<MyService | null> {
  try {
    return await getMyService(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Decides what the edit page shows: the form filled with the service (`id`), or empty for a new one (`id` null), or a
// send-away for people who don't belong here (not signed in, registration not finished). The form itself is always on
// screen; see ServiceEditForm's `pending` for what covers it until this is known.
export default function ServiceEditStep({ id }: { id: string | null }) {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const cacheKey = `${SERVICE_CACHE}${id ?? "new"}`;
  const [load, setLoad] = useState<Load>(() => recall<Ready>(cacheKey) ?? { status: "loading" });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        // Everything is asked for at the same time as the registration check, not after it (each answer takes a while: one
        // after the other doubled the wait). A failure is only looked at when the answer is needed, after the check.
        const serviceAsked = id ? findService(id) : Promise.resolve(null);
        const categoriesAsked = getServiceCategories();
        serviceAsked.catch(() => undefined);
        categoriesAsked.catch(() => undefined);
        const state = await getOnboardingState();
        if (state.step !== "done") return router.replace(pathForStep(state.step)); // registration is not finished

        // The form appears as soon as the service is here. The category list is the slowest answer and only the category box
        // needs it, so it fills in afterwards.
        const found = await serviceAsked;
        // Remembered even if the visitor has already left the page (an answer that arrived is true whoever is looking).
        const known = recall<Ready>(cacheKey)?.categories ?? [];
        remember(cacheKey, { status: "ready", service: found, missing: !!id && !found, categories: known } satisfies Ready);
        if (cancelled) return;
        setLoad((now) => {
          const categories = now.status === "ready" ? now.categories : [];
          // What was shown from the last visit is kept if the service is the same: the form is filled from that object, and
          // a new one would refill it, throwing away what was typed in the meantime.
          if (now.status === "ready" && sameJson(now.service, found)) return now;
          return { status: "ready", service: found, missing: !!id && !found, categories };
        });

        const categories = await categoriesAsked;
        const saved = recall<Ready>(cacheKey);
        if (saved) remember(cacheKey, { ...saved, categories });
        if (cancelled) return;
        setLoad((now) => {
          if (now.status !== "ready") return now;
          return sameJson(now.categories, categories) ? now : { ...now, categories };
        });
      } catch {
        // With the form already filled (from the last visit) a failed check is not worth an error box: it stays.
        if (!cancelled) setLoad((now) => (now.status === "ready" ? now : { status: "error" }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cacheKey is made from id
  }, [session, attempt, router, id]);

  // After a save that failed half way: load the services again, so the form shows what really is saved.
  const reloadService = useCallback(async () => {
    if (!id) return;
    try {
      const service = await findService(id);
      setLoad((now) => (now.status === "ready" ? { ...now, service, missing: !service } : now));
    } catch {
      // the form keeps what it has; the next save will show the problem
    }
  }, [id]);

  if (load.status === "ready" && load.missing) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 pt-20 text-center">
        <p className="text-[16px] font-semibold">We couldn&apos;t find this service.</p>
        <Link href="/account/services" className="text-[14px] font-semibold underline">
          Back to your services
        </Link>
      </div>
    );
  }

  return (
    <ServiceEditForm
      // A fresh instance right as real data replaces the placeholder, so its fields (which only ever read `service`
      // and `categories` once, when they're created) start from the real values instead of carrying over the empty
      // placeholder ones. Harmless: the placeholder was `inert`, so nothing could have been typed into it yet.
      key={load.status === "ready" ? "ready" : "pending"}
      editing={id !== null}
      service={load.status === "ready" ? load.service : null}
      categories={load.status === "ready" ? load.categories : []}
      pending={load.status === "loading" ? "loading" : load.status === "error" ? "error" : undefined}
      onRetry={() => {
        setLoad({ status: "loading" });
        setAttempt((n) => n + 1);
      }}
      onOutOfSync={reloadService}
    />
  );
}
