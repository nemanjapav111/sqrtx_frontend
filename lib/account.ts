import { RATE_LIMIT_CODES } from "@/lib/auth-messages";
import { supabase } from "@/lib/supabase";

// Account settings: changing the login email and the password. Both are done by Supabase (Auth) directly, like log in.

/**
 * Checks the password of the account by logging in with it. Changing the email or the password asks for it first, so
 * someone who finds a phone left logged in can't take over the account. A correct password just renews the session.
 * "limited": too many attempts, "error": no connection or an unexpected answer.
 */
export async function checkPassword(email: string, password: string): Promise<"ok" | "wrong" | "limited" | "error"> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return "ok";
    if (error.code === "invalid_credentials") return "wrong";
    return RATE_LIMIT_CODES.includes(error.code ?? "") ? "limited" : "error";
  } catch {
    return "error";
  }
}
