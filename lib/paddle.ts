import { initializePaddle, type Environments, type Paddle } from "@paddle/paddle-js";
import { getPaymentMethodChange, goToProvider, startCheckout, type PlanId } from "@/lib/billing";

// Paddle.js: the price previews on the pricing page and the checkout overlay. Browser only (import it from client components).
// Everything it needs comes from the environment, and a missing value stops with a clear message: it is never defaulted,
// so the site can never quietly talk to the wrong Paddle account. The server-side API key is NOT here and must never be.

// NEXT_PUBLIC_ values must be written out in full like this so Next.js can put them into the browser bundle.
const PADDLE_ENV = process.env.NEXT_PUBLIC_PADDLE_ENV;
const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const PRICE_MONTHLY = process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY;
const PRICE_YEARLY = process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY;

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name} (see .env.example).`);
  return value;
}

/** The plan to show on the pricing page. Add more tiers here: the page shows the first one. */
export interface Tier {
  name: string;
  priceId: { month: string; year: string };
}

export function getTiers(): Tier[] {
  return [
    {
      name: "sqrtx",
      priceId: {
        month: required(PRICE_MONTHLY, "NEXT_PUBLIC_PADDLE_PRICE_MONTHLY"),
        year: required(PRICE_YEARLY, "NEXT_PUBLIC_PADDLE_PRICE_YEARLY"),
      },
    },
  ];
}

// "sandbox" while testing, "production" when live. Anything else (or nothing) is refused.
function paddleEnvironment(): Environments {
  const value = required(PADDLE_ENV, "NEXT_PUBLIC_PADDLE_ENV");
  if (value !== "sandbox" && value !== "production") throw new Error('NEXT_PUBLIC_PADDLE_ENV must be "sandbox" or "production".');
  return value;
}

/** Sent on `window` when a payment in the overlay has gone through (before the user closes it). The account page listens, so it can say "confirming" at once. */
export const PAYMENT_COMPLETED_EVENT = "sqrtx:payment-completed";

let instance: Promise<Paddle> | null = null;
let closeWhenCompleted = true;

/** Paddle.js, set up once. */
export function getPaddle(): Promise<Paddle> {
  instance ??= (async () => {
    const paddle = await initializePaddle({
      environment: paddleEnvironment(),
      token: required(CLIENT_TOKEN, "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"),
      eventCallback: (event) => {
        if (event.name !== "checkout.completed") return;
        window.dispatchEvent(new Event(PAYMENT_COMPLETED_EVENT));
        // Paddle leaves its "completed successfully" screen up until the user closes it. Closed here after a moment (long enough to read it),
        // so the page underneath, which already says "confirming", takes over. Not when Paddle redirects afterwards (successUrl).
        if (closeWhenCompleted) setTimeout(() => void instance?.then((paddle) => paddle.Checkout.close()), 2500);
      },
    });
    if (!paddle) throw new Error("Paddle.js could not be loaded.");
    return paddle;
  })();
  instance.catch(() => (instance = null)); // a failed start can be tried again
  return instance;
}

/**
 * Starts paying for a plan. Our server makes the payment (so it knows whose account it is for and the customer's email is
 * already on it) and the browser opens it as Paddle's one-page overlay. Answers "redirected" when the server had no payment
 * id and the browser was sent to the provider's own page instead (the page is then being left), "overlay" otherwise.
 */
// `goToAccountAfter`: after a successful payment the browser is sent to /welcome (the account page). The account page does not want that: it
// already knows about the payment from PAYMENT_COMPLETED_EVENT and updates itself, so a reload would only make it flash.
export async function startPlanCheckout(plan: PlanId, { goToAccountAfter = false } = {}): Promise<"overlay" | "redirected"> {
  closeWhenCompleted = !goToAccountAfter;
  const { url, transaction_id } = await startCheckout(plan);
  if (!transaction_id) {
    if (!goToProvider(url)) throw new Error("The payment page address was not accepted.");
    return "redirected";
  }
  const paddle = await getPaddle();
  paddle.Checkout.open({
    transactionId: transaction_id,
    settings: {
      displayMode: "overlay",
      variant: "one-page",
      showAddDiscounts: true, // TEMPORARY for the live zero-cost test: set back to false afterwards
      ...(goToAccountAfter ? { successUrl: `${window.location.origin}/welcome` } : {}),
    },
  });
  return "overlay";
}

/** Opens the overlay for entering a new card on the running subscription. Nothing is charged; the user stays on this page. */
export async function startPaymentMethodChange(): Promise<void> {
  closeWhenCompleted = true;
  const { transaction_id } = await getPaymentMethodChange();
  const paddle = await getPaddle();
  paddle.Checkout.open({ transactionId: transaction_id, settings: { displayMode: "overlay", variant: "one-page", showAddDiscounts: false } });
}
