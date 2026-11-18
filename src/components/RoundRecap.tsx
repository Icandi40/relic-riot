import { Diamond, Medal } from "lucide-react";
import { roundAwards, roundReward } from "../game/career";
import type { SessionView } from "../game/network";
import { roundPlayers } from "../game/types";

export function RoundRecap({ view }: { view: SessionView }) {
  const me = roundPlayers(view.snapshot).find((p) => p.id === view.localId)!;
  const stats = me.stats,
    awards = roundAwards(view.snapshot),
    reward = roundReward(view.snapshot, view.localId, view.practice);
  return (
    <section className="round-recap" aria-label="Your round recap">
      <div className="recap-title">
        <strong>YOUR ROUND, IN DETAIL</strong>
        <span>{view.snapshot.surge ? "RELIC SURGE" : "CLASSIC"}</span>
      </div>
      <div className="recap-metrics">
        {[
          ["DELIVERIES", stats.deliveries],
          ["STEALS", stats.steals],
          ["PULSES LANDED", `${stats.pulseHits}/${stats.pulses}`],
          [
            "ACCURACY",
            stats.pulses
              ? `${Math.round((stats.pulseHits / stats.pulses) * 100)}%`
              : "—",
          ],
          ["RELIC HELD", `${stats.carrySeconds.toFixed(1)}s`],
          [
            "FIRST DELIVERY",
            stats.firstDelivery === null
              ? "—"
              : `${stats.firstDelivery.toFixed(1)}s`,
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {awards.length > 0 && (
        <div className="round-awards">
          {awards.map((a) => (
            <div key={a.name}>
              <Medal size={17} />
              <span>
                <strong>
                  {a.name} · {a.player}
                </strong>
                <small>{a.detail}</small>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="round-reward">
        <Diamond size={19} />
        <span>
          {view.practice
            ? "PRACTICE MAKES LEGENDARY."
            : `+${reward} RELIC SHARDS`}
        </span>
        <small>
          {view.practice
            ? "Online matches earn career progress and shards."
            : "Added once to your device-local career."}
        </small>
      </div>
    </section>
  );
}
