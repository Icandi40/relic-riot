export const RUNNERS = [
  { name: "NOVA", color: "#44ded1", role: "The trailblazer" },
  { name: "EMBER", color: "#ff9454", role: "The firestarter" },
  { name: "VESPER", color: "#b88bff", role: "The night thief" },
  { name: "MOSS", color: "#b8e365", role: "The wild card" },
] as const;
export type Phase = "lobby" | "countdown" | "playing" | "finished";
export type Input = { x: number; z: number; pulse: boolean };
export type RoundStats = {
  deliveries: number;
  pickups: number;
  steals: number;
  pulses: number;
  pulseHits: number;
  carrySeconds: number;
  longestCarry: number;
  firstDelivery: number | null;
};
export const emptyStats = (): RoundStats => ({
  deliveries: 0,
  pickups: 0,
  steals: 0,
  pulses: 0,
  pulseHits: 0,
  carrySeconds: 0,
  longestCarry: 0,
  firstDelivery: null,
});
export const COSMETIC_IDS = [
  "classic",
  "gilded",
  "starlight",
  "royal",
] as const;
export type CosmeticId = (typeof COSMETIC_IDS)[number];
export const cleanCosmetic = (value: unknown): CosmeticId =>
  COSMETIC_IDS.includes(value as CosmeticId)
    ? (value as CosmeticId)
    : "classic";
export const QUICK_MESSAGES = {
  ready: "Ready!",
  nice: "Nice steal!",
  gg: "GG!",
  rematch: "One more round?",
  wow: "Legendary!",
} as const;
export type MessageKey = keyof typeof QUICK_MESSAGES;
export type RoomMessage = {
  id: number;
  playerId: string;
  name: string;
  text: string;
  at: number;
};
export type Player = {
  id: string;
  name: string;
  color: number;
  x: number;
  z: number;
  dx: number;
  dz: number;
  score: number;
  ready: boolean;
  cooldown: number;
  stunned: number;
  invincible: number;
  bot: boolean;
  cosmetic: CosmeticId;
  stats: RoundStats;
};
export type GameEvent = {
  id: number;
  kind: "pulse" | "steal" | "pickup" | "score" | "start" | "finish";
  player: string;
  x: number;
  z: number;
  at: number;
};
export type Snapshot = {
  phase: Phase;
  players: Player[];
  standings: Player[];
  carrier: string | null;
  relic: { x: number; z: number };
  shrine: number;
  time: number;
  countdown: number;
  elapsed: number;
  pickupAt: number;
  events: GameEvent[];
  round: number;
  matchId: string;
  surge: boolean;
  messages: RoomMessage[];
};
export const roundPlayers = (s: Snapshot) =>
  s.phase === "finished" ? s.standings : s.players;
export const ROUND_SECONDS = 180;
export const ARENA_RADIUS = 10.15;
export const PILLARS = [
  { x: -4.5, z: -3.3 },
  { x: 4.5, z: -3.3 },
  { x: -4.5, z: 3.3 },
  { x: 4.5, z: 3.3 },
];
export const SHRINES = [
  { x: 0, z: -7.6 },
  { x: 7.6, z: 0 },
  { x: 0, z: 7.6 },
  { x: -7.6, z: 0 },
];
export const cleanName = (value: unknown) =>
  typeof value === "string"
    ? value
        .replace(/[^\p{L}\p{N} _-]/gu, "")
        .trim()
        .slice(0, 14) || "RUNNER"
    : "RUNNER";
export const validColor = (color: unknown) =>
  Number.isInteger(color) && Number(color) >= 0 && Number(color) < 4
    ? Number(color)
    : 0;
export function cleanInput(raw: unknown): Input {
  if (!raw || typeof raw !== "object") return { x: 0, z: 0, pulse: false };
  const v = raw as Record<string, unknown>;
  return {
    x:
      typeof v.x === "number" && Number.isFinite(v.x)
        ? Math.max(-1, Math.min(1, v.x))
        : 0,
    z:
      typeof v.z === "number" && Number.isFinite(v.z)
        ? Math.max(-1, Math.min(1, v.z))
        : 0,
    pulse: v.pulse === true,
  };
}
