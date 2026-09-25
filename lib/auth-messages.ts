// Messages shown for problems we can't fix for the user. Shared by the register and login forms.
export const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";
export const RATE_LIMIT_ERROR = "Too many attempts. Please try again later.";

// Supabase error codes that mean "too many requests".
export const RATE_LIMIT_CODES = ["over_email_send_rate_limit", "over_request_rate_limit"];
