// Runs once each time the server starts (before it answers anything).
//
// The server keeps what it asked the API for (the marketplace list, a business's pages...) on disk, so it survives a restart, but the note "this label was cleared
// at <time>" (updateTag / revalidateTag, lib/refresh-public-page.ts, app/api/revalidate-business) lives only in the running process's memory. After a restart an
// answer that was cleared but not yet asked for again came back from disk as if it had never been cleared, and stayed for up to 12 hours (a business hidden
// before a deploy kept showing its products to visitors). So every start begins with no saved answers: the first visit after it asks the API again.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { rm } = await import("node:fs/promises");
  const { join } = await import("node:path");
  try {
    await rm(join(process.cwd(), ".next", "cache", "fetch-cache"), { recursive: true, force: true });
  } catch (error) {
    console.error("Could not empty the saved API answers at start:", error instanceof Error ? error.message : error);
  }
}
