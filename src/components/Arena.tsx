import { useEffect, useRef, useState } from "react";
import { ArenaScene } from "../game/scene";
import { GameSession, type SessionView } from "../game/network";
import { GameAudio } from "../game/audio";
import { SHRINES } from "../game/types";
import { Diamond, Maximize, Radio, Scoreboard, Zap } from "./Interface";

const shrineNames = ["NORTH", "EAST", "SOUTH", "WEST"];
export function Arena({
  view,
  session,
  audio,
  onError,
  onLeave,
}: {
  view: SessionView;
  session: GameSession;
  audio: GameAudio;
  onError: (message: string) => void;
  onLeave: () => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    scene = useRef<ArenaScene | null>(null);
  const keys = useRef(new Set<string>()),
    stick = useRef({ x: 0, z: 0 }),
    pulse = useRef(false),
    gamepadPressed = useRef(false);
  const [stickVisual, setStickVisual] = useState({ x: 0, y: 0 });
  const [eventText, setEventText] = useState("");
  const lastEvent = useRef(0);
  const [fullscreen, setFullscreen] = useState(false);
  const stateRef = useRef(view);
  stateRef.current = view;
  const me = view.snapshot.players.find((p) => p.id === view.localId)!;
  const carrier = view.snapshot.players.find(
    (p) => p.id === view.snapshot.carrier,
  );
  const time = Math.ceil(view.snapshot.time),
    minutes = Math.floor(time / 60),
    seconds = String(time % 60).padStart(2, "0");
  const playing = view.snapshot.phase === "playing";

  useEffect(() => {
    if (!container.current) return;
    try {
      scene.current = new ArenaScene(container.current);
      scene.current.onEvent = (kind) => audio.play(kind);
    } catch {
      onError(
        "Your browser could not start 3D graphics. Enable hardware acceleration or try a recent Chrome, Edge, Firefox, or Safari browser.",
      );
      return;
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, [audio, onError]);
  useEffect(() => {
    scene.current?.update(view.snapshot, view.localId);
  }, [view]);
  useEffect(() => {
    const events = view.snapshot.events;
    const event = events[events.length - 1];
    if (
      !event ||
      event.id <= lastEvent.current ||
      view.snapshot.elapsed - event.at > 0.8
    )
      return;
    lastEvent.current = event.id;
    const p = view.snapshot.players.find((p) => p.id === event.player);
    if (event.kind === "pickup")
      setEventText(
        event.player === view.localId
          ? "YOU HAVE THE RELIC. MAKE YOUR MOVE."
          : `${p?.name} HAS THE RELIC`,
      );
    if (event.kind === "score")
      setEventText(
        event.player === view.localId
          ? "DELIVERED. LOOKING GOOD."
          : `${p?.name} SCORED. YOUR TURN.`,
      );
    if (event.kind === "steal") setEventText("RELIC LOOSE. GO GET IT.");
    const timeout = setTimeout(() => setEventText(""), 2000);
    return () => clearTimeout(timeout);
  }, [view.snapshot.events.at(-1)?.id, view.localId]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"], [role="alertdialog"]'))
        return;
      if (
        (e.target as HTMLElement)?.matches("input, textarea, button") &&
        e.key !== " "
      )
        return;
      const key = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowleft",
          "arrowdown",
          "arrowright",
          " ",
        ].includes(key)
      )
        e.preventDefault();
      keys.current.add(key);
      if (key === " " && !e.repeat) pulse.current = true;
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => {
      keys.current.clear();
      stick.current = { x: 0, z: 0 };
      session.input({ x: 0, z: 0, pulse: false });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    let frame: number;
    const updateInput = () => {
      const k = keys.current;
      let x =
        (k.has("d") || k.has("arrowright") ? 1 : 0) -
        (k.has("a") || k.has("arrowleft") ? 1 : 0) +
        stick.current.x;
      let z =
        (k.has("s") || k.has("arrowdown") ? 1 : 0) -
        (k.has("w") || k.has("arrowup") ? 1 : 0) +
        stick.current.z;
      const pad = navigator.getGamepads?.()[0];
      if (pad) {
        if (Math.abs(pad.axes[0]) > 0.15) x += pad.axes[0];
        if (Math.abs(pad.axes[1]) > 0.15) z += pad.axes[1];
        if (pad.buttons[0]?.pressed && !gamepadPressed.current)
          pulse.current = true;
        gamepadPressed.current = pad.buttons[0]?.pressed ?? false;
      }
      const active =
        stateRef.current.snapshot.phase === "playing" &&
        !document.querySelector('[role="dialog"], [role="alertdialog"]');
      session.input({
        x: active ? x : 0,
        z: active ? z : 0,
        pulse: active && pulse.current,
      });
      pulse.current = false;
      frame = requestAnimationFrame(updateInput);
    };
    frame = requestAnimationFrame(updateInput);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      session.input({ x: 0, z: 0, pulse: false });
    };
  }, [session]);

  const moveStick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const box = e.currentTarget.getBoundingClientRect(),
      dx = e.clientX - box.left - box.width / 2,
      dy = e.clientY - box.top - box.height / 2;
    const distance = Math.hypot(dx, dy),
      radius = box.width * 0.32,
      scale = distance > radius ? radius / distance : 1;
    stick.current = { x: (dx * scale) / radius, z: (dy * scale) / radius };
    setStickVisual({ x: dx * scale, y: dy * scale });
  };
  const releaseStick = () => {
    stick.current = { x: 0, z: 0 };
    setStickVisual({ x: 0, y: 0 });
  };
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      /* Optional on browsers without fullscreen support. */
    }
  };
  const cooldown = me?.cooldown ?? 0;
  const objective =
    view.snapshot.carrier === view.localId
      ? `DELIVER TO THE ${shrineNames[view.snapshot.shrine]} SHRINE`
      : carrier
        ? `CATCH ${carrier.name}. PULSE TO STEAL.`
        : "GRAB THE RELIC AT THE CENTER";
  return (
    <main className="arena-screen">
      <div className="arena-vignette" />
      <div className="arena-mount" ref={container} />
      <div className="game-top">
        <Scoreboard
          players={view.snapshot.players}
          localId={view.localId}
          carrier={view.snapshot.carrier}
        />
        <div className={`match-clock ${time <= 30 ? "urgent" : ""}`}>
          <span>{view.practice ? "PRACTICE" : "THE SKY TEMPLE"}</span>
          <strong>
            {minutes}:{seconds}
          </strong>
          <small>
            {view.practice
              ? "WITH ECHO BOT"
              : `${view.snapshot.players.length} RUNNERS`}
          </small>
        </div>
      </div>
      {view.snapshot.phase !== "finished" && (
        <div className="objective">
          <Diamond size={15} />
          <span>{objective}</span>
        </div>
      )}
      {eventText && playing && (
        <div className="event-toast" role="status">
          {eventText}
        </div>
      )}
      {view.snapshot.phase === "countdown" && (
        <div className="countdown-overlay">
          <span>MAKE IT LEGENDARY.</span>
          <strong key={Math.ceil(view.snapshot.countdown)}>
            {Math.max(1, Math.ceil(view.snapshot.countdown))}
          </strong>
          <small>GRAB. DODGE. DELIVER.</small>
        </div>
      )}
      <div className="game-bottom">
        <div className="session-info">
          <span>
            <Radio size={13} />
            {view.practice ? "PRACTICE · BOT OPPONENT" : `ROOM ${view.room}`}
          </span>
          <small>
            {view.isHost
              ? view.practice
                ? "A warm-up before the real riot."
                : "HOST · KEEP THIS TAB ACTIVE"
              : `CONNECTED${view.ping ? ` · ${view.ping} MS` : ""}`}
          </small>
          <button className="text-button" onClick={onLeave}>
            LEAVE ROOM
          </button>
        </div>
        <div className="desktop-controls">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> MOVE
          </span>
          <button
            className={`pulse-button ${cooldown > 0 ? "charging" : ""}`}
            disabled={!playing || cooldown > 0}
            onClick={() => {
              pulse.current = true;
            }}
            style={
              {
                "--charge": `${(1 - cooldown / 3.5) * 100}%`,
              } as React.CSSProperties
            }
          >
            <Zap size={20} />
            <span>{cooldown > 0 ? `${cooldown.toFixed(1)}s` : "PULSE"}</span>
            <kbd>SPACE</kbd>
          </button>
        </div>
        <button
          className="icon-button fullscreen-button"
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={toggleFullscreen}
        >
          <Maximize size={19} />
        </button>
      </div>
      <div className="touch-controls">
        <div
          className="joystick"
          role="application"
          aria-label="Drag joystick to move your runner"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            moveStick(e);
          }}
          onPointerMove={moveStick}
          onPointerUp={releaseStick}
          onPointerCancel={releaseStick}
          onLostPointerCapture={releaseStick}
        >
          <span className="joystick-ring" />
          <span
            className="joystick-knob"
            style={{
              transform: `translate(${stickVisual.x}px,${stickVisual.y}px)`,
            }}
          />
          <span className="joystick-label">MOVE</span>
        </div>
        <button
          className={`touch-pulse ${cooldown > 0 ? "charging" : ""}`}
          disabled={!playing || cooldown > 0}
          aria-label="Pulse nearby rivals"
          onPointerDown={(e) => {
            e.preventDefault();
            pulse.current = true;
          }}
          style={
            {
              "--charge": `${(1 - cooldown / 3.5) * 100}%`,
            } as React.CSSProperties
          }
        >
          <Zap size={30} />
          <span>{cooldown > 0 ? cooldown.toFixed(1) : "PULSE"}</span>
        </button>
      </div>
      <div className="compass" aria-hidden="true">
        <span>N</span>
        <i />
      </div>
    </main>
  );
}
