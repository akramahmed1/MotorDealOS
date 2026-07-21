'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CONSENT_TEXT =
  'By submitting, you agree that MOTOR DEALS USA may contact you by phone, text, or email about your inquiry.';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | undefined>();
  const [showContactForm, setShowContactForm] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('chat_session_token');
    if (stored) setSessionToken(stored);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string, contact?: { name: string; phone: string; consent: boolean }) {
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken,
          message: text,
          contact: contact ? { ...contact, email: '' } : undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.error }]);
        return;
      }

      if (data.session_token) {
        setSessionToken(data.session_token);
        localStorage.setItem('chat_session_token', data.session_token);
      }
      if (data.lead_captured) setLeadCaptured(true);

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, something went wrong. Please call us at (773) 350-0002." },
      ]);
    } finally {
      setSending(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    sendMessage(text);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setShowContactForm(false);
    sendMessage(`My name is ${name}, phone ${phone}.`, { name, phone, consent });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="flex h-[500px] w-80 flex-col rounded-lg border bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between rounded-t-lg bg-blue-600 px-4 py-3 text-white">
            <span className="font-medium">Ask MOTOR DEALS USA</span>
            <button onClick={() => setOpen(false)} className="text-xl leading-none">&times;</button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500">
                Ask about inventory, hours, financing, or trade-ins.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                {m.content}
              </div>
            ))}
            {!leadCaptured && messages.length > 0 && !showContactForm && (
              <button
                onClick={() => setShowContactForm(true)}
                className="text-xs text-blue-600 underline"
              >
                Leave your name & phone for a callback
              </button>
            )}
            {showContactForm && (
              <form onSubmit={handleContactSubmit} className="space-y-2 rounded-lg border p-2">
                <input
                  required
                  placeholder="Name"
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  required
                  placeholder="Phone"
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <label className="flex items-start gap-1.5 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>{CONSENT_TEXT}</span>
                </label>
                <button type="submit" className="w-full rounded bg-blue-600 py-1.5 text-sm text-white">
                  Submit
                </button>
              </form>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t p-2">
            <input
              className="flex-1 rounded border px-3 py-2 text-sm"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-blue-600 px-5 py-3 text-white shadow-lg hover:bg-blue-700"
        >
          💬 Chat
        </button>
      )}
    </div>
  );
}
