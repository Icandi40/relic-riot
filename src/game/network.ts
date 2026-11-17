import Peer, { type DataConnection } from 'peerjs';
import { Simulation } from './simulation';
import { cleanName, validColor } from './types';
import type { Input, Snapshot } from './types';

const PREFIX = 'relic-riot-v1-';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join('');
export type SessionView = { snapshot: Snapshot; localId: string; isHost: boolean; room: string; practice: boolean; ping: number; connected: boolean };
type Callbacks = { update: (view: SessionView) => void; error: (message: string) => void; status: (message: string) => void };

/** Internet signaling + encrypted WebRTC data. The room's host is the authority. */
export class GameSession {
  private peer: Peer | null = null;
  private links = new Map<string, DataConnection>();
  private sim: Simulation | null = null;
  private lastSnapshot: Snapshot | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private pending: ReturnType<typeof setTimeout> | null = null;
  private lastInput = 0;
  private lastPacket = performance.now();
  private lastSent = 0;
  private closed = false;
  private localId: string = crypto.randomUUID();
  private isHost = false;
  private practice = false;
  private room = '';
  private ping = 0;
  constructor(private callbacks: Callbacks) {}

  private makePeer(id?: string) {
    const peer = new Peer(id ?? undefined as unknown as string, {
      debug: 0,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }] },
    });
    this.peer = peer;
    peer.on('error', err => {
      if (this.closed) return;
      const message = err.type === 'peer-unavailable' ? 'That room is not online. Check the code and ask your host to keep the room open.'
        : err.type === 'unavailable-id' ? 'That room code is already in use. Please create a new room.'
        : err.type === 'network' || err.type === 'socket-error' ? 'The connection service could not be reached. Check your connection or try another network.'
        : err.type === 'webrtc' ? 'This network blocked the direct game connection. Try another Wi-Fi network or a mobile hotspot.'
        : 'The game connection was interrupted. Please return home and try again.';
      this.fail(message);
    });
    peer.on('disconnected', () => { if (!this.closed && !peer.destroyed) { this.callbacks.status('Reconnecting to the room service…'); setTimeout(() => { if (!this.closed && !peer.destroyed) peer.reconnect(); }, 1200); } });
    return peer;
  }

  async host(name: string, color: number) {
    this.isHost = true; this.room = makeCode(); this.callbacks.status('Opening your room…');
    const peer = this.makePeer(PREFIX + this.room);
    this.pending = setTimeout(() => this.fail('The room service is taking too long. Check your connection and try again.'), 18000);
    peer.on('open', () => {
      if (this.closed) return; this.clearPending();
      this.sim = new Simulation(); this.sim.addPlayer(this.localId, name, color);
      this.startLoop(); this.emit(this.sim.snapshot()); this.callbacks.status('Your room is ready. Invite your crew.');
    });
    peer.on('connection', link => {
      let admitted = false, packets = 0, windowStart = performance.now();
      const handshakeTimer = setTimeout(() => { if (!admitted) link.close(); }, 10000);
      link.on('data', raw => {
        if (!raw || typeof raw !== 'object' || this.closed) return;
        const m = raw as Record<string, unknown>;
        const now = performance.now(); if (now - windowStart > 1000) { windowStart = now; packets = 0; } if (++packets > 100) return;
        if (m.type === 'hello' && !admitted && this.sim) {
          if (!this.sim.addPlayer(link.peer, cleanName(m.name), validColor(m.color))) {
            link.send({ type: 'rejected', message: this.sim.state.players.length >= 4 ? 'This room has four runners already. Ask your crew to create another room.' : 'This round has already started. Ask the host to finish the round, then join again.' });
            setTimeout(() => link.close(), 500); return;
          }
          admitted = true; clearTimeout(handshakeTimer); this.links.set(link.peer, link);
          link.send({ type: 'welcome', id: link.peer, snapshot: this.sim.snapshot() }); this.broadcast();
        } else if (admitted && this.sim) {
          if (m.type === 'input') this.sim.input(link.peer, m.value);
          if (m.type === 'ready') { this.sim.setReady(link.peer, m.value === true); this.broadcast(); }
          if (m.type === 'ping' && typeof m.at === 'number') link.send({ type: 'pong', at: m.at });
        }
      });
      link.on('close', () => { clearTimeout(handshakeTimer); if (admitted) { this.links.delete(link.peer); this.sim?.removePlayer(link.peer); this.broadcast(); this.callbacks.status('A runner left the room.'); } });
      link.on('error', () => link.close());
    });
  }

  async join(room: string, name: string, color: number) {
    this.room = room.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(this.room)) { this.fail('Enter the six-character room code from your host.'); return; }
    this.callbacks.status('Finding your crew…');
    const peer = this.makePeer();
    this.pending = setTimeout(() => this.fail('We could not establish a direct connection. Check the room code, keep the host online, or try another network.'), 22000);
    peer.on('open', () => {
      if (this.closed) return;
      const link = peer.connect(PREFIX + this.room, { reliable: true, serialization: 'json' });
      this.links.set('host', link);
      link.on('open', () => { link.send({ type: 'hello', name: cleanName(name), color: validColor(color) }); });
      link.on('data', raw => {
        if (!raw || typeof raw !== 'object' || this.closed) return;
        const m = raw as Record<string, unknown>; this.lastPacket = performance.now();
        if (m.type === 'rejected') { this.fail(String(m.message)); return; }
        if (m.type === 'welcome' && typeof m.id === 'string') {
          this.localId = m.id; this.clearPending(); this.callbacks.status('Connected. Get ready to riot.'); this.startWatchdog();
        }
        if ((m.type === 'snapshot' || m.type === 'welcome') && validSnapshot(m.snapshot)) this.emit(m.snapshot);
        if (m.type === 'pong' && typeof m.at === 'number') this.ping = Math.round(performance.now() - m.at);
      });
      link.on('close', () => { if (!this.closed) this.fail('The host left or the connection ended. Return home to create or join a new room.'); });
      link.on('error', () => this.fail('The direct connection failed. Try another network or ask your friend to host.'));
    });
  }

  practiceRun(name: string, color: number) {
    this.isHost = true; this.practice = true; this.room = 'PRACTICE';
    this.sim = new Simulation(); this.sim.addPlayer(this.localId, name, color); this.sim.addPlayer('practice-bot', 'ECHO · BOT', (color + 1) % 4, true);
    this.sim.setReady(this.localId, true); this.sim.start(); this.startLoop(); this.emit(this.sim.snapshot());
  }

  private startLoop() {
    let last = performance.now(), count = 0;
    this.timer = setInterval(() => {
      const now = performance.now(); this.sim?.step((now - last) / 1000); last = now;
      if (++count % 3 === 0) this.broadcast();
    }, 1000 / 60);
  }
  private startWatchdog() {
    this.watchdog = setInterval(() => {
      if (performance.now() - this.lastPacket > 12000) this.fail('The host stopped responding. Keep the host’s game tab active, then reconnect.');
      else this.send({ type: 'ping', at: performance.now() });
    }, 2000);
  }
  private send(value: unknown) { const link = this.links.get('host'); if (link?.open) link.send(value); }
  private broadcast() {
    if (!this.sim || this.closed) return;
    const snapshot = this.sim.snapshot(); this.emit(snapshot);
    for (const link of this.links.values()) if (link.open) link.send({ type: 'snapshot', snapshot });
  }
  private emit(snapshot: Snapshot) {
    this.lastSnapshot = snapshot;
    this.callbacks.update({ snapshot, localId: this.localId, isHost: this.isHost, room: this.room, practice: this.practice, ping: this.ping, connected: true });
  }
  input(value: Input) {
    if (this.closed) return;
    const now = performance.now();
    if (this.isHost) this.sim?.input(this.localId, value);
    else if (value.pulse || now - this.lastInput > 28) { this.send({ type: 'input', value }); this.lastInput = now; }
  }
  ready(value: boolean) { if (this.isHost) { this.sim?.setReady(this.localId, value); this.broadcast(); } else this.send({ type: 'ready', value }); }
  start() { if (this.isHost && this.sim?.start()) this.broadcast(); }
  getSnapshot() { return this.lastSnapshot; }
  private clearPending() { if (this.pending) clearTimeout(this.pending); this.pending = null; }
  private fail(message: string) { if (this.closed) return; this.callbacks.error(message); this.close(); }
  close() {
    this.closed = true; this.clearPending(); if (this.timer) clearInterval(this.timer); if (this.watchdog) clearInterval(this.watchdog);
    this.links.forEach(link => link.close()); this.links.clear(); this.peer?.destroy(); this.peer = null;
  }
}

function validSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Snapshot;
  return ['lobby', 'countdown', 'playing', 'finished'].includes(s.phase) && Array.isArray(s.players) && s.players.length <= 4 && typeof s.time === 'number' && Array.isArray(s.events);
}
