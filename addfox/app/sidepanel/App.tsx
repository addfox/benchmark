import { useState, useRef, useEffect } from "react";
import { debounce } from "lodash";

const FAKE_REPLY = "This is a fake AI reply. (Benchmark extension)";

export default function App() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const addReply = debounce(() => {
    setMessages((prev) => [...prev, { role: "bot", text: FAKE_REPLY }]);
  }, 300);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  function send() {
    const t = input.trim();
    if (!t) return;
    setMessages((prev) => [...prev, { role: "user", text: t }]);
    setInput("");
    addReply();
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 p-2">
      <h2 className="mb-2 text-sm font-semibold text-slate-800">AI Sidebar</h2>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded px-2 py-1 ${
              m.role === "user" ? "ml-4 bg-blue-100 text-blue-900" : "mr-4 bg-slate-200 text-slate-800"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything..."
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={send}
          className="rounded bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-800"
        >
          Send
        </button>
      </div>
    </div>
  );
}
