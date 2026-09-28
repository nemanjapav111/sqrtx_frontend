import ResetForm from "./reset-form";

export const metadata = { title: "Reset password – sqrtx" };

export default function ResetPassword() {
  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      <div className="flex w-full max-w-200 flex-col items-center">
        <ResetForm />
      </div>
    </main>
  );
}
