import { cleanCosmetic, emptyStats, roundPlayers } from "./types";
import type { CosmeticId, RoundStats, Snapshot } from "./types";

export const CAREER_KEY = "relic-riot-career-v1";
export const COSMETICS = [
  {
    id: "classic",
    name: "ORIGINAL",
    cost: 0,
    detail: "Your signature runner. Pure confidence.",
    motif: "◇",
  },
  {
    id: "gilded",
    name: "GILDED",
    cost: 120,
    detail: "An amber cloak sheen and golden mask.",
    motif: "✧",
  },
  {
    id: "starlight",
    name: "STARLIGHT",
    cost: 180,
    detail: "Leave a little constellation in your wake.",
    motif: "✦",
  },
  {
    id: "royal",
    name: "ROYAL",
    cost: 240,
    detail: "A floating crown and a gold nameplate.",
    motif: "♛",
  },
] as const;
export type CareerTotals = RoundStats & { matches: number; wins: number };
export type Career = {
  version: 1;
  shards: number;
  owned: CosmeticId[];
  equipped: CosmeticId;
  totals: CareerTotals;
  claimed: Record<string, number>;
  receipts: string[];
};
export const GOALS = [
  {
    id: "courier",
    name: "RELIC RUNNER",
    metric: "deliveries",
    base: 3,
    reward: 30,
    detail: "Deliver the relic to the active shrine.",
  },
  {
    id: "thief",
    name: "LIGHT FINGERS",
    metric: "steals",
    base: 5,
    reward: 40,
    detail: "Knock the relic loose from its carrier.",
  },
  {
    id: "regular",
    name: "ONE MORE ROUND",
    metric: "matches",
    base: 3,
    reward: 25,
    detail: "Finish online matches with your crew.",
  },
  {
    id: "champion",
    name: "TEMPLE CHAMPION",
    metric: "wins",
    base: 1,
    reward: 50,
    detail: "Finish an online match as the sole winner.",
  },
  {
    id: "precision",
    name: "PULSE PRECISION",
    metric: "pulseHits",
    base: 10,
    reward: 35,
    detail: "Land pulses on rival runners.",
  },
] as const;
export const freshCareer = (): Career => ({
  version: 1,
  shards: 0,
  owned: ["classic"],
  equipped: "classic",
  totals: { ...emptyStats(), matches: 0, wins: 0 },
  claimed: {},
  receipts: [],
});
const number = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.max(0, Math.min(1e9, v))
    : 0;
export function parseCareer(raw: string | null): Career {
  try {
    const data = JSON.parse(raw ?? "null");
    if (!data || data.version !== 1) return freshCareer();
    const c = freshCareer();
    c.shards = Math.floor(number(data.shards));
    c.owned = Array.from(
      new Set([
        "classic" as CosmeticId,
        ...(Array.isArray(data.owned) ? data.owned.map(cleanCosmetic) : []),
      ]),
    );
    c.equipped = c.owned.includes(cleanCosmetic(data.equipped))
      ? cleanCosmetic(data.equipped)
      : "classic";
    for (const key of Object.keys(c.totals) as (keyof CareerTotals)[]) {
      if (key !== "firstDelivery") c.totals[key] = number(data.totals?.[key]);
    }
    for (const goal of GOALS)
      c.claimed[goal.id] = Math.min(
        10000,
        Math.floor(number(data.claimed?.[goal.id])),
      );
    c.receipts = Array.isArray(data.receipts)
      ? data.receipts
          .filter((s: unknown) => typeof s === "string" && s.length < 100)
          .slice(-512)
      : [];
    return c;
  } catch {
    return freshCareer();
  }
}
export function loadCareer(): Career {
  try {
    return parseCareer(localStorage.getItem(CAREER_KEY));
  } catch {
    return freshCareer();
  }
}
export function saveCareer(c: Career): boolean {
  try {
    localStorage.setItem(CAREER_KEY, JSON.stringify(c));
    return true;
  } catch {
    return false;
  }
}
export function roundReward(s: Snapshot, id: string, practice: boolean) {
  const players = roundPlayers(s),
    p = players.find((p) => p.id === id);
  if (s.phase !== "finished" || !p || p.bot || practice || !s.matchId) return 0;
  const top = Math.max(...players.map((p) => p.score));
  const win =
    p.score === top && players.filter((p) => p.score === top).length === 1;
  return 20 + p.stats.deliveries * 5 + (win ? 25 : 0);
}
export function recordRound(
  c: Career,
  s: Snapshot,
  id: string,
  practice: boolean,
): Career {
  const reward = roundReward(s, id, practice);
  if (!reward || c.receipts.includes(s.matchId)) return c;
  const players = roundPlayers(s),
    p = players.find((p) => p.id === id)!;
  const next = structuredClone(c);
  next.shards += reward;
  next.receipts = [...c.receipts, s.matchId].slice(-512);
  next.totals.matches++;
  const top = Math.max(...players.map((p) => p.score));
  if (p.score === top && players.filter((p) => p.score === top).length === 1)
    next.totals.wins++;
  for (const key of [
    "deliveries",
    "pickups",
    "steals",
    "pulses",
    "pulseHits",
    "carrySeconds",
  ] as const)
    next.totals[key] += p.stats[key];
  next.totals.longestCarry = Math.max(
    next.totals.longestCarry,
    p.stats.longestCarry,
  );
  return next;
}
export function goalProgress(c: Career, id: string) {
  const g = GOALS.find((g) => g.id === id)!;
  const tier = (c.claimed[id] ?? 0) + 1;
  return {
    tier,
    target: g.base * tier,
    current: c.totals[g.metric],
    reward: g.reward * tier,
  };
}
export function claimGoal(c: Career, id: string): Career {
  if (!GOALS.some((g) => g.id === id)) return c;
  const goal = goalProgress(c, id);
  if (goal.current < goal.target) return c;
  return {
    ...c,
    shards: c.shards + goal.reward,
    claimed: { ...c.claimed, [id]: goal.tier },
  };
}
export function purchase(c: Career, id: CosmeticId): Career {
  const item = COSMETICS.find((x) => x.id === id);
  if (!item || c.owned.includes(id) || c.shards < item.cost) return c;
  return {
    ...c,
    shards: c.shards - item.cost,
    owned: [...c.owned, id],
    equipped: id,
  };
}
export function equip(c: Career, id: CosmeticId): Career {
  return c.owned.includes(id) ? { ...c, equipped: id } : c;
}
export function roundAwards(
  s: Snapshot,
): { name: string; player: string; detail: string }[] {
  const awards: { name: string; player: string; detail: string }[] = [];
  const best = (
    key: "steals" | "longestCarry" | "deliveries",
    name: string,
    suffix: string,
  ) => {
    const sorted = [...roundPlayers(s)].sort(
      (a, b) => b.stats[key] - a.stats[key],
    );
    const p = sorted[0];
    if (
      p &&
      p.stats[key] > 0 &&
      (!sorted[1] || sorted[1].stats[key] < p.stats[key])
    )
      awards.push({
        name,
        player: p.name,
        detail: `${key === "longestCarry" ? p.stats[key].toFixed(1) : p.stats[key]} ${suffix}`,
      });
  };
  best("steals", "BEST THIEF", "steals");
  best("longestCarry", "IRON GRIP", "seconds held");
  best("deliveries", "SPECIAL DELIVERY", "deliveries");
  return awards;
}
