import { supabase } from "@/lib/supabase";

// NEXT_PUBLIC_ values must be written out in full like this so Next.js can put them into the browser bundle.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("Missing NEXT_PUBLIC_API_URL (see .env.local).");
}

// What went wrong when the API answers with an error. The API always sends { statusCode, message } where
// `message` is one text, or a list of texts for validation errors (one per invalid field).
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly messages: string[],
  ) {
    super(messages.join(". ") || `Request failed (${status})`);
  }
}

async function toApiError(response: Response) {
  let messages: string[] = [];
  try {
    const body = await response.json();
    messages = Array.isArray(body.message) ? body.message : body.message ? [String(body.message)] : [];
  } catch {
    // the body wasn't JSON: the status code is all we have
  }
  return new ApiError(response.status, messages);
}

// Calls the NestJS API as the signed-in user. `path` starts with "/", for example "/onboarding/me".
// - The Supabase access token is read right before the call (it lasts 1 hour and is refreshed automatically).
// - On a 401 the token is refreshed once and the call is repeated once.
// - For file uploads pass a FormData body and do NOT set Content-Type: the browser adds it.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = async () => {
    const { data } = await supabase.auth.getSession();
    const headers = new Headers(init.headers);
    if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
    return fetch(`${API_URL}${path}`, { ...init, headers });
  };

  let response = await send();
  if (response.status === 401) {
    const { error } = await supabase.auth.refreshSession();
    if (!error) response = await send();
  }
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

// JSON body helper: apiFetch("/onboarding/next", jsonBody("POST", { step: "products" }))
export const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
