import { useState, useEffect } from "react";
import browser from "webextension-polyfill";
import { take } from "lodash";

interface ScreenshotItem {
  dataUrl: string;
  at: number;
}

export default function App() {
  const [list, setList] = useState<ScreenshotItem[]>([]);

  useEffect(() => {
    browser.runtime.sendMessage({ type: "GET_SCREENSHOTS" }).then((r: { list?: ScreenshotItem[] }) => {
      setList(r?.list ?? []);
    });
  }, []);

  const display = take(list, 20);

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <h1 className="mb-4 text-lg font-bold text-slate-800">Screenshots</h1>
      <p className="mb-4 text-sm text-slate-600">Temporary storage (session).</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {display.map((s, i) => (
          <div key={i} className="overflow-hidden rounded border border-slate-300 bg-white shadow">
            <img src={s.dataUrl} alt="" className="h-24 w-full object-cover" />
            <p className="truncate p-1 text-xs text-slate-500">{new Date(s.at).toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
      {display.length === 0 && <p className="text-slate-500">No screenshots. Use popup to capture.</p>}
    </div>
  );
}
