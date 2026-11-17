import { useCallback, useEffect, useRef, useState } from "react";
import { GameSession, type SessionView } from "./game/network";
import { GameAudio } from "./game/audio";
import { cleanName } from "./game/types";
import {
  Footer,
  Header,
  Help,
  Home,
  LeaveDialog,
  Lobby,
  Results,
} from "./components/Interface";
import { Arena } from "./components/Arena";

function saved(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export default function App() {
  const [name, setName] = useState(() => saved("relic-riot-name", "NOVA"));
  const [color, setColor] = useState(() =>
    Math.max(0, Math.min(3, Number(saved("relic-riot-color", "0")) || 0)),
  );
  const [code, setCode] = useState(
    () =>
      new URLSearchParams(location.search)
        .get("room")
        ?.toUpperCase()
        .slice(0, 6) ?? "",
  );
  const [view, setView] = useState<SessionView | null>(null);
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const [help, setHelp] = useState(false),
    [leaveDialog, setLeaveDialog] = useState(false),
    [copied, setCopied] = useState(false);
  const [sound, setSound] = useState(
    () => saved("relic-riot-sound", "off") === "on",
  );
  const session = useRef<GameSession | null>(null),
    audio = useRef(new GameAudio());
  audio.current.enabled = sound;
  useEffect(() => {
    try {
      localStorage.setItem("relic-riot-name", name);
      localStorage.setItem("relic-riot-color", String(color));
      localStorage.setItem("relic-riot-sound", sound ? "on" : "off");
    } catch {
      /* Private storage is optional. */
    }
  }, [name, color, sound]);
  useEffect(
    () => () => {
      session.current?.close();
      audio.current.dispose();
    },
    [],
  );
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (session.current && view && !view.practice) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [view]);
  const fail = useCallback((message: string) => {
    setError(message);
    setBusy(false);
    setView(null);
    session.current?.close();
    session.current = null;
  }, []);
  const begin = (mode: "host" | "join" | "practice") => {
    if (busy) return;
    session.current?.close();
    setError("");
    setBusy(true);
    audio.current.unlock();
    audio.current.play("click");
    const game = new GameSession({
      update: (value) => {
        setView(value);
        setBusy(false);
      },
      error: fail,
      status: setStatus,
    });
    session.current = game;
    const callsign = cleanName(name);
    setName(callsign);
    if (mode === "host") void game.host(callsign, color);
    else if (mode === "join") void game.join(code, callsign, color);
    else game.practiceRun(callsign, color);
  };
  const leave = useCallback(() => {
    session.current?.close();
    session.current = null;
    setView(null);
    setBusy(false);
    setError("");
    setLeaveDialog(false);
    setStatus("");
  }, []);
  const closeHelp = useCallback(() => setHelp(false), []);
  const me = view?.snapshot.players.find((p) => p.id === view.localId);
  const ready = () => {
    if (me) session.current?.ready(!me.ready);
  };
  const copyInvite = async () => {
    if (!view) return;
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("room", view.room);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Join my RELIC RIOT room",
            text: `Room ${view.room}`,
            url: url.toString(),
          });
        } catch {
          setStatus(`Invite a friend with room code ${view.room}`);
        }
      } else setStatus(`Invite a friend with room code ${view.room}`);
    }
  };
  const inArena = !!view && view.snapshot.phase !== "lobby";
  return (
    <div
      className={`app ${inArena ? "in-arena" : ""} ${view?.snapshot.phase === "lobby" ? "in-lobby" : ""}`}
    >
      {!inArena && <div className="home-backdrop" aria-hidden="true" />}
      <Header
        sound={sound}
        toggleSound={() => {
          audio.current.unlock();
          setSound(!sound);
        }}
        onHelp={() => setHelp(true)}
        onHome={() =>
          view
            ? setLeaveDialog(true)
            : window.scrollTo({ top: 0, behavior: "smooth" })
        }
        playing={inArena}
      />
      {!view && (
        <Home
          name={name}
          setName={setName}
          color={color}
          setColor={setColor}
          code={code}
          setCode={setCode}
          busy={busy}
          status={status}
          error={error}
          onHost={() => begin("host")}
          onJoin={() => begin("join")}
          onPractice={() => begin("practice")}
        />
      )}
      {view?.snapshot.phase === "lobby" && (
        <Lobby
          view={view}
          onReady={ready}
          onStart={() => session.current?.start()}
          onLeave={() => setLeaveDialog(true)}
          copied={copied}
          copyInvite={() => void copyInvite()}
        />
      )}
      {inArena && view && session.current && (
        <Arena
          view={view}
          session={session.current}
          audio={audio.current}
          onError={fail}
          onLeave={() => setLeaveDialog(true)}
        />
      )}
      {view?.snapshot.phase === "finished" && (
        <Results
          view={view}
          onReady={ready}
          onStart={() => session.current?.start()}
          onLeave={leave}
        />
      )}
      {!view && <Footer />}
      {view?.snapshot.phase === "lobby" && (
        <div className="lobby-connection-status" role="status">
          {status}
        </div>
      )}
      {help && <Help onClose={closeHelp} />}
      {leaveDialog && (
        <LeaveDialog
          isHost={view?.isHost ?? false}
          onLeave={leave}
          onClose={() => setLeaveDialog(false)}
        />
      )}
      <div className="sr-only" aria-live="polite">
        {busy ? status : ""}
      </div>
    </div>
  );
}
