import { rm } from "node:fs/promises";
import { join } from "node:path";

// The Node.js part of instrumentation.ts (kept in its own file so the Edge build never sees these imports).
export async function emptySavedApiAnswers() {
  try {
    await rm(join(process.cwd(), ".next", "cache", "fetch-cache"), { recursive: true, force: true });
  } catch (error) {
    console.error("Could not empty the saved API answers at start:", error instanceof Error ? error.message : error);
  }
}
