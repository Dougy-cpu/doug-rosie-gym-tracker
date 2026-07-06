import type { QuoteContext } from "../shared/progress.js";

export const quoteBanks: Record<QuoteContext, string[]> = {
  idle: [
    "Your excuses have had enough attention.",
    "The sofa is not your friend. It is upholstered sabotage.",
    "You are not resting. You are negotiating with failure.",
    "Nobody ever got fitter by thinking really hard about the gym.",
    "The gym called. It said stop being weird.",
    "Your future self is filing a complaint.",
    "The lazy version of you is making a very convincing case. Ignore it.",
    "The week does not care about your mood.",
    "Your standards are watching.",
    "You made the app. Now the app wants evidence.",
    "That gym bag is not decorative.",
    "Stop giving your comfort zone a board seat.",
    "The hardest set is leaving the house. Embarrassing, but true.",
    "Your excuses are in better shape than you.",
    "This is not fatigue. This is a branding issue.",
    "The calendar has receipts.",
    "Your intentions are not getting logged.",
    "The mirror does not accept verbal commitments.",
    "If you can scroll, you can train.",
    "This week is not going to complete itself, surprisingly.",
    "Your discipline is currently buffering.",
    "The gym is still open. Your excuses are running out of office hours.",
    "Stop treating basic consistency like an extreme sport.",
    "Nobody is asking for greatness. Just show up and stop being dramatic.",
    "The tracker is not impressed by vibes.",
    "You are not listening to your body. You are listening to the sofa.",
    "Get up. The plot is getting boring.",
    "You are dangerously close to becoming a person who says next week.",
    "The snacks are organised. Are you?",
    "This is why we can't have abs.",
    "Your gym shoes have abandonment issues.",
    "The target is four. Not folklore.",
    "You cannot manifest a workout. Annoying, but true.",
    "The only thing being shredded right now is your credibility.",
    "You are not too busy. You are poorly negotiated.",
    "The calendar says no.",
    "Your future trousers are depending on this.",
    "A walk to the fridge is not cross-training.",
    "You already know you'll feel smug after. Go collect the smug.",
    "Do it now before your personality becomes I was going to.",
    "The gym will not attend itself on your behalf.",
    "This is a private app and even it is judging you.",
    "Your comfort zone has terrible taste.",
    "You are not preserving energy. You are hoarding excuses.",
    "One session or one regret. Pick a lane.",
    "Your standards called. They sounded disappointed.",
    "The weekly target is not a suggestion.",
    "You have had enough character development on the sofa.",
    "Go earn the shower.",
    "The app wants proof of life.",
    "Stop making eye contact with the snacks.",
    "The couch has done enough recruiting.",
    "You cannot out-plan a skipped session.",
    "This is not laziness. This is a hostile takeover by comfort.",
    "Go lift something before your discipline expires.",
    "The only bad workout is the imaginary one.",
    "Your calendar is starting to look like a witness statement.",
    "Nobody cares about your excuse, including future you.",
    "This is not a debate. It is a hold-to-confirm situation."
  ],
  "first-workout": [
    "The first one is the trapdoor. Step through it.",
    "Inertia broken. Excuses wounded.",
    "One session changes the week.",
    "The hardest workout is the one before momentum exists.",
    "You just made the rest of the week easier.",
    "The week is awake now.",
    "Zero is dead. Good.",
    "The first one always counts double emotionally.",
    "You are now officially not all talk.",
    "The system is online.",
    "The sofa lost round one.",
    "That is how a week starts behaving.",
    "Good. Now the excuses know you are serious.",
    "First session banked. Personality upgraded.",
    "The lazy version of you has been formally overruled."
  ],
  momentum: [
    "Two banked. Now it is a real week.",
    "Halfway there. Do not get smug too early.",
    "Momentum has entered the chat.",
    "The week is starting to look less embarrassing.",
    "Two sessions means this is no longer theoretical.",
    "Look at you, becoming mildly reliable.",
    "Consistency is doing something suspiciously attractive.",
    "Halfway to smug. Continue.",
    "The target is starting to sweat.",
    "Two down. The sofa is panicking."
  ],
  "one-more": [
    "One more. Do not waste the setup.",
    "Target in range. Finish the job.",
    "Three banked. Now do not fumble the obvious.",
    "One session away from being insufferable.",
    "The week is basically begging to be completed.",
    "You are too close to start acting mysterious.",
    "Do not turn 3/4 into a personality flaw.",
    "One more and you get to be smug with evidence.",
    "The final session is not optional. It is dramatic closure.",
    "This is where standards are either built or abandoned."
  ],
  "individual-complete": [
    "Four banked. Week handled.",
    "Objective complete. You did what you said you would.",
    "The calendar has been satisfied.",
    "That is a proper week. Annoyingly impressive.",
    "Four sessions. No tragic excuses.",
    "You may now be smug, briefly.",
    "The app acknowledges your rare display of discipline.",
    "Weekly target complete. Standards survived.",
    "You beat the sofa. Historic scenes.",
    "That is not motivation. That is evidence."
  ],
  couple: [
    "Do not make this a one-person household standard.",
    "One of you has to be the adult. Ideally both.",
    "The couple target is not going to carry itself.",
    "Shared calendar. Shared shame. Shared smugness.",
    "Do not let the team down because the sofa flirted with you.",
    "8 / 8 is the relationship flex.",
    "Couples who train together become insufferable together.",
    "The household has standards now. Unfortunately.",
    "One of you is setting the pace. The other one should take that personally.",
    "Team progress requires two witnesses.",
    "No weak link this week.",
    "The family brand is discipline.",
    "You are either helping the 8 / 8 or explaining yourself to the calendar.",
    "This is a two-person operation. Act accordingly.",
    "The couple goal has entered the chat.",
    "Make it a smug Sunday.",
    "Two people. Eight sessions. Zero nonsense.",
    "The app believes in you both, which is frankly generous.",
    "One household. One target. No sofa-based betrayal.",
    "You married into accountability."
  ],
  "couple-complete": [
    "Household objective complete.",
    "8 / 8. Domestic domination.",
    "No weak link. No nonsense.",
    "The household has completed the mission.",
    "Two people. Eight sessions. Behaviour upgraded.",
    "Relationship status: annoyingly disciplined.",
    "Couple goal complete. You may both be unbearable now.",
    "The sofa has lost the household.",
    "Shared smugness unlocked.",
    "The family brand has survived the week.",
    "8 / 8. The calendar is forced to respect you.",
    "Both targets locked. Standards raised.",
    "The house went 8 / 8. Ridiculous behaviour.",
    "Couple week complete. The excuses were outnumbered.",
    "This is what accountability looks like when it gets annoying."
  ]
};

export function getDeterministicQuote(context: QuoteContext, seed: string): string {
  const bank = quoteBanks[context];
  const hash = stableHash(`${context}:${seed}`);
  return bank[hash % bank.length];
}

function stableHash(value: string): number {
  let hash = 5381;

  for (const character of value) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }

  return Math.abs(hash);
}
