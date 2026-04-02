import { throttle } from "lodash";

const SCREENSHOT_KEY = "benchmark_screenshots";

chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; payload?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (r: unknown) => void
  ) => {
    if (msg.type === "CAPTURE_TAB") {
      chrome.storage.local.get([SCREENSHOT_KEY], (r) => {
        const list: { dataUrl: string; at: number }[] = r[SCREENSHOT_KEY] ?? [];
        chrome.tabs.captureVisibleTab(null as unknown as number, { format: "png" }).then(
          (dataUrl) => {
            list.push({ dataUrl, at: Date.now() });
            if (list.length > 20) list.shift();
            chrome.storage.local.set({ [SCREENSHOT_KEY]: list });
            sendResponse({ ok: true, count: list.length });
          },
          () => sendResponse({ ok: false })
        );
      });
      return true;
    }
    if (msg.type === "GET_SCREENSHOTS") {
      chrome.storage.local.get([SCREENSHOT_KEY], (r) => {
        sendResponse({ list: r[SCREENSHOT_KEY] ?? [] });
      });
      return true;
    }
    if (msg.type === "PAGE_COLORS") {
      sendResponse({ received: true });
      return false;
    }
    return false;
  }
);

const throttledLog = throttle((s: string) => console.log("[bg]", s), 1000);
throttledLog("background loaded");
