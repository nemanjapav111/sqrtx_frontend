import { redirect } from "next/navigation";

// Where Paddle's checkout brings the user after paying. The account page already knows how to wait for the payment to be
// confirmed (?checkout=success), so this just sends the user there.
export default function Welcome() {
  redirect("/account?checkout=success");
}
