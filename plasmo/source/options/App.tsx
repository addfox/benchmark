import { useState } from "react";
import { clamp } from "lodash";

export default function App() {
  const [lang, setLang] = useState("en");
  const [limit, setLimit] = useState(10);
  const [perm, setPerm] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="mb-4 text-xl font-bold text-slate-800">Options</h1>
      <section className="mb-4 rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Language</h2>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </section>
      <section className="mb-4 rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Feature limits</h2>
        <input
          type="range"
          min={1}
          max={100}
          value={limit}
          onChange={(e) => setLimit(clamp(Number(e.target.value), 1, 100))}
          className="w-full"
        />
        <p className="text-xs text-slate-500">Limit: {limit}</p>
      </section>
      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Permissions</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={perm} onChange={(e) => setPerm(e.target.checked)} />
          Allow storage
        </label>
      </section>
    </div>
  );
}
