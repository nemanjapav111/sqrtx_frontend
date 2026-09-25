// name@domain.tld: no spaces, no empty parts, and the ending (tld) is at least 2 characters.
// (Checking that the address really exists is done by the confirmation email.)
export const emailOk = (v: string) => /^[^\s@]+@([^\s@.]+\.)+[^\s@.]{2,}$/.test(v.trim());

// Must match the Supabase password policy (Auth settings): at least 8 characters and one each of
// a-z, A-Z and 0-9. Supabase only counts those plain letters, so other alphabets (Ć, Ж) don't count.
// Only used when CHOOSING a password (register). Log in accepts whatever the account already has.
export const passwordOk = (v: string) => v.length >= 8 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);
