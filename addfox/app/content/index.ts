import { throttle } from "lodash";

const COLORS_KEY = "benchmark_page_colors";

function collectColors(): { color: string; tag: string }[] {
  const seen = new Set<string>();
  const out: { color: string; tag: string }[] = [];
  const walk = (el: Element) => {
    if (out.length >= 500) return;
    const style = window.getComputedStyle(el);
    const color = style.color || style.backgroundColor;
    if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
      const key = `${el.tagName}-${color}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ color, tag: el.tagName.toLowerCase() });
      }
    }
    for (const c of el.children) walk(c);
  };
  walk(document.body);
  return out;
}

const report = throttle(() => {
  const colors = collectColors();
  chrome.storage.local.set({ [COLORS_KEY]: colors });
  chrome.runtime.sendMessage({ type: "PAGE_COLORS", payload: colors }).catch(() => {});
}, 2000);

if (document.readyState === "complete") report();
else window.addEventListener("load", report);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") report();
});
