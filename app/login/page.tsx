import LoginForm from "./login-form";

export const metadata = { title: "Log in – sqrtx" };

export default function Login() {
  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      <div className="flex w-full max-w-200 flex-col items-center">
        <LoginForm />
      </div>
    </main>
  );
}
