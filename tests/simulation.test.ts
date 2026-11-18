import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { ARENA_RADIUS, PILLARS, SHRINES, cleanInput } from "../src/game/types";

function match() {
  const s = new Simulation();
  s.addPlayer("a", "SHEENA", 0);
  s.addPlayer("b", "RIVAL", 1);
  s.setReady("a", true);
  s.setReady("b", true);
  assert.equal(s.start(), true);
  for (let i = 0; i < 181; i++) s.step(1 / 60);
  return s;
}
test("a match requires two actual ready participants", () => {
  const s = new Simulation();
  s.addPlayer("a", "A", 0);
  s.setReady("a", true);
  assert.equal(s.start(), false);
  s.addPlayer("b", "B", 0);
  assert.equal(s.start(), false);
  assert.notEqual(s.state.players[0].color, s.state.players[1].color);
  s.setReady("b", true);
  assert.equal(s.start(), true);
});
test("movement is bounded; malformed and oversized input cannot teleport or poison state", () => {
  const s = match();
  const p = s.state.players[0];
  for (let i = 0; i < 600; i++) {
    s.input("a", { x: 99999, z: -99999, pulse: false });
    s.step(1 / 60);
  }
  assert.ok(Math.hypot(p.x, p.z) <= ARENA_RADIUS + 0.001);
  assert.deepEqual(cleanInput({ x: NaN, z: Infinity, pulse: "true" }), {
    x: 0,
    z: 0,
    pulse: false,
  });
  s.input("unknown", { x: 1 });
  s.step(1 / 60);
  assert.ok(Number.isFinite(p.x));
});
test("columns are solid and diagonal movement is normalized", () => {
  const s = match();
  const p = s.state.players[0];
  p.x = PILLARS[0].x - 1.2;
  p.z = PILLARS[0].z;
  s.input("a", { x: 1, z: 0 });
  s.step(0.05);
  assert.ok(Math.hypot(p.x - PILLARS[0].x, p.z - PILLARS[0].z) >= 1.129);
  p.x = 0;
  p.z = 5;
  s.input("a", { x: 1, z: 1 });
  s.step(0.05);
  assert.ok(Math.abs(Math.hypot(p.x, p.z - 5) - 5.4 * 0.05) < 0.001);
});
test("stale inputs stop motion after a disconnected input stream", () => {
  const s = match();
  const p = s.state.players[0];
  p.x = 0;
  p.z = 5;
  s.input("a", { x: 1, z: 0 });
  for (let i = 0; i < 60; i++) s.step(1 / 60);
  const x = p.x;
  for (let i = 0; i < 60; i++) s.step(1 / 60);
  assert.equal(p.x, x);
});
test("relic pickup, delivery and shrine rotation happen only at the right locations", () => {
  const s = match();
  const p = s.state.players[0];
  p.x = 0;
  p.z = 0;
  s.step(1 / 60);
  assert.equal(s.state.carrier, "a");
  assert.equal(p.score, 0);
  p.x = SHRINES[0].x;
  p.z = SHRINES[0].z;
  s.step(1 / 60);
  assert.equal(p.score, 1);
  assert.equal(s.state.carrier, null);
  assert.equal(s.state.shrine, 1);
  assert.deepEqual(s.state.relic, { x: 0, z: 0 });
});
test("pulse drops the relic, applies protection and cannot bypass its cooldown", () => {
  const s = match();
  const [a, b] = s.state.players;
  a.x = 0;
  a.z = 0;
  b.x = 2;
  b.z = 0;
  s.step(1 / 60);
  assert.equal(s.state.carrier, "a");
  s.input("b", { x: 0, z: 0, pulse: true });
  s.step(1 / 60);
  assert.equal(s.state.carrier, null);
  assert.ok(a.invincible > 0);
  assert.ok(a.stunned > 0);
  const events = s.state.events.filter((e) => e.kind === "pulse").length;
  s.input("b", { pulse: true });
  s.step(1 / 60);
  assert.equal(s.state.events.filter((e) => e.kind === "pulse").length, events);
  assert.ok(b.cooldown > 3);
});
test("three-minute matches finish and a rematch resets the game", () => {
  const s = match();
  s.state.time = 0.01;
  s.state.players[0].score = 7;
  s.step(0.02);
  assert.equal(s.state.phase, "finished");
  assert.equal(s.state.time, 0);
  assert.equal(s.start(), false);
  s.setReady("a", true);
  s.setReady("b", true);
  assert.equal(s.start(), true);
  assert.equal(s.state.phase, "countdown");
  assert.equal(s.state.players[0].score, 0);
  assert.equal(s.state.time, 180);
});
test("leaving during a round safely returns the last runner to the lobby", () => {
  const s = match();
  s.state.carrier = "b";
  s.removePlayer("b");
  assert.equal(s.state.carrier, null);
  assert.equal(s.state.phase, "lobby");
  assert.equal(s.state.players[0].ready, false);
});
test("rooms enforce capacity and refuse mid-round new participants", () => {
  const s = new Simulation();
  for (let i = 0; i < 4; i++)
    assert.equal(s.addPlayer(String(i), "RUNNER", i), true);
  assert.equal(s.addPlayer("5", "EXTRA", 0), false);
  const running = match();
  assert.equal(running.addPlayer("late", "LATE", 0), false);
});
test("snapshots do not allow external mutation of the simulation", () => {
  const s = match();
  const snapshot = s.snapshot();
  snapshot.players[0].score = 999;
  assert.equal(s.state.players[0].score, 0);
});
test("a pulse press survives later movement packets until the simulation consumes it", () => {
  const s = match();
  s.input("a", { x: 0, z: 0, pulse: true });
  s.input("a", { x: 1, z: 0, pulse: false });
  s.step(1 / 60);
  assert.ok(s.state.players[0].cooldown > 3.4);
  assert.equal(s.state.events.filter((e) => e.kind === "pulse").length, 1);
  s.input("a", { pulse: true });
  s.step(1 / 60);
  assert.equal(s.state.events.filter((e) => e.kind === "pulse").length, 1);
});
test("round statistics track pickups, actual steals, successful pulses and carry streaks", () => {
  const s = match();
  const [a, b] = s.state.players;
  a.x = 0;
  a.z = 0;
  b.x = 2;
  b.z = 0;
  s.step(0.02);
  assert.equal(a.stats.pickups, 1);
  s.step(0.5);
  assert.equal(a.stats.carrySeconds, 0.5);
  s.input("b", { pulse: true });
  s.step(0.02);
  assert.equal(b.stats.pulses, 1);
  assert.equal(b.stats.pulseHits, 1);
  assert.equal(b.stats.steals, 1);
  assert.equal(a.stats.longestCarry, 0.52);
  s.step(4);
  s.input("b", { pulse: true });
  b.x = 8;
  b.z = 0;
  s.step(0.02);
  assert.equal(b.stats.pulses, 2);
  assert.equal(b.stats.pulseHits, 1);
  assert.equal(b.stats.steals, 1);
});
test("one pulse hitting several rivals counts as one successful pulse", () => {
  const s = new Simulation();
  for (let i = 0; i < 3; i++) {
    s.addPlayer(String(i), "RUNNER", i);
    s.setReady(String(i), true);
  }
  s.start();
  s.step(3);
  s.state.players.forEach((p, i) => {
    p.x = i * 0.8;
    p.z = 0;
  });
  s.input("0", { pulse: true });
  s.step(0.02);
  assert.equal(s.state.players[0].stats.pulses, 1);
  assert.equal(s.state.players[0].stats.pulseHits, 1);
});
test("delivery statistics are independent of double points; classic and surge boundary are deterministic", () => {
  for (const [surge, time, points] of [
    [false, 20, 1],
    [true, 31, 1],
    [true, 30.01, 2],
  ] as const) {
    const s = match();
    s.state.surge = surge;
    const a = s.state.players[0];
    a.x = 0;
    a.z = 0;
    s.step(0.02);
    a.x = SHRINES[0].x;
    a.z = SHRINES[0].z;
    s.state.time = time;
    s.step(0.02);
    assert.equal(a.score, points);
    assert.equal(a.stats.deliveries, 1);
    assert.ok(Math.abs(a.stats.firstDelivery! - (180 - time + 0.02)) < 0.00001);
  }
  const s = match(),
    a = s.state.players[0];
  s.state.carrier = a.id;
  a.x = 0;
  a.z = -7.6;
  s.state.time = 0.01;
  s.step(0.02);
  assert.equal(a.score, 0);
  assert.equal(s.state.phase, "finished");
});
test("changing the lobby mode resets readiness; a live round locks mode and resets counters on rematch", () => {
  const s = new Simulation();
  s.addPlayer("a", "A", 0);
  s.addPlayer("b", "B", 1);
  s.setReady("a", true);
  s.setReady("b", true);
  s.setSurge(true);
  assert.ok(s.state.players.every((p) => !p.ready));
  assert.equal(s.start(), false);
  s.setReady("a", true);
  s.setReady("b", true);
  s.start();
  const id = s.state.matchId;
  assert.equal(s.setSurge(false), false);
  assert.equal(s.state.surge, true);
  s.step(3);
  s.state.players[0].stats.deliveries = 4;
  s.step(180);
  s.setReady("a", true);
  s.setReady("b", true);
  s.start();
  assert.notEqual(s.state.matchId, id);
  assert.equal(s.state.players[0].stats.deliveries, 0);
});
test("quick messages bind identity, accept only presets, rate limit and keep a bounded history", () => {
  const s = new Simulation();
  s.addPlayer("a", "SHEENA", 0);
  assert.equal(s.message("unknown", "gg"), false);
  assert.equal(s.message("a", "__proto__"), false);
  assert.equal(s.message("a", "<script>"), false);
  assert.equal(s.message("a", "gg"), true);
  assert.equal(s.message("a", "ready"), false);
  assert.equal(s.state.messages[0].name, "SHEENA");
  assert.equal(s.state.messages[0].text, "GG!");
  for (let i = 0; i < 12; i++) {
    s.step(2);
    assert.equal(s.message("a", "nice"), true);
  }
  assert.equal(s.state.messages.length, 8);
});
test("late arrivals cannot collect rewards for a completed match", () => {
  const s = match();
  s.step(180);
  assert.equal(s.state.phase, "finished");
  assert.equal(s.addPlayer("late", "LATE", 2), true);
  assert.equal(s.state.phase, "lobby");
  assert.equal(s.state.matchId, "");
  assert.ok(s.state.players.every((p) => !p.ready));
});
test("cosmetics never change movement or pulse mechanics", () => {
  const s = new Simulation();
  s.addPlayer("a", "A", 0, false, "royal");
  s.addPlayer("b", "B", 1, false, "gilded");
  s.addPlayer("c", "C", 2, false, "starlight");
  s.addPlayer("d", "D", 3, false, "injected");
  assert.equal(s.state.players[3].cosmetic, "classic");
  s.state.players.forEach((p) => s.setReady(p.id, true));
  s.start();
  s.step(3);
  s.state.players.forEach((p, i) => {
    p.x = -6 + i * 4;
    p.z = 5;
    s.input(p.id, { x: 0, z: 1, pulse: true });
  });
  s.step(0.05);
  s.state.players.forEach((p) => {
    assert.ok(Math.abs(p.z - 5 - 0.27) < 0.0001);
    assert.equal(p.cooldown, 3.5);
  });
});
test("fresh input after a stalled frame remains usable while genuinely stale packets expire", () => {
  let now = 0;
  const s = new Simulation(() => now);
  s.addPlayer("a", "A", 0);
  s.addPlayer("b", "B", 1);
  s.setReady("a", true);
  s.setReady("b", true);
  s.start();
  now = 3;
  s.step(3);
  const a = s.state.players[0];
  a.x = 0;
  a.z = 5;
  now = 3.01; // input arrives, then rendering blocks before the next tick
  s.input("a", { x: 1, z: 0 });
  now = 4;
  s.step(1);
  assert.equal(a.x, 0.27); // fresh packet, bounded 50ms displacement
  now = 5;
  s.step(1);
  assert.equal(a.x, 0.27); // no new packet, no movement
});
