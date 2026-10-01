'use client';

import { useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { LUNA_WELCOME_MESSAGE, LUNA_SUGGESTED_QUESTIONS, type LunaChatMessage } from '@/lib/luna';

// Same-origin: this widget always talks to its own app's /api/luna/chat.
// The Astro marketing site's copy of this widget calls the same endpoint
// cross-origin instead — see src/components/LunaWidget.astro there.
const CHAT_ENDPOINT = '/api/luna/chat';

export default function LunaWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LunaChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const next: LunaChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setError(null);
    setSending(true);
    scrollToBottom();

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch {
      setError('Could not reach Luna. Check your connection and try again.');
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[32rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-text">Luna</p>
              <p className="text-xs text-text-muted">Shahid Security AI Assistant</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="text-text-muted hover:text-text">
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="rounded-lg bg-surface px-3 py-2 text-sm text-text">{LUNA_WELCOME_MESSAGE}</div>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {LUNA_SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-text-muted transition hover:border-neon hover:text-text"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-lg bg-neon px-3 py-2 text-sm text-bg'
                    : 'max-w-[85%] rounded-lg bg-surface px-3 py-2 text-sm text-text'
                }
              >
                {m.content}
              </div>
            ))}
            {sending && <div className="max-w-[85%] rounded-lg bg-surface px-3 py-2 text-sm text-text-muted">Luna is typing…</div>}
            {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Luna anything…"
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-neon focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-md bg-neon px-3 py-2 text-sm font-medium text-bg disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Luna chat' : 'Chat with Luna, our AI assistant'}
        className="luna-toggle group flex size-14 items-center justify-center overflow-hidden rounded-full border-2 border-neon bg-bg shadow-[0_0_24px_-4px_var(--color-neon)] transition-transform hover:scale-105"
      >
        {open ? (
          <span className="text-xl text-neon">✕</span>
        ) : (
          <Image src="/luna-panda.png" alt="" width={56} height={56} className="luna-panda-icon h-full w-full object-cover" priority />
        )}
      </button>
    </div>
  );
}
