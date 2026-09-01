'use client';

import { useState, type FormEvent } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const PLACEHOLDER_REPLY =
  "This preview doesn't have a live AI connection yet — the assistant needs auth + a database to know your real schedule before it can act on it (see ROADMAP.md §13–§16). Once that's wired up, this panel will handle things like \"move my ECON study session to Thursday\" for real.";

/**
 * Persistent AI assistant, reachable from every /app screen — not a nav tab
 * (ROADMAP.md §13). Idle state is a small pulsing launcher pinned to the
 * bottom-right corner; clicking it expands into a floating chat card
 * anchored to the same corner, Intercom/Messenger-widget style, rather than
 * a full-height drawer. Tool-calling is Phase "Days 11-12" work that needs a
 * real backend first, so replies are an honest placeholder, not a fake live
 * assistant.
 */
export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: 'user', text }, { role: 'assistant', text: PLACEHOLDER_REPLY }]);
    setDraft('');
  };

  return (
    <>
      <button
        type="button"
        className={`assistant-launcher${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
      >
        {open ? '✕' : '✨'}
      </button>

      <aside className={`assistant-panel${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="assistant-panel-header">
          <h2>AI Assistant</h2>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close AI assistant">
            ✕
          </button>
        </div>

        <div className="assistant-messages">
          {messages.length === 0 && (
            <p className="assistant-empty">
              Ask about your schedule — e.g. &ldquo;What do I need to finish this week?&rdquo; or &ldquo;Move my ECON
              study session to Thursday.&rdquo;
            </p>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`assistant-message ${message.role}`}>
              {message.text}
            </div>
          ))}
        </div>

        <form className="assistant-input-row" onSubmit={handleSubmit}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask the assistant..."
            aria-label="Message the AI assistant"
          />
          <button type="submit" className="button-primary">
            Send
          </button>
        </form>
      </aside>
    </>
  );
}
