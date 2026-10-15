// A random id for something that only lives in the page (a photo the owner has just picked, before it is uploaded).
//
// crypto.randomUUID() exists only in a SECURE context (https, or localhost): on a phone that opens the dev site by the computer's address on the network
// (http://192.168.1.6:3001) it is not there, and picking a photo failed with "crypto.randomUUID is not a function" (found 2026-10-12). crypto.getRandomValues() works
// in every context, so the id is made from it (a version 4 UUID, the same shape), and Math.random is the last resort for a browser with no crypto at all.
export function randomId(): string {
  const c = typeof crypto === "undefined" ? undefined : crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
