import { useState } from "react";
import browser from "webextension-polyfill";
import { get } from "lodash";

const FAKE_I18N: Record<string, string> = {
  popup_screenshot: "Capture page",
};

function t(key: string): string {
  return get(browser.i18n, "getMessage", (k: string) => FAKE_I18N[k] ?? k)(key) || key;
}

export default function App() {
  const [status, setStatus] = useState<string>("");

  async function capture() {
    setStatus("Capturing...");
    try {
      const res = await browser.runtime.sendMessage({ type: "CAPTURE_TAB" });
      setStatus(res?.ok ? `Saved (${res.count})` : "Failed");
    } catch {
      setStatus("Error");
    }
  }

  function openSpace() {
    const url = browser.runtime.getURL("tabs/space.html");
    browser.tabs.create({ url }).catch(() => {});
  }

  return (
    <div className="w-[280px] rounded-lg bg-slate-50 p-3 shadow">
      <h2 className="mb-2 text-sm font-semibold text-slate-800">Popup</h2>
      <p className="mb-2 text-xs text-slate-600">{t("popup_screenshot")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={capture}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Screenshot
        </button>
        <button
          type="button"
          onClick={openSpace}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Gallery
        </button>
      </div>
      {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
    </div>
  );
}
