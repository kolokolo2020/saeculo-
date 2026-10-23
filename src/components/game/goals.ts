import { itemById, styleOf } from "./character";
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
  { id: "battle", name: "Battle tested", hint: "Beat Vee in a beat battle at the underpass.", done: (s) => s.stats.battleWins > 0, reward: { cash: 20, rep: 10 } },
  { id: "job", name: "On the payroll", hint: "Do a job for Dre.", done: (s) => s.stats.jobs > 0, reward: { rep: 5 } },
  { id: "tag", name: "Get up", hint: "Put your name on the alley wall.", done: (s) => !!s.tag, reward: { rep: 5 } },
  { id: "digger", name: "Crate digger", hint: "Dig the crates at the record shop five times.", done: (s) => s.stats.digs >= 5, progress: (s) => [Math.min(5, s.stats.digs), 5], reward: { rep: 5 } },
  { id: "tank", name: "Under the bridge", hint: "Tank runs the underpass. Win enough fights and he'll notice you.", done: (s) => s.seen.includes("tank-beaten"), reward: { cash: 80, rep: 20 } },
  { id: "explorer", name: "Know the block", hint: "Go everywhere there is to go.", done: (s) => PLACES.every((p) => s.places.includes(p)), progress: (s) => [PLACES.filter((p) => s.places.includes(p)).length, PLACES.length], reward: { cash: 30 } },
  { id: "known", name: "Known on the block", hint: "100 respect.", done: (s) => s.rep >= 100, progress: (s) => [Math.min(100, Math.floor(s.rep)), 100], reward: { cash: 100 } },

  // the career: your page, the artists, the songs
  { id: "fans-100", name: "Local", hint: "100 followers. Sell beats, post on your phone (P).", done: (s) => s.fans >= 100, progress: (s) => [Math.min(100, Math.floor(s.fans)), 100], reward: { cash: 20 } },
  { id: "artist", name: "Customer", hint: "Sell a beat to an artist. Lil Brick's outside the store.", done: (s) => s.stats.leases > 0, reward: { cash: 15, rep: 5 } },
  { id: "song", name: "Featuring", hint: "Make a song with an artist you've linked up with.", done: (s) => s.stats.songs > 0, reward: { rep: 10 } },
  { id: "fans-500", name: "Buzzing", hint: "500 followers.", done: (s) => s.fans >= 500, progress: (s) => [Math.min(500, Math.floor(s.fans)), 500], reward: { cash: 50 } },
  { id: "fans-2k", name: "Rising", hint: "2,000 followers. The club lets you straight in.", done: (s) => s.fans >= 2000, progress: (s) => [Math.min(2000, Math.floor(s.fans)), 2000], reward: { cash: 150 } },
  { id: "songs-5", name: "A catalogue", hint: "Five songs out.", done: (s) => s.stats.songs >= 5, progress: (s) => [Math.min(5, s.stats.songs), 5], reward: { cash: 200, rep: 10 } },
  { id: "kings", name: "Nobody's corner", hint: "The Block Kings come for a cut once you're getting money. Deal with them, one way or the other.", done: (s) => s.mob.kings.stage === "done" || s.mob.kings.stage === "paying", reward: { cash: 100, rep: 25 } },
  { id: "ring", name: "Fight night", hint: "Win Tank's fight night: three rounds, back to back.", done: (s) => s.stats.ringWins > 0, reward: { rep: 20 } },
  { id: "drip", name: "Drip", hint: "Wear an outfit worth 20 style. Maison, at the end of the avenue.", done: (s) => !!s.profile && styleOf(s.profile) >= 20, progress: (s) => [Math.min(20, s.profile ? styleOf(s.profile) : 0), 20], reward: { rep: 10 } },
  { id: "fans-10k", name: "Hot right now", hint: "10,000 followers. Big Halo wants to meet.", done: (s) => s.fans >= 10000, progress: (s) => [Math.min(10000, Math.floor(s.fans)), 10000], reward: { cash: 500 } },
  { id: "iced", name: "Iced out", hint: "Own the iced-out chain.", done: (s) => s.owned.includes("iced") && !!itemById("iced"), reward: { rep: 15 } },
  { id: "fans-50k", name: "Famous", hint: "50,000 followers.", done: (s) => s.fans >= 50000, progress: (s) => [Math.min(50000, Math.floor(s.fans)), 50000], reward: { cash: 2000 } },
  { id: "syndicate", name: "Untouchable", hint: "The Syndicate want a quarter. Deal with them, one way or the other.", done: (s) => s.mob.syndicate.stage === "done" || s.mob.syndicate.stage === "paying", reward: { cash: 1000, rep: 40 } },
  { id: "fans-250k", name: "A star", hint: "250,000 followers.", done: (s) => s.fans >= 250000, progress: (s) => [Math.min(250000, Math.floor(s.fans)), 250000], reward: { cash: 10000 } },
];

/** Goals newly reached by this save. */
export const newlyDone = (s: SaveData, c: GoalContext) => GOALS.filter((g) => !s.goals.includes(g.id) && g.done(s, c));
