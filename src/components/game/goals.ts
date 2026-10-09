import { styleOf } from "./character";
import type { SaveData } from "./save";
import { PLACES } from "./sfx";
import { FINDABLE } from "./studio/voices";

// Things to aim for, listed in the menu. Each is checked whenever the save
// changes; reaching one pays out once (cash, respect, sometimes a piece of
// clothing whose unlock names the goal).

export interface GoalContext {
  /** Beats saved to tape in the studio. */
  tapes: number;
}

export interface Goal {
  id: string;
  name: string;
  hint: string;
  done: (s: SaveData, c: GoalContext) => boolean;
  progress?: (s: SaveData, c: GoalContext) => [number, number];
  reward: { cash?: number; rep?: number };
}

export const GOALS: Goal[] = [
  { id: "mirror", name: "Look in the mirror", hint: "Make yourself (the menu, or the mirror in the thrift shop).", done: (s) => !!s.profile?.name, reward: { cash: 5 } },
  { id: "first-beat", name: "Make a beat", hint: "Save something in the studio. It ends up on your shelf as a tape.", done: (_, c) => c.tapes > 0, reward: { cash: 15 } },
  { id: "played", name: "Play it for someone", hint: "The crew's boombox, the couch, the old man in the park, the roof.", done: (s) => Object.keys(s.heard).length > 0, reward: { rep: 5 } },
  { id: "sold", name: "Sell a beat", hint: "Dre at the underpass buys beats. So does the record shop, sometimes.", done: (s) => s.stats.beatsSold > 0, reward: { rep: 8 } },
  {
    id: "sounds",
    name: "Every sound on the block",
    hint: "Sounds hide all over. Use things; talk to people.",
    done: (s) => FINDABLE.every((id) => s.found.includes(id)),
    progress: (s) => [s.found.length, FINDABLE.length],
    reward: { cash: 50, rep: 10 },
  },
  { id: "fight", name: "Stand your ground", hint: "Win a fight. They tend to find you, late.", done: (s) => s.stats.wins > 0, reward: { cash: 10 } },
  { id: "five-wins", name: "Nobody's easy target", hint: "Win five fights.", done: (s) => s.stats.wins >= 5, progress: (s) => [Math.min(5, s.stats.wins), 5], reward: { rep: 10 } },
  { id: "fresh", name: "Fresh", hint: "Wear an outfit worth 6 style. The thrift shop on the avenue.", done: (s) => !!s.profile && styleOf(s.profile) >= 6, progress: (s) => [Math.min(6, s.profile ? styleOf(s.profile) : 0), 6], reward: { rep: 5 } },
  { id: "club", name: "On the list", hint: "Get past the door at the club. Respect or style.", done: (s) => s.places.includes("club"), reward: { rep: 5 } },
  { id: "dj", name: "Play the club", hint: "Play a set at the club and keep the floor (70%).", done: (s) => s.stats.djBest >= 70, progress: (s) => [Math.min(70, s.stats.djBest), 70], reward: { cash: 60, rep: 10 } },
  { id: "cypher", name: "Rock the cypher", hint: "Keep the beat going under the bridge (70%).", done: (s) => s.stats.cypherBest >= 70, progress: (s) => [Math.min(70, s.stats.cypherBest), 70], reward: { rep: 15 } },
  { id: "tag", name: "Get up", hint: "Put your name on the alley wall.", done: (s) => !!s.tag, reward: { rep: 5 } },
  { id: "digger", name: "Crate digger", hint: "Dig the crates at the record shop five times.", done: (s) => s.stats.digs >= 5, progress: (s) => [Math.min(5, s.stats.digs), 5], reward: { rep: 5 } },
  { id: "tank", name: "Under the bridge", hint: "Tank runs the underpass. Win enough fights and he'll notice you.", done: (s) => s.seen.includes("tank-beaten"), reward: { cash: 80, rep: 20 } },
  { id: "explorer", name: "Know the block", hint: "Go everywhere there is to go.", done: (s) => PLACES.every((p) => s.places.includes(p)), progress: (s) => [PLACES.filter((p) => s.places.includes(p)).length, PLACES.length], reward: { cash: 30 } },
  { id: "known", name: "Known on the block", hint: "100 respect.", done: (s) => s.rep >= 100, progress: (s) => [Math.min(100, Math.floor(s.rep)), 100], reward: { cash: 100 } },
];

/** Goals newly reached by this save. */
export const newlyDone = (s: SaveData, c: GoalContext) => GOALS.filter((g) => !s.goals.includes(g.id) && g.done(s, c));
