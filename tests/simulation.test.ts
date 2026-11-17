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
