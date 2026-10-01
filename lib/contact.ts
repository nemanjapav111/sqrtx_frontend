import { ApiError } from "@/lib/api";

// A visitor's message to a business (POST /contact, public: no login, see API.md in the backend). The API emails it to the business's
// contact email with the visitor's address as Reply-To.

export const CONTACT_NAME_MAX = 100;
export const CONTACT_EMAIL_MAX = 255;
export const CONTACT_MESSAGE_MAX = 5000;

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
  website: string; // the hidden trap box: a person leaves it empty (see the API notes), whatever it holds is sent as it is
}

/** Sends the message. Throws an ApiError for what the API refuses (429 too many, 503 no email service yet, 404 no such business). */
export async function sendContactMessage(userId: string, v: ContactMessage): Promise<void> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, name: v.name.trim(), email: v.email.trim(), message: v.message.trim(), website: v.website }),
  });
  if (response.ok) return;
  let messages: string[] = [];
  try {
    const body = await response.json();
    messages = Array.isArray(body.message) ? body.message : body.message ? [String(body.message)] : [];
  } catch {
    // the body was not JSON: the status is all there is
  }
  throw new ApiError(response.status, messages);
}
