"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: input }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      setMessages([...next, { role: "assistant", content: acc }]);
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Hub71 Hackathon</h1>
      <div className="flex flex-1 flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap rounded-lg px-3 py-2 ${
              m.role === "user" ? "self-end bg-blue-600 text-white" : "self-start bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {m.content || "…"}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="sticky bottom-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something…"
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button disabled={busy} className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black">
          Send
        </button>
      </form>
    </main>
  );
}
