// Sports the agent understands. The vision prompt is sport-aware so cricket
// gets called in cricket's language (wicket, six, boundary), not football's.
// Cricket is the beachhead — the biggest underserved-language fan base on earth.

export interface Sport {
  id: string;
  name: string;
  /** How the agent describes itself for this sport. */
  analyst: string;
  /** The event vocabulary the agent classifies into. */
  events: string;
}

export const SPORTS: Sport[] = [
  {
    id: "cricket",
    name: "Cricket",
    analyst: "a cricket match analyst and commentator",
    events: "wicket, four, six, boundary, catch, dropped-catch, run-out, appeal, milestone, big-shot, or nothing",
  },
  {
    id: "football",
    name: "Football",
    analyst: "a football (soccer) match analyst and play-by-play commentator",
    events: "goal, chance, save, foul, penalty, buildup, celebration, or nothing",
  },
  {
    id: "auto",
    name: "Auto-detect",
    analyst: "a sports commentator who first works out which sport this is, then commentates it like a native of that sport",
    events: "the most important event for whatever sport this is, or nothing",
  },
];

export function sportById(id: string): Sport {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0];
}
