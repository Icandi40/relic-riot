import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshCareer,
  parseCareer,
  recordRound,
  roundReward,
  claimGoal,
  goalProgress,
  purchase,
  equip,
  roundAwards,
} from "../src/game/career";
import { Simulation } from "../src/game/simulation";
function completed() {
  const s = new Simulation();
  s.addPlayer("a", "SHEENA", 0);
  s.addPlayer("b", "RIVAL", 1);
  s.setReady("a", true);
  s.setReady("b", true);
  s.start();
  s.step(3);
  s.step(180);
  const snapshot = s.snapshot();
  snapshot.players = snapshot.standings; // mutable award fixture, not live state
  return snapshot;
}
test("career parsing recovers from malformed data and refuses unowned equipment", () => {
  assert.deepEqual(parseCareer("{broken"), freshCareer());
  const c = parseCareer(
    JSON.stringify({
      ...freshCareer(),
      shards: -9,
      owned: ["classic", "injected"],
      equipped: "royal",
      totals: { matches: "oops", steals: -10 },
    }),
  );
  assert.equal(c.shards, 0);
  assert.equal(c.equipped, "classic");
  assert.deepEqual(c.owned, ["classic"]);
  assert.equal(c.totals.matches, 0);
  assert.equal(c.totals.steals, 0);
});
test("only completed online rounds earn rewards; tied leaders do not earn win bonuses", () => {
  const s = completed();
  assert.equal(roundReward(s, "a", false), 20);
  assert.equal(roundReward(s, "a", true), 0);
  assert.equal(roundReward({ ...s, phase: "playing" }, "a", false), 0);
  assert.equal(roundReward(s, "unknown", false), 0);
  s.players[0].stats.deliveries = 2;
  s.players[0].score = 4;
  assert.equal(roundReward(s, "a", false), 55);
  s.players[1].score = 4;
  assert.equal(roundReward(s, "a", false), 30);
});
test("repeated snapshots and reloads cannot pay the same round twice; a rematch has a new receipt", () => {
  const s = completed();
  const first = recordRound(freshCareer(), s, "a", false);
  assert.equal(first.shards, 20);
  assert.equal(first.totals.matches, 1);
  assert.equal(recordRound(first, s, "a", false), first);
  const restored = parseCareer(JSON.stringify(first));
  assert.equal(recordRound(restored, s, "a", false), restored);
  const next = recordRound(
    restored,
    { ...s, matchId: crypto.randomUUID() },
    "a",
    false,
  );
  assert.equal(next.shards, 40);
  assert.equal(next.totals.matches, 2);
});
test("career adds actual round metrics and preserves the longest carry", () => {
  const s = completed();
  Object.assign(s.players[0].stats, {
    deliveries: 3,
    steals: 2,
    pulses: 5,
    pulseHits: 4,
    carrySeconds: 21,
    longestCarry: 12,
  });
  s.players[0].score = 3;
  const c = recordRound(freshCareer(), s, "a", false);
  assert.equal(c.totals.wins, 1);
  assert.equal(c.totals.deliveries, 3);
  assert.equal(c.totals.pulseHits, 4);
  assert.equal(c.totals.longestCarry, 12);
  s.matchId = crypto.randomUUID();
  s.players[0].stats.longestCarry = 5;
  assert.equal(recordRound(c, s, "a", false).totals.longestCarry, 12);
});
test("challenge claims require a real threshold and unlock progressively harder tiers", () => {
  const c = freshCareer();
  assert.equal(claimGoal(c, "courier"), c);
  assert.equal(claimGoal(c, "missing"), c);
  c.totals.deliveries = 3;
  const next = claimGoal(c, "courier");
  assert.equal(next.shards, 30);
  assert.equal(next.claimed.courier, 1);
  assert.deepEqual(goalProgress(next, "courier"), {
    tier: 2,
    target: 6,
    current: 3,
    reward: 60,
  });
  assert.equal(claimGoal(next, "courier"), next);
  next.totals.deliveries = 6;
  assert.equal(claimGoal(next, "courier").shards, 90);
});
test("cosmetics require sufficient shards, charge once, and only owned items can be equipped", () => {
  const c = freshCareer();
  assert.equal(purchase(c, "royal"), c);
  assert.equal(equip(c, "royal"), c);
  c.shards = 200;
  const next = purchase(c, "gilded");
  assert.equal(next.shards, 80);
  assert.equal(next.equipped, "gilded");
  assert.equal(purchase(next, "gilded"), next);
  const changed = equip(next, "classic");
  assert.equal(changed.equipped, "classic");
  assert.equal(changed.shards, 80);
  assert.equal(parseCareer(JSON.stringify(next)).equipped, "gilded");
});
test("awards are earned by positive, untied statistics rather than invented on empty rounds", () => {
  const s = completed();
  assert.deepEqual(roundAwards(s), []);
  s.players[0].stats.steals = 3;
  assert.deepEqual(roundAwards(s), [
    { name: "BEST THIEF", player: "SHEENA", detail: "3 steals" },
  ]);
  s.players[1].stats.steals = 3;
  assert.deepEqual(roundAwards(s), []);
});
test("departing after the finish cannot rewrite a draw, award or reward", () => {
  const s = new Simulation();
  s.addPlayer("a", "A", 0);
  s.addPlayer("b", "B", 1);
  s.setReady("a", true);
  s.setReady("b", true);
  s.start();
  s.step(3);
  s.step(180);
  const before = roundReward(s.snapshot(), "a", false);
  s.removePlayer("b");
  assert.equal(s.state.players.length, 1);
  assert.equal(s.state.standings.length, 2);
  assert.equal(roundReward(s.snapshot(), "a", false), before);
  assert.equal(before, 20);
  s.state.players[0].stats.steals = 99;
  assert.deepEqual(roundAwards(s.snapshot()), []);
});
