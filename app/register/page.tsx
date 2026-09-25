import Link from "next/link";
import RegisterForm from "./register-form";

export const metadata = { title: "Register – sqrtx" };

export default function Register() {
  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      <div className="flex w-full max-w-200 flex-col items-center">
        {/* Big logo, links back to the landing page */}
        <Link href="/" className="flex h-27.75 items-center justify-center gap-4.5">
          <div className="size-22.5 bg-black" />
          <span className="text-[75px] leading-[normal] font-bold">sqrtx</span>
        </Link>

        <h1 className="pt-9.5 pb-2 text-[20px] font-semibold">Security</h1>
        <p className="pb-10 font-semibold">Private data used for login.</p>

        <RegisterForm />
      </div>
    </main>
  );
}
