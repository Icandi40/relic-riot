import { useEffect, useRef } from 'react';
import { ArrowRight, Check, Copy, Diamond, Gamepad2, HelpCircle, Laptop, Link, LogOut, Maximize, Radio, Shield, Sparkles, Timer, Trophy, Users, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { RUNNERS } from '../game/types';
import type { SessionView } from '../game/network';
import type { Player } from '../game/types';

export function Portrait({ color, className = '' }: { color: number; className?: string }) {
  return <span className={`portrait ${className}`} style={{ backgroundPosition: `${color * 100 / 3}% 48%`, '--runner': RUNNERS[color].color } as React.CSSProperties} aria-hidden="true" />;
}
export function Brand({ onClick }: { onClick: () => void }) { return <button className="brand" onClick={onClick} aria-label="Relic Riot home"><span className="brand-mark" /><span>RELIC RIOT</span></button>; }
export function Header({ sound, toggleSound, onHelp, onHome, playing }: { sound: boolean; toggleSound: () => void; onHelp: () => void; onHome: () => void; playing: boolean }) {
  return <header className={`header ${playing ? 'header-playing' : ''}`}><Brand onClick={onHome} /><div className="header-actions"><button className="outline help-button" onClick={onHelp}><HelpCircle size={17} /><span>HOW TO PLAY</span></button><button className="icon-button" onClick={toggleSound} aria-label={sound ? 'Mute sound' : 'Enable sound'} title={sound ? 'Mute sound' : 'Enable sound'}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button></div></header>;
}

export function Home({ name, setName, color, setColor, code, setCode, busy, status, error, onHost, onJoin, onPractice }: {
  name: string; setName: (name: string) => void; color: number; setColor: (color: number) => void; code: string; setCode: (code: string) => void;
  busy: boolean; status: string; error: string; onHost: () => void; onJoin: () => void; onPractice: () => void;
}) {
  return <main className="home">
    <div className="home-content">
      <h1>RELIC<br />RIOT<span className="title-diamond">◆</span></h1>
      <h2>Grab the relic. Steal the spotlight.</h2>
      <p className="home-description">A fast, fiercely friendly arena heist.<br className="desktop-break" /> Outrun your rivals. Deliver the relic. Own the round.</p>
      <div className="game-facts"><span><Users />2–4 PLAYERS</span><span><Timer />3-MINUTE ROUNDS</span><span><Laptop />PLAY ANYWHERE</span></div>
      <section className="entry-panel" aria-label="Create or join a game">
        <label className="field-label" htmlFor="callsign">YOUR CALLSIGN</label>
        <input id="callsign" autoComplete="nickname" maxLength={14} placeholder="ENTER YOUR NAME" value={name} onChange={e => setName(e.target.value)} disabled={busy} />
        <fieldset className="runner-picker"><legend>CHOOSE YOUR RUNNER</legend><div className="runner-options">{RUNNERS.map((runner, i) => <button key={runner.name} type="button" className={`runner-option ${color === i ? 'selected' : ''}`} aria-label={`Choose ${runner.name}, ${runner.role}`} aria-pressed={color === i} onClick={() => setColor(i)} disabled={busy} style={{ '--runner': runner.color } as React.CSSProperties}><Portrait color={i} /><span>{runner.name}</span>{color === i && <Check className="selected-check" size={14} />}</button>)}</div></fieldset>
        <button className="primary create-button" disabled={busy} onClick={onHost}>{busy ? <><span className="spinner" />CONNECTING…</> : <>CREATE ROOM<ArrowRight size={23} /></>}</button>
        <div className="or-divider"><span />OR JOIN YOUR CREW<span /></div>
        <form className="join-form" onSubmit={e => { e.preventDefault(); if (!busy) onJoin(); }}><input aria-label="Room code" maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ENTER ROOM CODE" value={code} disabled={busy} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /><button className="primary" type="submit" disabled={busy || code.length !== 6}>JOIN</button></form>
        {error && <p className="error-message" role="alert">{error}</p>}
        {busy && <p className="connection-status" role="status">{status}</p>}
      </section>
      <button className="practice-link" onClick={onPractice} disabled={busy}>PRACTICE RUN <ArrowRight size={17} /><span>Learn the arena with a bot</span></button>
    </div>
    <div className="location-caption"><Diamond size={20} /><span>THE SKY TEMPLE</span><small>ONE RELIC. EVERY RUNNER FOR THEMSELVES.</small></div>
  </main>;
}

export function Footer() { return <footer className="footer"><span className="creator">Created by <strong>Sheena Lindsey-Smith</strong></span><div className="rule-strip"><span><b>01</b>GRAB THE RELIC<Diamond /></span><span><b>02</b>DODGE THE PULSE<Diamond /></span><span><b>03</b>DELIVER TO SCORE</span></div></footer>; }

export function Lobby({ view, onReady, onStart, onLeave, copied, copyInvite }: { view: SessionView; onReady: () => void; onStart: () => void; onLeave: () => void; copied: boolean; copyInvite: () => void }) {
  const me = view.snapshot.players.find(p => p.id === view.localId)!;
  const canStart = view.snapshot.players.length >= 2 && view.snapshot.players.every(p => p.ready);
  return <main className="lobby-screen"><section className="lobby-panel">
    <div className="lobby-topline"><span className="live-status"><i />ROOM ONLINE</span><button className="text-button" onClick={onLeave}><LogOut size={15} />LEAVE</button></div>
    <h1>ASSEMBLE<br /><em>YOUR CREW.</em></h1>
    <p className="muted">A little rivalry looks good on everyone.</p>
    <div className="room-invite"><div><label>YOUR ROOM CODE</label><strong data-testid="room-code">{view.room}</strong></div><button className="outline" onClick={copyInvite}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'COPIED' : 'COPY INVITE'}</button></div>
    <div className="crew-list">{Array.from({ length: 4 }, (_, i) => {
      const p = view.snapshot.players[i];
      return p ? <div key={p.id} className="crew-member" style={{ '--runner': RUNNERS[p.color].color } as React.CSSProperties}><Portrait color={p.color} /><div><strong>{p.name}</strong><span>{p.id === view.localId ? 'YOU' : 'CONNECTED'}{i === 0 ? ' · HOST' : ''}</span></div><span className={`ready-state ${p.ready ? 'ready' : ''}`}>{p.ready ? <><Check size={15} />READY</> : 'GETTING READY'}</span></div> : <div key={i} className="crew-member empty"><span className="empty-portrait"><Users size={21} /></span><span>Waiting for a rival…</span><span>{i < 2 ? 'REQUIRED' : 'OPTIONAL'}</span></div>;
    })}</div>
    <div className="lobby-buttons"><button className={me.ready ? 'outline ready-toggle' : 'primary ready-toggle'} onClick={onReady}>{me.ready ? <><Check size={18} />YOU’RE READY</> : 'I’M READY'}</button>{view.isHost && <button className="primary" disabled={!canStart} onClick={onStart}>START THE RIOT<ArrowRight size={19} /></button>}</div>
    <p className="lobby-hint">{view.snapshot.players.length < 2 ? 'Share the invite with a friend on another device.' : !canStart ? 'Every runner needs to be ready before the round starts.' : view.isHost ? 'Your crew is ready. Let the friendly theft begin.' : 'Your crew is ready. Waiting for the host to start.'}</p>
    <p className="host-note"><Shield size={14} />The host keeps this room running. Keep their game tab open.</p>
  </section><div className="lobby-art-caption"><Diamond /><span>FRIENDS TODAY.<br />RIVALS IN THREE SECONDS.</span></div></main>;
}

export function Scoreboard({ players, localId, carrier }: { players: Player[]; localId: string; carrier: string | null }) {
  return <div className="scoreboard" aria-label="Scores">{players.map(p => <div className={`score-player ${p.id === localId ? 'local' : ''}`} key={p.id} style={{ '--runner': RUNNERS[p.color].color } as React.CSSProperties}><Portrait color={p.color} /><div><strong>{p.name}</strong><small>{p.id === carrier ? '◆ RELIC CARRIER' : p.id === localId ? 'YOU' : p.bot ? 'PRACTICE BOT' : 'RIVAL'}</small></div><b>{p.score}</b></div>)}</div>;
}

export function Help({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusable = ref.current?.querySelectorAll<HTMLElement>('button, a, input'); if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey); return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="help-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="close-button icon-button" onClick={onClose} aria-label="Close instructions"><X /></button><Diamond className="modal-diamond" size={34} /><h2 id="help-title">A LITTLE THEFT.<br />A LOT OF GLORY.</h2><p className="muted">Everyone competes. Highest score after 3 minutes wins.</p><div className="help-rules"><div><b>01</b><span><strong>GRAB THE RELIC</strong>Run into the floating amber relic to pick it up automatically. Carrying it slows you down.</span></div><div><b>02</b><span><strong>DODGE THE PULSE</strong>Pulse nearby rivals to knock the relic loose. Your pulse recharges in 3.5 seconds. After a hit, a runner has brief protection.</span></div><div><b>03</b><span><strong>DELIVER TO SCORE</strong>Carry the relic into the glowing gold shrine to earn a point. The relic resets and the next shrine lights up.</span></div></div><div className="control-guide"><div><Laptop /><strong>COMPUTER</strong><span><kbd>W A S D</kbd> or <kbd>↑ ← ↓ →</kbd> to move<br /><kbd>SPACE</kbd> to pulse</span></div><div><Gamepad2 /><strong>PHONE / TABLET</strong><span>Drag the left joystick to move.<br />Tap PULSE on the right.</span></div></div><p className="help-network"><Link size={15} />Create a room and share its code or invite link. Keep the host’s game tab active. Some restrictive networks may need a different Wi-Fi connection or hotspot.</p><button className="primary" onClick={onClose}>GOT IT. LET’S RIOT.<ArrowRight size={19} /></button></div></div>;
}

export function Results({ view, onReady, onStart, onLeave }: { view: SessionView; onReady: () => void; onStart: () => void; onLeave: () => void }) {
  const sorted = [...view.snapshot.players].sort((a, b) => b.score - a.score);
  const draw = sorted.length > 1 && sorted[0].score === sorted[1].score;
  const me = sorted.find(p => p.id === view.localId)!;
  const canStart = view.snapshot.players.every(p => p.ready);
  return <div className="results-backdrop"><section className="results-panel"><Trophy className="trophy" size={44} /><span className="results-label">{view.practice ? 'PRACTICE COMPLETE' : 'ROUND COMPLETE'}</span><h1>{draw ? 'A GLORIOUS DRAW.' : sorted[0].id === view.localId ? 'YOU OWNED IT.' : `${sorted[0].name} WINS.`}</h1><p>{draw ? 'Evenly matched. Settle it in the next round.' : 'The relic has a favorite. For now.'}</p><div className="results-scores">{sorted.map((p, i) => <div key={p.id}><b className="rank">{i + 1}</b><Portrait color={p.color} /><strong>{p.name}{p.id === view.localId && <small>YOU</small>}</strong><span>{p.score}<small>{p.score === 1 ? 'DELIVERY' : 'DELIVERIES'}</small></span>{p.ready && <Check size={19} />}</div>)}</div><div className="results-actions">{!me.ready && <button className="primary" onClick={onReady}>READY FOR A REMATCH<ArrowRight size={19} /></button>}{me.ready && !view.isHost && <p className="ready-message"><Check />Ready. Waiting for your crew…</p>}{view.isHost && me.ready && <button className="primary" disabled={!canStart} onClick={onStart}>{canStart ? 'ONE MORE RIOT' : 'WAITING FOR YOUR CREW…'}<ArrowRight size={19} /></button>}<button className="text-button" onClick={onLeave}>BACK TO HOME</button></div></section></div>;
}

export function LeaveDialog({ isHost, onLeave, onClose }: { isHost: boolean; onLeave: () => void; onClose: () => void }) { return <div className="modal-backdrop"><section className="leave-modal" role="alertdialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">LEAVE THE RIOT?</h2><p>{isHost ? 'You are hosting. Leaving closes the room for your crew.' : 'You will leave this room and return to the home screen.'}</p><button className="primary" onClick={onClose} autoFocus>KEEP PLAYING</button><button className="text-button" onClick={onLeave}>LEAVE ROOM</button></section></div>; }

export { ArrowRight, Diamond, HelpCircle, LogOut, Maximize, Radio, Sparkles, Timer, Trophy, Zap };
