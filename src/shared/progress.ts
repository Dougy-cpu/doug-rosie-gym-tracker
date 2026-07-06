export type QuoteContext =
  | "idle"
  | "first-workout"
  | "momentum"
  | "one-more"
  | "individual-complete"
  | "couple"
  | "couple-complete";

export type ProgressScope = "personal" | "couple";

export function getProgressTone(count: number, scope: ProgressScope) {
  const capped = Math.max(0, count);

  if (scope === "couple") {
    if (capped >= 8) {
      return {
        quoteContext: "couple-complete" as const,
        intensity: "complete" as const,
        headline: "Couple Week Complete",
        subcopy: "Household objective complete.",
        accent: "gold" as const
      };
    }

    return {
      quoteContext: "couple" as const,
      intensity: capped >= 6 ? ("pressure" as const) : capped >= 4 ? ("momentum" as const) : ("idle" as const),
      headline: "Couple Progress",
      subcopy: "Two people. Eight sessions. Zero nonsense.",
      accent: capped >= 6 ? ("red" as const) : capped >= 4 ? ("orange" as const) : ("pink" as const)
    };
  }

  if (capped >= 4) {
    return {
      quoteContext: "individual-complete" as const,
      intensity: "complete" as const,
      headline: "Weekly Target Complete",
      subcopy: "Four banked. Week handled.",
      accent: "gold" as const
    };
  }

  if (capped === 3) {
    return {
      quoteContext: "one-more" as const,
      intensity: "pressure" as const,
      headline: "One More",
      subcopy: "Finish the week.",
      accent: "red" as const
    };
  }

  if (capped === 2) {
    return {
      quoteContext: "momentum" as const,
      intensity: "momentum" as const,
      headline: "Momentum",
      subcopy: "Halfway to target.",
      accent: "orange" as const
    };
  }

  if (capped === 1) {
    return {
      quoteContext: "first-workout" as const,
      intensity: "first" as const,
      headline: "Inertia Broken",
      subcopy: "Week is live.",
      accent: "lime" as const
    };
  }

  return {
    quoteContext: "idle" as const,
    intensity: "idle" as const,
    headline: "Target Waiting",
    subcopy: "The week does not care about your mood.",
    accent: "neutral" as const
  };
}
