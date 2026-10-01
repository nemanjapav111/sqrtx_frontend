import { ApiError } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// Uploads of photos (a product, a service, the logo) with a progress that is TRUE all the way:
//   1. sending: the bytes the browser has sent so far (fetch can't tell, XMLHttpRequest can),
//   2. preparing: the server makes every photo ready (its sizes and formats), which is the longest part, and says after each photo
//      how many are done (the API streams lines when asked with `Accept: application/x-ndjson`, see API.md "Progress while uploading"),
//   3. saving: the photos are stored and the product is saved.
// Everything else works like apiFetch (Bearer token, one retry after a 401, ApiError for what the API refuses).

export type UploadStatus =
  | { stage: "sending"; loaded: number; total: number }
  | { stage: "processing"; done: number; total: number }
  | { stage: "storing" };

// How the bar is split. Each part moves with something real; the split between them is a guess about how long each takes (sending is
// quick on a good connection, preparing is the long part), which is why the numbers only ever go forward.
const SENDING_END = 35;
const PROCESSING_END = 90;
const STORING_AT = 93;

/** How far along the upload is, 0 to 100 (a finished upload is not shown, the form moves on). */
export function uploadPercent(status: UploadStatus): number {
  if (status.stage === "sending") return Math.round(SENDING_END * (status.total > 0 ? Math.min(1, status.loaded / status.total) : 0));
  if (status.stage === "processing") {
    return SENDING_END + Math.round((PROCESSING_END - SENDING_END) * (status.total > 0 ? Math.min(1, status.done / status.total) : 0));
  }
  return STORING_AT;
}

/** What to tell the user: `what` is "photo" or "logo" (several photos say "photos"). */
export function uploadLabel(status: UploadStatus, what: "photo" | "logo", count = 1): string {
  const noun = what === "logo" ? "logo" : count === 1 ? "photo" : "photos";
  if (status.stage === "sending") return `Sending your ${noun}`;
  if (status.stage === "processing") {
    return status.total > 1 ? `Preparing your photos: ${status.done} of ${status.total} ready` : `Preparing your ${noun}`;
  }
  return "Saving";
}

const toMessages = (message: unknown): string[] => (Array.isArray(message) ? message.map(String) : message ? [String(message)] : []);

/**
 * Sends a form with files to `url` and resolves with the API's answer. `onProgress` hears about every step. Rejects with an ApiError
 * for what the API refuses (before or while it works) and with a plain Error when the connection fails or breaks off.
 * (apiUpload below is the one to use; this is the part that doesn't know the API's address or who is signed in.)
 */
export function uploadTo<T>(
  url: string,
  token: string | undefined,
  init: { method: "POST" | "PUT"; body: FormData; onProgress?: (status: UploadStatus) => void },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method, url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/x-ndjson"); // asks for the lines; the body is the form, the browser sets its Content-Type

    let result: { data: T } | undefined;
    let failure: ApiError | undefined;
    let read = 0; // how much of the response has been turned into lines already

    const handle = (line: string) => {
      let message: { type?: string; stage?: string; done?: number; total?: number; data?: T; statusCode?: number; message?: unknown };
      try {
        message = JSON.parse(line);
      } catch {
        return; // a line that is not JSON says nothing
      }
      if (message.type === "progress") {
        if (message.stage === "processing") init.onProgress?.({ stage: "processing", done: Number(message.done) || 0, total: Number(message.total) || 0 });
        else if (message.stage === "storing") init.onProgress?.({ stage: "storing" });
      } else if (message.type === "done") result = { data: message.data as T };
      else if (message.type === "error") failure = new ApiError(Number(message.statusCode) || 500, toMessages(message.message));
    };
    // Only whole lines are read: a line that is still arriving waits for the rest of it.
    const readLines = () => {
      const text = xhr.responseText;
      const end = text.lastIndexOf("\n") + 1;
      if (end <= read) return;
      for (const line of text.slice(read, end).split("\n")) if (line) handle(line);
      read = end;
    };

    if (init.onProgress) {
      const onProgress = init.onProgress;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress({ stage: "sending", loaded: e.loaded, total: e.total });
      };
    }
    xhr.onprogress = () => {
      if (xhr.status === 200 && (xhr.getResponseHeader("Content-Type") ?? "").includes("ndjson")) readLines();
    };
    xhr.onload = () => {
      const streamed = (xhr.getResponseHeader("Content-Type") ?? "").includes("ndjson");
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!streamed) {
          // An API that does not stream (an older one): the usual single JSON answer.
          try {
            return resolve(JSON.parse(xhr.responseText) as T);
          } catch {
            return reject(new Error("The answer could not be read"));
          }
        }
        readLines();
        if (failure) return reject(failure);
        if (result) return resolve(result.data);
        return reject(new Error("The upload was interrupted")); // the lines stopped before the last one
      }
      // An ordinary HTTP error: the request itself was refused before any work started.
      let messages: string[] = [];
      try {
        messages = toMessages(JSON.parse(xhr.responseText).message);
      } catch {
        // the body was not JSON: the status is all there is
      }
      reject(new ApiError(xhr.status, messages));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new Error("The upload was cancelled"));
    xhr.ontimeout = () => reject(new Error("The upload took too long"));
    xhr.send(init.body);
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Like apiFetch for a form with files, with progress. `path` starts with "/", for example "/product". */
export async function apiUpload<T>(
  path: string,
  init: { method: "POST" | "PUT"; body: FormData; onProgress?: (status: UploadStatus) => void },
): Promise<T> {
  const attempt = async () => {
    const { data } = await supabase.auth.getSession();
    return uploadTo<T>(`${API_URL}${path}`, data.session?.access_token, init);
  };
  try {
    return await attempt();
  } catch (err) {
    // The sign-in token had just run out: refresh it and send once more (the form can be sent again as it is).
    if (err instanceof ApiError && err.status === 401) {
      const { error } = await supabase.auth.refreshSession();
      if (!error) return attempt();
    }
    throw err;
  }
}
