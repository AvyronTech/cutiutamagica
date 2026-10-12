import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Cake, MessageSquareText, Share2, Sparkles, UserRound } from "lucide-react";

type RewardActivity = {
  code: string;
  name: string;
  description: string;
  stars: number;
  periodLimit: number;
};

type MagicRewardsSpotlightProps = {
  program: Record<string, string | number | null> | null;
  activities: RewardActivity[];
};

const icons = {
  account_created: UserRound,
  review_approved: MessageSquareText,
  social_share: Share2,
  birthday_bonus: Cake,
} as const;

export function MagicRewardsSpotlight({ program, activities }: MagicRewardsSpotlightProps) {
  const highlights = ["account_created", "review_approved", "social_share", "birthday_bonus"]
    .map((code) => activities.find((activity) => activity.code === code))
    .filter((activity): activity is RewardActivity => Boolean(activity));
  const threshold = Number(program?.redemption_threshold ?? 5);
  const rewardLei = Number(program?.reward_bani ?? 500) / 100;

  return (
    <section className="landing-rewards" aria-labelledby="landing-rewards-title">
      <div className="landing-rewards__intro">
        <span className="landing-rewards__mark" aria-hidden>
          <Sparkles />
        </span>
        <div>
          <p className="scene-eyebrow">Magic Rewards</p>
          <h2 id="landing-rewards-title">Gesturile mici îți fac următoarea poveste mai ușoară.</h2>
          <p>
            Creezi un cont, iar stelele se strâng automat. {threshold} stele înseamnă {rewardLei}{" "}
            lei pentru următoarea comandă.
          </p>
        </div>
      </div>
      <div className="landing-rewards__activities" aria-label="Activități Magic Rewards">
        {highlights.map((activity) => {
          const Icon = icons[activity.code as keyof typeof icons];
          return (
            <span key={activity.code}>
              {Icon ? <Icon aria-hidden /> : null}
              <strong>+{activity.stars} ✦</strong>
              {activity.name}
              {activity.code === "social_share" && activity.periodLimit > 0 ? (
                <small>max. {activity.periodLimit}/zi</small>
              ) : null}
            </span>
          );
        })}
      </div>
      <div className="landing-rewards__actions">
        <Link className="magic-button" to="/cont">
          Creează-ți contul <ArrowUpRight aria-hidden />
        </Link>
        <Link to="/magic-rewards">Vezi toate activitățile</Link>
      </div>
    </section>
  );
}
