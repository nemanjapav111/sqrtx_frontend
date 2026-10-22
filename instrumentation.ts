// Runs once each time the server starts (before it answers anything).
//
// The server keeps what it asked the API for (the marketplace list, a business's pages...) on disk, so it survives a restart, but the note "this label was cleared
// at <time>" (updateTag / revalidateTag, lib/refresh-public-page.ts, app/api/revalidate-business) lives only in the running process's memory. After a restart an
// answer that was cleared but not yet asked for again came back from disk as if it had never been cleared, and stayed for up to 12 hours (a business hidden
// before a deploy kept showing its products to visitors). So every start begins with no saved answers: the first visit after it asks the API again.
// Not in development, and not while building. The Node.js code is in its own file, imported only on the Node.js runtime, so the Edge bundle does not try to load it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { emptySavedApiAnswers } = await import("./instrumentation-node");
    await emptySavedApiAnswers();
  }
}
