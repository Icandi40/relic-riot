export const RUNNERS = [
  { name: "NOVA", color: "#44ded1", role: "The trailblazer" },
  { name: "EMBER", color: "#ff9454", role: "The firestarter" },
  { name: "VESPER", color: "#b88bff", role: "The night thief" },
  { name: "MOSS", color: "#b8e365", role: "The wild card" },
] as const;
export type Phase = "lobby" | "countdown" | "playing" | "finished";
export type Input = { x: number; z: number; pulse: boolean };
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
  carrier: string | null;
  relic: { x: number; z: number };
  shrine: number;
  time: number;
  countdown: number;
  elapsed: number;
  pickupAt: number;
  events: GameEvent[];
  round: number;
};
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
