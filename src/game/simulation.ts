import { ARENA_RADIUS, PILLARS, ROUND_SECONDS, SHRINES, cleanInput, cleanName, validColor } from './types';
import type { GameEvent, Input, Player, Snapshot } from './types';

const STARTS = [{ x: -6, z: 5 }, { x: 6, z: -5 }, { x: 6, z: 5 }, { x: -6, z: -5 }];
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

/** One host controls all rules. Guests can submit bounded inputs, never positions or scores. */
export class Simulation {
  state: Snapshot = { phase: 'lobby', players: [], carrier: null, relic: { x: 0, z: 0 }, shrine: 0, time: ROUND_SECONDS, countdown: 3, elapsed: 0, pickupAt: 0, events: [], round: 0 };
  private inputs = new Map<string, { value: Input; age: number }>();
  private eventId = 0;
  private scoreDelay = 0;

  addPlayer(id: string, name: string, color: number, bot = false): boolean {
    if (this.state.players.some(p => p.id === id) || this.state.players.length >= 4 || this.state.phase === 'playing' || this.state.phase === 'countdown') return false;
    const start = STARTS[this.state.players.length];
    const used = this.state.players.map(p => p.color);
    const chosen = used.includes(validColor(color)) ? [0, 1, 2, 3].find(c => !used.includes(c))! : validColor(color);
    this.state.players.push({ id, name: cleanName(name), color: chosen, ...start, dx: 0, dz: -1, score: 0, cooldown: 0, stunned: 0, invincible: 0, ready: bot, bot });
    return true;
  }

  removePlayer(id: string) {
    if (this.state.carrier === id) { const p = this.state.players.find(p => p.id === id); if (p) this.state.relic = { x: p.x, z: p.z }; this.state.carrier = null; }
    this.state.players = this.state.players.filter(p => p.id !== id);
    this.inputs.delete(id);
    if (this.state.players.length < 2 && (this.state.phase === 'playing' || this.state.phase === 'countdown')) {
      this.state.phase = 'lobby';
      this.state.players.forEach(p => { p.ready = false; });
    }
  }

  setReady(id: string, ready: boolean) { const p = this.state.players.find(p => p.id === id); if (p && ['lobby', 'finished'].includes(this.state.phase)) p.ready = ready; }
  input(id: string, value: unknown) { if (this.state.players.some(p => p.id === id)) this.inputs.set(id, { value: cleanInput(value), age: 0 }); }
  start(): boolean {
    if (!['lobby', 'finished'].includes(this.state.phase) || this.state.players.length < 2 || !this.state.players.every(p => p.ready)) return false;
    this.state.phase = 'countdown'; this.state.countdown = 3; this.state.time = ROUND_SECONDS;
    this.state.carrier = null; this.state.relic = { x: 0, z: 0 }; this.state.shrine = this.state.round % 4;
    this.state.pickupAt = this.state.elapsed; this.state.round++; this.scoreDelay = 0;
    this.state.players.forEach((p, i) => Object.assign(p, STARTS[i], { score: 0, cooldown: 0, stunned: 0, invincible: 0, dx: 0, dz: -1 }));
    this.inputs.clear(); return true;
  }

  private event(kind: GameEvent['kind'], p: Player) {
    this.state.events.push({ id: ++this.eventId, kind, player: p.id, x: p.x, z: p.z, at: this.state.elapsed });
    this.state.events = this.state.events.slice(-12);
  }

  private keepOnFloor(p: Player) {
    const length = Math.hypot(p.x, p.z);
    if (length > ARENA_RADIUS) { p.x *= ARENA_RADIUS / length; p.z *= ARENA_RADIUS / length; }
    for (const obstacle of PILLARS) {
      const d = distance(p, obstacle), radius = 1.13;
      if (d < radius) { const nx = d > .0001 ? (p.x - obstacle.x) / d : 1; const nz = d > .0001 ? (p.z - obstacle.z) / d : 0; p.x = obstacle.x + nx * radius; p.z = obstacle.z + nz * radius; }
    }
  }

  step(delta: number) {
    const realDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    const dt = Math.min(realDelta, .05);
    this.state.elapsed += realDelta;
    if (this.state.phase === 'countdown') {
      this.state.countdown -= realDelta;
      if (this.state.countdown <= 0) { this.state.phase = 'playing'; this.event('start', this.state.players[0]); }
      return;
    }
    if (this.state.phase !== 'playing') return;
    this.state.time = Math.max(0, this.state.time - realDelta);
    this.scoreDelay = Math.max(0, this.scoreDelay - dt);
    for (const p of this.state.players) {
      p.cooldown = Math.max(0, p.cooldown - realDelta); p.stunned = Math.max(0, p.stunned - realDelta); p.invincible = Math.max(0, p.invincible - realDelta);
      let input: Input = { x: 0, z: 0, pulse: false };
      const received = this.inputs.get(p.id);
      if (received) { received.age += dt; if (received.age < .35) input = received.value; }
      if (p.bot) {
        const target = this.state.carrier === p.id ? SHRINES[this.state.shrine] : this.state.carrier ? this.state.players.find(x => x.id === this.state.carrier)! : this.state.relic;
        let x = target.x - p.x, z = target.z - p.z;
        // Steer around the four columns rather than running against them.
        for (const o of PILLARS) { const d = distance(p, o); if (d < 2.1) { x += (p.x - o.x) / Math.max(.2, d) * 3; z += (p.z - o.z) / Math.max(.2, d) * 3; } }
        const len = Math.hypot(x, z); input = { x: len > .15 ? x / len : 0, z: len > .15 ? z / len : 0, pulse: this.state.carrier !== p.id && this.state.carrier !== null && distance(p, target) < 2.5 };
      }
      const len = Math.hypot(input.x, input.z);
      if (p.stunned <= 0 && len > .02) {
        const nx = input.x / Math.max(1, len), nz = input.z / Math.max(1, len), speed = this.state.carrier === p.id ? 4.1 : 5.4;
        p.x += nx * speed * dt; p.z += nz * speed * dt; p.dx = nx; p.dz = nz;
        this.keepOnFloor(p);
      }
      if (input.pulse && p.cooldown <= 0 && p.stunned <= 0) {
        p.cooldown = 3.5; this.event('pulse', p);
        for (const other of this.state.players) {
          if (other.id === p.id || distance(p, other) > 2.65 || other.invincible > 0) continue;
          const d = Math.max(.01, distance(p, other));
          const nx = d > .01 ? (other.x - p.x) / d : 1, nz = (other.z - p.z) / d;
          other.x += nx * 1.7; other.z += nz * 1.7; other.stunned = .38; other.invincible = 1.1; this.keepOnFloor(other);
          if (this.state.carrier === other.id) {
            this.state.carrier = null; this.state.relic = { x: other.x, z: other.z }; this.state.pickupAt = this.state.elapsed + .65;
            this.event('steal', p);
          }
        }
        // Consume a discrete action. Held keyboard/touch never bypasses cooldown.
        if (received) received.value.pulse = false;
      }
    }
    if (!this.state.carrier && this.state.elapsed >= this.state.pickupAt && this.scoreDelay <= 0) {
      const p = this.state.players.find(p => p.stunned <= 0 && distance(p, this.state.relic) < 1.05);
      if (p) { this.state.carrier = p.id; this.event('pickup', p); }
    }
    if (this.state.carrier) {
      const p = this.state.players.find(p => p.id === this.state.carrier)!;
      this.state.relic = { x: p.x, z: p.z };
      if (distance(p, SHRINES[this.state.shrine]) < 1.3) {
        p.score++; this.event('score', p); this.state.carrier = null;
        this.state.relic = { x: 0, z: 0 }; this.state.shrine = (this.state.shrine + 1) % 4;
        this.state.pickupAt = this.state.elapsed + 1.2; this.scoreDelay = 1.2;
      }
    }
    if (this.state.time <= 0) {
      this.state.phase = 'finished'; this.state.players.forEach(p => { p.ready = p.bot; }); this.event('finish', this.state.players[0]);
    }
  }

  snapshot(): Snapshot { return structuredClone(this.state); }
}
