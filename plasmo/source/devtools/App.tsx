import { useState, useEffect } from "react";
import { uniqBy } from "lodash";

const COLORS_KEY = "benchmark_page_colors";

interface ColorItem {
  color: string;
  tag: string;
}

export default function App() {
  const [colors, setColors] = useState<ColorItem[]>([]);

  useEffect(() => {
    const read = () => {
      chrome.storage.local.get([COLORS_KEY], (r) => {
        const list = (r[COLORS_KEY] ?? []) as ColorItem[];
        setColors(uniqBy(list, (c) => `${c.tag}-${c.color}`).slice(0, 200));
      });
    };
    read();
    const id = setInterval(read, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-3 font-mono text-xs text-slate-200">
      <h2 className="mb-2 font-semibold">Page colors</h2>
      <ul className="space-y-1">
        {colors.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded border border-slate-600"
              style={{ backgroundColor: c.color }}
            />
            <span>{c.tag}</span>
            <span className="text-slate-500">{c.color}</span>
          </li>
        ))}
      </ul>
      {colors.length === 0 && <p className="text-slate-500">Open a page and wait for content script.</p>}
    </div>
  );
}
