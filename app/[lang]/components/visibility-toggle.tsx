"use client";

import { useState } from "react";
import { useCommonText } from "@/app/[lang]/components/lang-context";

// The words of one toggle: `live` and `hidden` say what the public sees now, `hide` and `show` are the buttons that change it.
export type VisibilityText = { title: string; live: string; hidden: string; hide: string; show: string; working: string };

// "Visible to the public": says whether an item (a product, a service, the whole business page) is shown to visitors and has one button
// to flip it. The change is saved at once (`onChange` does the request), not with the form's "Save changes", because it is its own
// decision: nothing else on the page needs saving for it. `onChange` throws when it fails; the previous state then stays.
export default function VisibilityToggle({
  text,
  active,
  disabled,
  bare,
  onChange,
}: {
  text: VisibilityText;
  active: boolean;
  disabled?: boolean;
  bare?: boolean; // without its own title and side padding, to sit inside a section that has them
  onChange: (next: boolean) => Promise<void>;
}) {
  const common = useCommonText();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function flip() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await onChange(!active);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <section className={`flex w-full flex-col gap-2 ${bare ? "" : "max-w-135 px-5 pt-2 pb-6"}`}>
      {!bare && <h2 className="text-[16px] font-semibold">{text.title}</h2>}
      {bare ? (
        // The page around it already shows the live / hidden state: here only what hiding means.
        !active && <p className="text-[14px]">{text.hidden}</p>
      ) : (
        <p className="flex items-center gap-2 text-[14px] font-semibold">
          <span aria-hidden className={`size-2.5 ${active ? "bg-[#22c55e]" : "bg-[#eab308]"}`} />
          <span role="status">{active ? text.live : text.hidden}</span>
        </p>
      )}
      <button
        type="button"
        onClick={flip}
        disabled={busy || disabled}
        className="flex h-11 w-full cursor-pointer items-center justify-center border-2 border-black bg-white text-[14px] font-bold disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? text.working : active ? text.hide : text.show}
      </button>
      {failed && (
        <p role="alert" className="text-[14px] text-red-600">
          {common.genericError}
        </p>
      )}
    </section>
  );
}
