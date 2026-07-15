import { Crown, Flame, ShieldCheck } from "lucide-react";
import type { AchievementEvent, TrackerState, UserSlug } from "../../shared/types.js";
import { getCoupleClaimCopy } from "../coupleClaim";

interface CoupleClaimCardProps {
  achievement: AchievementEvent;
  state: TrackerState;
  viewer: UserSlug;
  claiming: boolean;
  preview?: boolean;
  onClaim: () => void;
}

export function CoupleClaimCard({ achievement, state, viewer, claiming, preview = false, onClaim }: CoupleClaimCardProps) {
  const copy = getCoupleClaimCopy(achievement, viewer);
  const viewerUser = state.users.find((user) => user.slug === viewer);
  const triggerUser = state.users.find((user) => user.id === achievement.triggeringUserId);

  return (
    <main className={preview ? "claim-gate claim-gate-preview" : "claim-gate"} aria-labelledby="couple-claim-title">
      <div className="claim-grid" aria-hidden="true" />
      <section className="couple-claim-card reward-crate">
        <div className="claim-arm-strip" aria-hidden="true"><span />REWARD CRATE // ARMED<span /></div>
        <div className="claim-crown" aria-hidden="true">
          <Crown />
        </div>
        <p className="achievement-kicker">{viewerUser?.displayName ?? "You"}, this landed while you were away</p>
        <h1 id="couple-claim-title">{copy.title}</h1>
        <strong>8 / 8</strong>
        <div className="claim-pair" aria-label="Doug and Rosie completed four workouts each">
          <span>Doug <b>{state.counts.doug.week} / 4</b></span>
          <ShieldCheck aria-hidden="true" />
          <span>Rosie <b>{state.counts.rosie.week} / 4</b></span>
        </div>
        <p>{copy.body}</p>
        {triggerUser ? <small>{triggerUser.displayName} finished the household objective.</small> : null}
        <button type="button" disabled={claiming} onClick={onClaim}>
          <Flame aria-hidden="true" />
          {claiming ? "ARMING THE OVERREACTION..." : copy.button}
        </button>
        <div className="claim-crate-status" aria-hidden="true">
          <span>COUPLE REWARD</span><b>UNCLAIMED</b><span>FULL VOLUME</span>
        </div>
      </section>
    </main>
  );
}
