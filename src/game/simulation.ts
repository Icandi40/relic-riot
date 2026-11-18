import {
  ARENA_RADIUS,
  PILLARS,
  ROUND_SECONDS,
  SHRINES,
  cleanInput,
  cleanName,
  validColor,
  emptyStats,
  cleanCosmetic,
  QUICK_MESSAGES,
} from "./types";
import type { GameEvent, Input, Player, Snapshot } from "./types";

const STARTS = [
  { x: -6, z: 5 },
  { x: 6, z: -5 },
  { x: 6, z: 5 },
  { x: -6, z: -5 },
];
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

/** One host controls all rules. Guests can submit bounded inputs, never positions or scores. */
export class Simulation {
  state: Snapshot = {
    phase: "lobby",
    players: [],
    standings: [],
    carrier: null,
    relic: { x: 0, z: 0 },
    shrine: 0,
    time: ROUND_SECONDS,
    countdown: 3,
    elapsed: 0,
    pickupAt: 0,
    events: [],
    round: 0,
    matchId: "",
    surge: false,
    messages: [],
  };
  private inputs = new Map<
    string,
    { value: Input; at: number; pending: boolean }
  >();
  private eventId = 0;
  private scoreDelay = 0;
  private carryStreak = new Map<string, number>();
  private messageTimes = new Map<string, number>();
  private messageId = 0;
  constructor(private clock?: () => number) {}

  addPlayer(
    id: string,
    name: string,
    color: number,
    bot = false,
    cosmetic: unknown = "classic",
  ): boolean {
    if (
      this.state.players.some((p) => p.id === id) ||
      this.state.players.length >= 4 ||
      this.state.phase === "playing" ||
      this.state.phase === "countdown"
    )
      return false;
    // A new arrival has not played the completed match. Return everyone to a
    // fresh lobby so they cannot collect its rewards or alter its recap.
    if (this.state.phase === "finished") {
      this.state.phase = "lobby";
      this.state.matchId = "";
      this.state.standings = [];
      this.state.players.forEach((p) => {
        p.ready = p.bot;
      });
    }
    const start = STARTS[this.state.players.length];
    const used = this.state.players.map((p) => p.color);
    const chosen = used.includes(validColor(color))
      ? [0, 1, 2, 3].find((c) => !used.includes(c))!
      : validColor(color);
    this.state.players.push({
      id,
      name: cleanName(name),
      color: chosen,
      ...start,
      dx: 0,
      dz: -1,
      score: 0,
      cooldown: 0,
      stunned: 0,
      invincible: 0,
      ready: bot,
      bot,
      cosmetic: cleanCosmetic(cosmetic),
      stats: emptyStats(),
    });
    return true;
  }

  removePlayer(id: string) {
    if (this.state.carrier === id) {
      const p = this.state.players.find((p) => p.id === id);
      if (p) this.state.relic = { x: p.x, z: p.z };
      this.state.carrier = null;
    }
    this.state.players = this.state.players.filter((p) => p.id !== id);
    this.inputs.delete(id);
    this.carryStreak.delete(id);
    this.messageTimes.delete(id);
    if (
      this.state.players.length < 2 &&
      (this.state.phase === "playing" || this.state.phase === "countdown")
    ) {
      this.state.phase = "lobby";
      this.state.players.forEach((p) => {
        p.ready = false;
      });
    }
  }

  setReady(id: string, ready: boolean) {
    const p = this.state.players.find((p) => p.id === id);
    if (p && ["lobby", "finished"].includes(this.state.phase)) p.ready = ready;
  }
  setSurge(enabled: boolean) {
    if (this.state.phase !== "lobby" && this.state.phase !== "finished")
      return false;
    if (this.state.surge !== enabled)
      this.state.players.forEach((p) => {
        p.ready = p.bot;
      });
    this.state.surge = enabled;
    return true;
  }
  message(id: string, key: unknown) {
    const p = this.state.players.find((p) => p.id === id);
    if (!p || typeof key !== "string" || !Object.hasOwn(QUICK_MESSAGES, key))
      return false;
    if (this.state.elapsed - (this.messageTimes.get(id) ?? -Infinity) < 2)
      return false;
    this.messageTimes.set(id, this.state.elapsed);
    this.state.messages.push({
      id: ++this.messageId,
      playerId: id,
      name: p.name,
      text: QUICK_MESSAGES[key as keyof typeof QUICK_MESSAGES],
      at: this.state.elapsed,
    });
    this.state.messages = this.state.messages.slice(-8);
    return true;
  }
  input(id: string, value: unknown) {
    const player = this.state.players.find((p) => p.id === id);
    if (!player) return;
    const next = cleanInput(value),
      pending = this.inputs.get(id);
    // A short action must survive a newer movement packet arriving before the
    // next simulation tick. Otherwise pulse presses can disappear under load.
    next.pulse =
      (next.pulse || pending?.value.pulse === true) &&
      player.cooldown <= 0 &&
      player.stunned <= 0;
    this.inputs.set(id, {
      value: next,
      at: this.clock?.() ?? this.state.elapsed,
      pending: true,
    });
  }
  start(): boolean {
    if (
      !["lobby", "finished"].includes(this.state.phase) ||
      this.state.players.length < 2 ||
      !this.state.players.every((p) => p.ready)
    )
      return false;
    this.state.phase = "countdown";
    this.state.countdown = 3;
    this.state.time = ROUND_SECONDS;
    this.state.carrier = null;
    this.state.relic = { x: 0, z: 0 };
    this.state.shrine = this.state.round % 4;
    this.state.pickupAt = this.state.elapsed;
    this.state.round++;
    this.state.matchId = crypto.randomUUID();
    this.state.standings = [];
    this.carryStreak.clear();
    this.state.messages = [];
    this.scoreDelay = 0;
    this.state.players.forEach((p, i) =>
      Object.assign(p, STARTS[i], {
        score: 0,
        cooldown: 0,
        stunned: 0,
        invincible: 0,
        dx: 0,
        dz: -1,
        stats: emptyStats(),
      }),
    );
    this.inputs.clear();
    return true;
  }

  private event(kind: GameEvent["kind"], p: Player) {
    this.state.events.push({
      id: ++this.eventId,
      kind,
      player: p.id,
      x: p.x,
      z: p.z,
      at: this.state.elapsed,
    });
    this.state.events = this.state.events.slice(-12);
  }

  private keepOnFloor(p: Player) {
    const length = Math.hypot(p.x, p.z);
    if (length > ARENA_RADIUS) {
      p.x *= ARENA_RADIUS / length;
      p.z *= ARENA_RADIUS / length;
    }
    for (const obstacle of PILLARS) {
      const d = distance(p, obstacle),
        radius = 1.13;
      if (d < radius) {
        const nx = d > 0.0001 ? (p.x - obstacle.x) / d : 1;
        const nz = d > 0.0001 ? (p.z - obstacle.z) / d : 0;
        p.x = obstacle.x + nx * radius;
        p.z = obstacle.z + nz * radius;
      }
    }
  }

  step(delta: number) {
    const realDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    const dt = Math.min(realDelta, 0.05);
    this.state.elapsed += realDelta;
    const inputNow = this.clock?.() ?? this.state.elapsed;
    if (this.state.phase === "countdown") {
      this.state.countdown -= realDelta;
      if (this.state.countdown <= 0) {
        this.state.phase = "playing";
        this.event("start", this.state.players[0]);
      }
      return;
    }
    if (this.state.phase !== "playing") return;
    const activeTime = Math.min(realDelta, this.state.time);
    const holding = this.state.players.find((p) => p.id === this.state.carrier);
    if (holding) {
      holding.stats.carrySeconds += activeTime;
      const streak = (this.carryStreak.get(holding.id) ?? 0) + activeTime;
      this.carryStreak.set(holding.id, streak);
      holding.stats.longestCarry = Math.max(holding.stats.longestCarry, streak);
    }
    this.state.time = Math.max(0, this.state.time - realDelta);
    if (this.state.time <= 0) {
      this.state.phase = "finished";
      this.state.players.forEach((p) => {
        p.ready = p.bot;
      });
      this.state.standings = structuredClone(this.state.players);
      this.event("finish", this.state.players[0]);
      return;
    }
    this.scoreDelay = Math.max(0, this.scoreDelay - dt);
    for (const p of this.state.players) {
      p.cooldown = Math.max(0, p.cooldown - realDelta);
      p.stunned = Math.max(0, p.stunned - realDelta);
      p.invincible = Math.max(0, p.invincible - realDelta);
      let input: Input = { x: 0, z: 0, pulse: false };
      const received = this.inputs.get(p.id);
      // Integrate a packet received since the previous tick once, even if a
      // slow GPU blocked the thread afterwards. The step is still capped at
      // 50ms. Previously consumed input expires after 350ms without a refresh.
      if (received) {
        const age = inputNow - received.at;
        if (
          age < 0.35 ||
          (received.pending && received.at >= inputNow - realDelta)
        )
          input = received.value;
        received.pending = false;
      }
      if (p.bot) {
        const target =
          this.state.carrier === p.id
            ? SHRINES[this.state.shrine]
            : this.state.carrier
              ? this.state.players.find((x) => x.id === this.state.carrier)!
              : this.state.relic;
        let x = target.x - p.x,
          z = target.z - p.z;
        // Steer around the four columns rather than running against them.
        for (const o of PILLARS) {
          const d = distance(p, o);
          if (d < 2.1) {
            x += ((p.x - o.x) / Math.max(0.2, d)) * 3;
            z += ((p.z - o.z) / Math.max(0.2, d)) * 3;
          }
        }
        const len = Math.hypot(x, z);
        input = {
          x: len > 0.15 ? x / len : 0,
          z: len > 0.15 ? z / len : 0,
          pulse:
            this.state.carrier !== p.id &&
            this.state.carrier !== null &&
            distance(p, target) < 2.5,
        };
      }
      const len = Math.hypot(input.x, input.z);
      if (p.stunned <= 0 && len > 0.02) {
        const nx = input.x / Math.max(1, len),
          nz = input.z / Math.max(1, len),
          speed = this.state.carrier === p.id ? 4.1 : 5.4;
        p.x += nx * speed * dt;
        p.z += nz * speed * dt;
        p.dx = nx;
        p.dz = nz;
        this.keepOnFloor(p);
      }
      if (input.pulse && p.cooldown <= 0 && p.stunned <= 0) {
        p.cooldown = 3.5;
        p.stats.pulses++;
        let landed = false;
        this.event("pulse", p);
        for (const other of this.state.players) {
          if (
            other.id === p.id ||
            distance(p, other) > 2.65 ||
            other.invincible > 0
          )
            continue;
          landed = true;
          const d = Math.max(0.01, distance(p, other));
          const nx = d > 0.01 ? (other.x - p.x) / d : 1,
            nz = (other.z - p.z) / d;
          other.x += nx * 1.7;
          other.z += nz * 1.7;
          other.stunned = 0.38;
          other.invincible = 1.1;
          this.keepOnFloor(other);
          if (this.state.carrier === other.id) {
            this.state.carrier = null;
            this.state.relic = { x: other.x, z: other.z };
            this.state.pickupAt = this.state.elapsed + 0.65;
            this.event("steal", p);
            p.stats.steals++;
            this.carryStreak.delete(other.id);
          }
        }
        if (landed) p.stats.pulseHits++;
        // Consume a discrete action. Held keyboard/touch never bypasses cooldown.
        if (received) received.value.pulse = false;
      }
    }
    if (
      !this.state.carrier &&
      this.state.elapsed >= this.state.pickupAt &&
      this.scoreDelay <= 0
    ) {
      const p = this.state.players.find(
        (p) => p.stunned <= 0 && distance(p, this.state.relic) < 1.05,
      );
      if (p) {
        this.state.carrier = p.id;
        p.stats.pickups++;
        this.carryStreak.set(p.id, 0);
        this.event("pickup", p);
      }
    }
    if (this.state.carrier) {
      const p = this.state.players.find((p) => p.id === this.state.carrier)!;
      this.state.relic = { x: p.x, z: p.z };
      if (distance(p, SHRINES[this.state.shrine]) < 1.3) {
        p.score += this.state.surge && this.state.time <= 30 ? 2 : 1;
        p.stats.deliveries++;
        p.stats.firstDelivery ??= ROUND_SECONDS - this.state.time;
        this.carryStreak.delete(p.id);
        this.event("score", p);
        this.state.carrier = null;
        this.state.relic = { x: 0, z: 0 };
        this.state.shrine = (this.state.shrine + 1) % 4;
        this.state.pickupAt = this.state.elapsed + 1.2;
        this.scoreDelay = 1.2;
      }
    }
  }

  snapshot(): Snapshot {
    return structuredClone(this.state);
  }
}
