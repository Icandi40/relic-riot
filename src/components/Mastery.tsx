import { useEffect, useRef, useState } from "react";
import { Check, Diamond, LockKeyhole, Sparkles, Trophy, X } from "lucide-react";
import { COSMETICS, GOALS, goalProgress } from "../game/career";
import type { Career } from "../game/career";
import type { CosmeticId } from "../game/types";
import { Portrait } from "./Interface";

export function Mastery({
  career,
  color,
  storageOK,
  onClose,
  onClaim,
  onPurchase,
  onEquip,
}: {
  career: Career;
  color: number;
  storageOK: boolean;
  onClose: () => void;
  onClaim: (id: string) => void;
  onPurchase: (id: CosmeticId) => void;
  onEquip: (id: CosmeticId) => void;
}) {
  const [tab, setTab] = useState<"challenges" | "wardrobe" | "career">(
    "challenges",
  );
  const [notice, setNotice] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const nodes = root.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  const rank =
    career.totals.matches >= 30
      ? "TEMPLE LEGEND"
      : career.totals.matches >= 10
        ? "VAULT VETERAN"
        : "ROOKIE RUNNER";
  return (
    <div
      className="modal-backdrop mastery-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="mastery-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mastery-title"
        ref={root}
      >
        <button
          className="close-button icon-button"
          onClick={onClose}
          aria-label="Close mastery"
        >
          <X />
        </button>
        <div className="mastery-heading">
          <div className={`mastery-portrait look-${career.equipped}`}>
            <Portrait color={color} />
            <Sparkles />
          </div>
          <div>
            <span className="mastery-rank">{rank}</span>
            <h2 id="mastery-title">
              MAKE EVERY
              <br />
              <em>RIOT COUNT.</em>
            </h2>
          </div>
          <div className="shard-balance">
            <Diamond size={18} />
            <strong data-testid="shard-balance">{career.shards}</strong>
            <span>RELIC SHARDS</span>
          </div>
        </div>
        <nav className="mastery-tabs" aria-label="Mastery sections">
          {(["challenges", "wardrobe", "career"] as const).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setNotice("");
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </nav>
        <div className="mastery-body">
          {tab === "challenges" && (
            <>
              <p className="mastery-intro">
                A little ambition. A lot of shiny things.
                <span>
                  Finish online rounds to earn 20 shards, +5 per delivery, and
                  +25 for a solo win. Practice earns no career rewards.
                </span>
              </p>
              <div className="challenge-list">
                {GOALS.map((g, i) => {
                  const p = goalProgress(career, g.id),
                    ready = p.current >= p.target;
                  return (
                    <div
                      className={`challenge-row ${ready ? "claimable" : ""}`}
                      key={g.id}
                    >
                      <div className="challenge-number">0{i + 1}</div>
                      <div className="challenge-main">
                        <div>
                          <strong>{g.name}</strong>
                          <small>LEVEL {p.tier}</small>
                        </div>
                        <p>{g.detail}</p>
                        <progress
                          max={p.target}
                          value={Math.min(p.current, p.target)}
                          aria-label={`${g.name} progress`}
                        />
                        <span>
                          {p.current.toLocaleString()} /{" "}
                          {p.target.toLocaleString()}
                        </span>
                      </div>
                      <button
                        data-testid={`claim-${g.id}`}
                        className={ready ? "primary" : "challenge-reward"}
                        disabled={!ready}
                        onClick={() => {
                          onClaim(g.id);
                          setNotice(
                            `${g.name} claimed. +${p.reward} Relic Shards. Next level unlocked.`,
                          );
                        }}
                      >
                        {ready ? "CLAIM" : <LockKeyhole size={13} />}
                        <span>+{p.reward} ◆</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {tab === "wardrobe" && (
            <>
              <p className="mastery-intro">
                Look legendary. Play fair.
                <span>
                  Every look is cosmetic. Speed, pulse range, and scoring stay
                  identical. Equipped looks appear in your next room or practice
                  run.
                </span>
              </p>
              <div className="cosmetic-grid">
                {COSMETICS.map((item) => {
                  const owned = career.owned.includes(item.id),
                    equipped = career.equipped === item.id;
                  return (
                    <article
                      className={`cosmetic-card look-${item.id} ${equipped ? "equipped" : ""}`}
                      key={item.id}
                    >
                      <div className="cosmetic-preview">
                        <Portrait color={color} />
                        <b aria-hidden="true">{item.motif}</b>
                      </div>
                      <div className="cosmetic-info">
                        <h3>{item.name}</h3>
                        <p>{item.detail}</p>
                        <button
                          className={equipped ? "outline" : "primary"}
                          disabled={
                            equipped || (!owned && career.shards < item.cost)
                          }
                          onClick={() => {
                            owned ? onEquip(item.id) : onPurchase(item.id);
                            setNotice(
                              `${item.name} equipped for your next room.`,
                            );
                          }}
                        >
                          {equipped ? (
                            <>
                              <Check size={15} />
                              EQUIPPED
                            </>
                          ) : owned ? (
                            "EQUIP"
                          ) : (
                            <>UNLOCK · {item.cost} ◆</>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {tab === "career" && (
            <>
              <p className="mastery-intro">
                Your story in the Sky Temple.
                <span>
                  Only completed online rounds count. Totals belong to this
                  browser, not a global leaderboard.
                </span>
              </p>
              <div className="career-grid">
                {[
                  ["MATCHES", career.totals.matches],
                  ["WINS", career.totals.wins],
                  ["DELIVERIES", career.totals.deliveries],
                  ["STEALS", career.totals.steals],
                  [
                    "PULSE ACCURACY",
                    career.totals.pulses
                      ? `${Math.round((career.totals.pulseHits / career.totals.pulses) * 100)}%`
                      : "—",
                  ],
                  [
                    "LONGEST CARRY",
                    `${career.totals.longestCarry.toFixed(1)}s`,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="career-note">
                <Trophy size={24} />
                <p>
                  Build a career one good round at a time.
                  <span>Shards unlock looks. They never buy an advantage.</span>
                </p>
              </div>
            </>
          )}
        </div>
        <div className="mastery-notice" role="status">
          {notice}
        </div>
        <footer className="mastery-footer">
          <span className={storageOK ? "" : "storage-warning"}>
            {storageOK
              ? "SAVED ON THIS DEVICE"
              : "STORAGE UNAVAILABLE · THIS SESSION ONLY"}
          </span>
          <span>No account needed. Clearing browser data resets progress.</span>
        </footer>
      </div>
    </div>
  );
}
