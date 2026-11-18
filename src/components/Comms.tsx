import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { QUICK_MESSAGES } from "../game/types";
import type { MessageKey } from "../game/types";
import type { SessionView } from "../game/network";

export function Comms({
  view,
  onSend,
}: {
  view: SessionView;
  onSend: (key: MessageKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const last = [...view.snapshot.messages]
    .reverse()
    .find((m) => m.playerId === view.localId);
  const cooling = !!last && view.snapshot.elapsed - last.at < 2;
  const messages = view.snapshot.messages
    .filter((m) => view.snapshot.elapsed - m.at < 6)
    .slice(-2);
  const arena =
    view.snapshot.phase === "playing" || view.snapshot.phase === "countdown";
  return (
    <aside
      className={`comms ${arena ? "comms-arena" : "comms-room"}`}
      aria-label="Crew quick messages"
    >
      <div className="comms-feed" role="status" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id}>
            <strong>{m.playerId === view.localId ? "YOU" : m.name}</strong>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      <button
        className="outline comms-toggle"
        aria-label="Open quick messages"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={16} /> : <MessageCircle size={16} />}
        <span>QUICK MESSAGES</span>
      </button>
      {open && (
        <div className="comms-palette" aria-label="Preset messages">
          {Object.entries(QUICK_MESSAGES).map(([key, text]) => (
            <button
              key={key}
              disabled={cooling || view.practice}
              onClick={() => {
                onSend(key as MessageKey);
                setOpen(false);
              }}
            >
              {text}
            </button>
          ))}
          {view.practice && <small>Invite a real crew to send messages.</small>}
          {cooling && <small>One message every 2 seconds.</small>}
        </div>
      )}
    </aside>
  );
}
