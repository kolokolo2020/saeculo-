import { styleOf } from "./character";
import type { Actor } from "./life";
import type { MenuTab } from "./Menu";
import { BATTLE_BEATS, type RhythmMode } from "./minigames/Rhythm";
import type { ShopKind } from "./minigames/Shop";
import { trainAt } from "./places/underground";
import { MAX_HP, type SaveData } from "./save";
import { PRESETS } from "./studio/presets";
import type { Project } from "./studio/project";

// What the people and things in the newer places say and do: the avenue,
// the alley, the record shop, the thrift shop, the club, the subway and
// the underpass. Game.tsx hands over an Api with everything they need.

export interface Choice {
  label: string;
  run: () => void;
}
export type Mini = { kind: "rhythm"; mode: RhythmMode; rival?: { name: string; score: number; stake: number; beat: string } } | { kind: "dice" } | { kind: "crates" } | { kind: "hoops" } | { kind: "tag" } | { kind: "shop"; shop: ShopKind };

export interface Api {
  say: (lines: string[], choices?: Choice[]) => void;
  close: () => void;
  toast: (msg: string, ms?: number) => void;
  find: (id: string) => boolean;
  save: () => SaveData;
  update: (fn: (s: SaveData) => SaveData) => void;
  earn: (n: number) => void;
  spend: (n: number) => boolean;
  addRep: (n: number) => void;
  heal: (n: number) => void;
  /** Your newest saved beat. */
  tape: () => Project | null;
  open: (m: Mini) => void;
  menu: (tab: MenuTab) => void;
  /** Tank (and one of his) at the underpass. */
  bossFight: () => void;
  happened: (id: string) => boolean;
  markSeen: (id: string) => void;
  /** Sound through a small speaker: chops of the real tracks. */
  radio: (ids: string[]) => void;
  /** Real-track chops for one of the beats, picked at random. */
  someChops: () => string[];
  sfx: { select: () => void; coins: () => void; gulp: () => void; voice: (id: string) => void; flick: () => void };
  life: () => Actor[];
  /** The game clock (seconds). */
  t: () => number;
  /** Get on the train: one stop, to your block or the avenue. */
  ride: (to: "street" | "avenue") => void;
  /** Per-visit memory: things that can happen once a visit. */
  visit: Record<string, number>;
}

/** Let in at the club: once in, always in. */
export const clubOk = (s: SaveData) => s.places.includes("club") || s.rep >= 30 || (!!s.profile && styleOf(s.profile) >= 6);

/** What a beat's worth to someone who buys beats. */
export function priceOf(p: Project): number {
  const chans = p.channels.length;
  const patterns = p.patterns.filter((pt) => Object.values(pt.steps).some((st) => st.some((v) => v > 0)) || Object.values(pt.notes).some((n) => n.length)).length;
  const song = p.song.filter((x) => x >= 0).length;
  const found = p.channels.filter((c) => /^(rain|bottle|phone|lighter|basketball|chimes|spray|dice|scratch|train|crowd|mic)$/.test(c.voice)).length;
  return Math.min(90, 12 + chans * 3 + patterns * 4 + Math.min(song, 8) + found * 4);
}

const LINES: Record<string, string[][]> = {
  "queue-1": [["“We've been out here forty minutes.”"], ["“He let a guy in a puffer straight in. A puffer.”"]],
  "queue-2": [["“The DJ's good tonight. Can hear it through the wall.”"], ["“You on the list? Nobody's on the list.”"]],
  stroller: [["“Been walking since the last train. Can't sleep.”"], ["“That laundromat's warmer than my flat.”"]],
  "barrel-man": [["“They come out of that club around now, the loud ones. Don't stand still.”"], ["He holds his hands over the fire and doesn't look up."], ["“Jay cheats. Everybody knows. Everybody plays anyway.”"]],
  digger: [["She doesn't take her headphones off. She holds up a record so you can see it: no sleeve, no label."], ["“Bottom of the bins. That's where it is.”"]],
  commuter: [["“The last one's always late. The first one's always early.”"], ["He's watching a video of a train, on the platform, waiting for a train."]],
  waiting: [["“I keep missing it by one.”"], ["She slides one headphone off. “What?”"]],
  "mc-1": [["“Bring a beat with some knock and I'll go all night.”"]],
  "mc-2": [["“Tank doesn't rap. Tank just watches.”"], ["“Dre buys beats. Pays fair, sometimes.”"]],
  "mc-3": [["She's mid-verse. She points at you without stopping, then at the speaker."]],
  goon: [["“Don't.”"]],
  "thrift-owner": [["“Everything's been worn once. That's what makes it good.”"], ["“The mirror's free. Try things on in your head.”"], ["“The club door looks at your shoes first. Just saying.”"]],
  "records-owner": [["“Dig all you like. Five dollars a go keeps the lights on.”"], ["“That white label at the listening station? Came in a box with no return address.”"]],
  bartender: [["“What'll it be?”"]],
  dj: [["“You're the one with the beats? Everyone says.”"]],
  "dancer-0": [["“Don't talk, dance.”"]],
  "dancer-3": [["“This is the one. This is the one!”"]],
  "dancer-6": [["She dances like nobody's here. Nobody's watching anyway."]],
};
const counts: Record<string, number> = {};
const next = (id: string) => {
  const ls = LINES[id];
  if (!ls) return ["…"];
  const n = counts[id] ?? 0;
  counts[id] = n + 1;
  return ls[n % ls.length];
};

/** Selling a tape: Dre at the underpass, or the record shop's owner (who pays less). */
function sellTape(api: Api, who: "dre" | "owner") {
  const tape = api.tape();
  if (!tape) {
    api.say(who === "dre" ? ["“Bring me something. I pay for beats.”", "“The studio's at the end of your street, isn't it.”"] : ["“Make a tape and I'll put it on. If it's good I'll buy a copy.”"]);
    return;
  }
  if (api.save().sold.includes(tape.name)) {
    api.say(who === "dre" ? [`“I already got ‘${tape.name}’. Make me a new one.”`] : [`“‘${tape.name}’'s already in the rack. Something new?”`]);
    return;
  }
  const price = Math.round(priceOf(tape) * (who === "dre" ? 1 : 0.7));
  api.say(who === "dre" ? [`You hand Dre ‘${tape.name}’. He puts one earbud in.`, "He listens to the whole loop twice. Doesn't say anything.", `“$${price}. That's the price.”`] : [`The owner puts ‘${tape.name}’ on the shop turntable and turns it up.`, `A kid by the bins looks round. “$${price}, for a shop copy.”`], [
    {
      label: `Sell it for $${price}`,
      run: () => {
        api.update((s) => ({ ...s, sold: [...s.sold, tape.name], stats: { ...s.stats, beatsSold: s.stats.beatsSold + 1, earned: s.stats.earned + price } }));
        api.earn(price);
        api.addRep(who === "dre" ? 4 : 2);
        api.sfx.coins();
        api.say(who === "dre" ? ["He counts it out on the speaker.", "“My guy's going to kill this.”"] : ["“It'll be in the local section. Right at the front.”"]);
      },
    },
    { label: "Not for sale", run: () => api.say(["“Suit yourself.”"]) },
  ]);
}

export function promptFor(id: string, api: Api): string | null | undefined {
  const s = api.save();
  switch (id) {
    case "laundry":
      return "look in the laundromat";
    case "thrift-window":
      return "the thrift shop window";
    case "records-window":
      return "the record shop window";
    case "dumpster":
      return "look behind the dumpster";
    case "barrel":
    case "barrel-u":
      return "warm your hands";
    case "wall":
      return s.tag ? "your tag" : "tag the wall";
    case "back-door":
      return "the back door";
    case "listening":
      return "the listening station";
    case "crates":
      return "dig the crates";
    case "record-counter":
      return "the counter";
    case "rack":
      return "look through the rack";
    case "shoes":
      return "the shoe wall";
    case "mirror":
      return "the mirror";
    case "thrift-counter":
      return "the counter";
    case "booth":
      return "the decks";
    case "bar":
      return "the bar";
    case "ticket":
      return "the ticket machine";
    case "poster":
      return "the poster";
    case "map":
      return "the map";
    case "edge":
      return trainAt(api.t()).open ? "get on the train" : trainAt(api.t()).here ? "the train" : "the edge of the platform";
    case "speaker":
      return "the cypher";
  }
  return undefined;
}

/** Things in the newer places. Returns false for ids it doesn't know. */
export function operate(id: string, api: Api): boolean {
  const s = api.save();
  switch (id) {
    case "laundry":
      api.say(["Someone's asleep on the bench between two dryers. The drums go round and round.", "It sounds like a beat if you let it."]);
      return true;
    case "thrift-window":
      api.say(["Jackets on hangers, a puffer on a mannequin with no head. A sign: EVERYTHING WORN ONCE."]);
      return true;
    case "records-window":
      api.say(["Sleeves in the window, faded by years of streetlight. One of them's just the word saeculo, in light on dark."]);
      return true;
    case "dumpster": {
      if (api.visit.dumpster) {
        api.say(["You've had a look. Nothing's changed."]);
        return true;
      }
      api.visit.dumpster = 1;
      if (Math.random() < 0.5) {
        const n = 2 + Math.floor(Math.random() * 6);
        api.earn(n);
        api.sfx.coins();
        api.say([`Behind the bin, in a puddle: $${n}. Nobody's coming back for it.`]);
      } else api.say(["A drum machine with half its pads missing. You think about it for longer than you should."]);
      return true;
    }
    case "barrel":
    case "barrel-u": {
      const last = api.visit[id] ?? -999;
      if (api.t() - last < 45 || s.hp >= MAX_HP) {
        api.say(["You hold your hands over the fire for a bit."]);
        return true;
      }
      api.visit[id] = api.t();
      api.heal(12);
      api.say(["You hold your hands over the fire. The cold goes out of your fingers.", "(+12 health)"]);
      return true;
    }
    case "wall":
      if (s.tag)
        api.say([`Your name's still up, in ${s.tag.color === "#e8e0cf" ? "white" : "colour"}. Someone's drawn a little crown over it.`], [
          { label: "Go over it again", run: () => api.open({ kind: "tag" }) },
          { label: "Leave it", run: api.close },
        ]);
      else api.open({ kind: "tag" });
      return true;
    case "back-door":
      api.say(["STAFF ONLY. Locked. The bass comes through the metal."]);
      return true;
    case "listening": {
      api.say(["A white label in the new arrivals, saeculo written on it in marker.", "You put the headphones on."]);
      api.radio(api.someChops());
      return true;
    }
    case "crates":
      api.open({ kind: "crates" });
      return true;
    case "record-counter": {
      const owner = api.life().find((a) => a.id === "records-owner");
      if (owner) talk(owner, api);
      return true;
    }
    case "rack":
    case "shoes":
      api.open({ kind: "shop", shop: "thrift" });
      return true;
    case "mirror":
      api.say(["You, in the mirror. Could be worse. Could be different."], [
        { label: "Change how you look", run: () => api.menu("you") },
        { label: "Change what you wear", run: () => api.menu("wardrobe") },
        { label: "Leave it", run: api.close },
      ]);
      return true;
    case "thrift-counter": {
      const owner = api.life().find((a) => a.id === "thrift-owner");
      if (owner) talk(owner, api);
      return true;
    }
    case "booth": {
      const dj = api.life().find((a) => a.id === "dj");
      if (dj) talk(dj, api);
      return true;
    }
    case "bar":
      api.open({ kind: "shop", shop: "bar" });
      return true;
    case "ticket":
      api.say(["OUT OF ORDER. Someone's taped a note under it: so is everything."]);
      return true;
    case "poster":
      api.say(["A poster for the album: \"saeculo\" in black across a pale grey disc, pastel rays all round it.", "Someone's drawn headphones on the moon. The speaker in the ceiling plays a bit of it, crackly."]);
      api.radio(api.someChops());
      return true;
    case "map":
      api.say(["The map's been drawn on. Someone's added a stop between two real ones.", "It just says: your block."]);
      return true;
    case "edge": {
      const tr = trainAt(api.t());
      const board = [
        { label: "Get on: your block", run: () => api.ride("street") },
        { label: "Stay", run: api.close },
      ];
      if (tr.here || tr.arriving) {
        const got = api.find("train");
        if (tr.open) api.say(got ? ["The brakes scream along the whole platform. You hold your phone out and get it. You keep the sound.", "The doors are open."] : ["The doors open. Nobody gets off.", "One stop to your block, if you want it."], board);
        else if (got) api.say(["The brakes scream along the whole platform. You hold your phone out and get it.", "You keep the sound. (Wait for the doors to ride it.)"]);
        else api.say(["The train fills the whole platform with noise. Wait for the doors."]);
      } else api.say(["Mind the gap. The rails hum, a train somewhere in the tunnel."]);
      return true;
    }
    case "speaker":
      cypher(api);
      return true;
  }
  return false;
}

function cypher(api: Api) {
  const best = api.save().stats.cypherBest;
  api.say(best ? [`“Producer's back. Last time: ${best}%.”`, "“Go on then.”"] : ["The circle opens up a little. The MC nods at the speaker.", "“You make beats? Then keep this one going. We'll do the rest.”"], [
    { label: "Play the beat", run: () => api.open({ kind: "rhythm", mode: "cypher" }) },
    { label: "Just listen", run: () => api.say(["You stand at the edge of the circle. Nobody minds."]) },
  ]);
}

/** The CD guy wants a beat for his next CD: something slow. */
const CD_TEMPO = 90;
function cdAsk(api: Api) {
  const tape = api.tape();
  if (!api.happened("cd-ask")) {
    api.markSeen("cd-ask");
    api.say(["“Listen. Listen. Next CD. I need a beat for track four.”", `“Slow. Under ${CD_TEMPO}. Rain-on-the-window slow. You make that, I pay. Twenty-five.”`, "(make a beat under 90 BPM in the studio, save it, bring it here)"]);
    return;
  }
  if (!tape) {
    api.say([`“Track four. Slow. Under ${CD_TEMPO}. Still waiting.”`]);
    return;
  }
  if (tape.tempo >= CD_TEMPO) {
    api.say([`He listens to ‘${tape.name}’ for four bars.`, `“That's ${tape.tempo}. I said slow. Under ${CD_TEMPO}. Like walking home.”`]);
    return;
  }
  api.say([`He listens to ‘${tape.name}’ with his eyes shut. ${tape.tempo} BPM. His head barely moves.`, "“That's it. That's track four.”"], [
    {
      label: "It's yours ($25)",
      run: () => {
        api.markSeen("cd-done");
        api.earn(25);
        api.addRep(4);
        api.sfx.coins();
        api.say(["He counts out twenty-five in ones and fives.", "“Your name's going on the back. Small. But it's going on.”"]);
      },
    },
    { label: "Not that one", run: () => api.say(["“Then bring me the slow one.”"]) },
  ]);
}

/** What it costs to battle Vee, and what Vee scores (better each time you win, a little better on the easier beats). */
export const BATTLE_STAKE = 20;
const rivalScore = (s: SaveData, ease: number) => Math.min(90, 60 + 6 * s.stats.battleWins + ease + Math.floor(Math.random() * 9));

/** Vee's beat for the next battle: one of the studio's starters, a different one each time, in turn. */
export function veeBeat(s: SaveData) {
  const b = BATTLE_BEATS[(s.stats.battleWins + s.stats.battleLosses) % BATTLE_BEATS.length];
  const [name, bpm] = (PRESETS.find((p) => p.id === b.preset)?.name ?? b.preset).split(" · ");
  return { ...b, name, bpm };
}

/** Vee, the other producer at the underpass: a beat battle for money, on her beat (she says which). */
export function battle(api: Api, first = false) {
  const s = api.save();
  const beat = veeBeat(s);
  const go = () => {
    if (!api.spend(BATTLE_STAKE)) return api.say(["“No money, no battle. Come back with twenty.”"]);
    api.open({ kind: "rhythm", mode: "battle", rival: { name: "Vee", score: rivalScore(api.save(), beat.ease), stake: BATTLE_STAKE, beat: beat.preset } });
  };
  const n = s.stats.battleWins + s.stats.battleLosses;
  const which = [`“Tonight it's my ${beat.name}. ${beat.bpm} BPM.”`, `“I'm bringing the ${beat.name} this time. ${beat.bpm}. Keep up.”`, `“My ${beat.name}. ${beat.bpm}. Try not to drop it.”`][n % 3];
  const lines = first
    ? ["Someone peels off from the cypher and walks straight at you, a sampler under her arm.", "“You're the one Dre keeps buying from? I'm Vee.”", `“Beat battle. My ${beat.name}, ${beat.bpm} BPM, both of us play it live. $${BATTLE_STAKE} says I do it better.”`]
    : s.stats.battleWins
      ? [s.stats.battleWins > s.stats.battleLosses ? "“Run it back. I've been practising.”" : "“Again? Fine. Same stakes.”", which, `(you ${s.stats.battleWins} · Vee ${s.stats.battleLosses})`]
      : s.stats.battleLosses
        ? ["“Back for more? I'll take your money all night.”", which]
        : ["“Still scared? Twenty dollars. Both of us live.”", which];
  api.say(lines, [
    { label: `Battle ($${BATTLE_STAKE})`, run: go },
    { label: "Not tonight", run: () => api.say([first ? "“Thought so. I'm here when you've got the nerve.”" : "“Your loss. Well. My win.”"]) },
  ]);
}

/** Who Dre sends you to, in turn. */
const JOB_TO: { id: string; where: string; ok?: (s: SaveData) => boolean }[] = [
  { id: "busker", where: "the busker, down in the subway" },
  { id: "records-owner", where: "the man at the record shop" },
  { id: "bartender", where: "the bartender at the club", ok: clubOk },
];
const JOB_HANDOVER: Record<string, string[]> = {
  busker: ["You hand the busker Dre's tape. He doesn't stop playing; he takes it with one hand and the chords don't miss.", "He nods at his case. There's an envelope in it. “For Dre. Don't open it.”"],
  "records-owner": ["You put the tape on the counter. He turns it over, reads something on the label you can't see, and laughs.", "He slides an envelope back. “Tell Dre: Thursday.”"],
  bartender: ["The bartender takes the tape like it's a drink order and slips it under the till.", "An envelope comes back across the bar. “Not here. Go.”"],
};

/** Dre's work: carry a tape, bring back what you're given. */
function dreJob(api: Api) {
  const s = api.save();
  const options = JOB_TO.filter((j) => !j.ok || j.ok(s));
  const pick = options[s.stats.jobs % options.length];
  const pay = 20 + 5 * Math.min(4, s.stats.jobs);
  api.say(["Dre looks round, then holds out a tape with no label.", `“Take this to ${pick.where}. Don't play it. Bring back what they give you.”`, "“Keep your head down. People can tell when you're carrying.”", `“$${pay} when you're back.”`], [
    {
      label: "I'll take it",
      run: () => {
        api.update((x) => ({ ...x, job: { to: pick.id, stage: "carry", pay } }));
        api.toast(`Job: take Dre's tape to ${pick.where}. (The menu has it too.)`, 4600);
        api.close();
      },
    },
    { label: "Not now", run: () => api.say(["“Work's there when you want it.”"]) },
  ]);
}

/** Where your current job stands, in a few words (the menu shows it). */
export function jobText(s: SaveData): string | null {
  if (!s.job) return null;
  const where = JOB_TO.find((j) => j.id === s.job!.to)?.where ?? "someone";
  if (s.job.stage === "lost") return "tell Dre his tape's gone (no pay)";
  return s.job.stage === "carry" ? `take Dre's tape to ${where}` : `bring the envelope back to Dre at the underpass ($${s.job.pay})`;
}

/** People in the newer places. Returns false for anyone it doesn't know. */
export function talk(a: Actor, api: Api): boolean {
  const s = api.save();
  // a delivery for Dre
  if (s.job?.stage === "carry" && s.job.to === a.id) {
    api.update((x) => ({ ...x, job: x.job && { ...x.job, stage: "back" } }));
    api.sfx.select();
    api.say([...(JOB_HANDOVER[a.id] ?? ["You hand it over."]), "(take it back to Dre)"]);
    return true;
  }
  switch (a.id) {
    case "vee":
      battle(api);
      return true;
    case "bouncer": {
      if (clubOk(s)) {
        a.x = 36.9 * 16;
        api.say(s.places.includes("club") ? ["He lifts the rope without looking at you."] : ["He looks you up and down. Takes his time.", "“Go on.” He lifts the rope."]);
        return true;
      }
      const style = s.profile ? styleOf(s.profile) : 0;
      api.say(["“Not tonight.”", "“Come back when people know your name. Or when you look like you mean it.”", `(respect ${Math.floor(s.rep)}/30, or style ${style}/6)`]);
      return true;
    }
    case "cd-guy":
      if (!api.happened("cd")) {
        api.say(["“Yo. You like music? Course you do. My CD. Five dollars.”", "“Signed. I'll sign it. Hold on.”"], [
          {
            label: "Buy his CD ($5)",
            run: () => {
              if (!api.spend(5)) return api.say(["“No money? Respect. Next time.”"]);
              api.markSeen("cd");
              api.addRep(1);
              api.say(["He signs it before you can stop him.", "“Cypher's under the bridge, past the end of the avenue. Dre buys beats there.”", "“And Tank. Don't look at Tank.”"]);
            },
          },
          { label: "Not now", run: () => api.say(["“I'm here every night. Every. Night.”"]) },
        ]);
      } else if (!api.happened("cd-done")) cdAsk(api);
      else api.say([["“How's the CD? Track four, right? Track four. That's yours.”"], ["“The club's letting people in who look the part. Thrift shop's right there.”"], ["“Win a few fights and people start to know you. Not that I'd know.”"]][Math.floor(api.t()) % 3]);
      return true;
    case "dice-1":
    case "dice-2":
      api.say(a.id === "dice-1" ? ["Jay rattles two dice in his fist. “Doubles beat anything. You in?”"] : ["“He's on a streak. Take his money.”"], [
        { label: "Play", run: () => api.open({ kind: "dice" }) },
        { label: "Watch", run: api.close },
      ]);
      return true;
    case "records-owner":
      api.say(next(a.id), [
        { label: "Sell him a beat", run: () => sellTape(api, "owner") },
        { label: "Dig the crates", run: () => api.open({ kind: "crates" }) },
        { label: "Nothing", run: api.close },
      ]);
      return true;
    case "thrift-owner":
      api.say(next(a.id), [
        { label: "Show me the clothes", run: () => api.open({ kind: "shop", shop: "thrift" }) },
        { label: "Just looking", run: api.close },
      ]);
      return true;
    case "dj": {
      const ok = s.rep >= 15 || s.heard.dj || s.stats.djBest > 0;
      api.say(ok ? (s.stats.djBest ? [`“Back for more? Last set: ${s.stats.djBest}%.”`] : ["“You're the one with the beats? Everyone says.”", "“Take the decks for a bit. Keep the floor.”"]) : ["“My booth. Nobody touches the booth.”", "“Get a name for yourself first.”", `(respect ${Math.floor(s.rep)}/15)`], ok
        ? [
            { label: "Take the decks", run: () => api.open({ kind: "rhythm", mode: "dj" }) },
            { label: "Not yet", run: api.close },
          ]
        : undefined);
      return true;
    }
    case "bartender":
      api.say(next(a.id), [
        { label: "Get a drink", run: () => api.open({ kind: "shop", shop: "bar" }) },
        { label: "Nothing", run: api.close },
      ]);
      return true;
    case "busker":
      api.say(["He's playing the same four chords over and over, slower each time. It's beautiful, actually."], [
        {
          label: "Drop him $2",
          run: () => {
            if (!api.spend(2)) return api.say(["You've got nothing on you. He nods anyway."]);
            api.addRep(1);
            api.sfx.voice("rhodes");
            api.say(["He plays you a little run at the top of the keyboard. “That one's yours.”"]);
          },
        },
        { label: "Listen", run: () => api.say(["You lean on a pillar and listen till it loops."]) },
      ]);
      return true;
    case "mc-0":
      cypher(api);
      return true;
    case "dre": {
      // knocked out with his tape on you: it's gone, and so's the money
      if (s.job?.stage === "lost") {
        api.update((x) => ({ ...x, job: null }));
        api.say(["Dre looks at your hands. Then at you.", "“Where's my tape?”", "You tell him. He doesn't say anything for a while.", "“Then there's no money. Don't lose the next one.”"]);
        return true;
      }
      if (s.job?.stage === "back") {
        const pay = s.job.pay;
        api.update((x) => ({ ...x, job: null, stats: { ...x.stats, jobs: x.stats.jobs + 1 } }));
        api.earn(pay);
        api.addRep(3);
        api.sfx.coins();
        api.say(["Dre takes the envelope without looking in it and puts it away.", `“Good. $${pay}.” He counts it out on the speaker. (+3 respect)`]);
        return true;
      }
      if (s.job?.stage === "carry") {
        api.say([`“Why are you still here? ${jobText(s)?.replace(/^take/, "Take") ?? ""}.”`]);
        return true;
      }
      // work, once you've shown you can be trusted with a tape
      const trusted = s.stats.beatsSold > 0 || s.rep >= 20;
      const choices = [
        ...(api.tape() ? [{ label: "Sell him your newest", run: () => sellTape(api, "dre") }] : []),
        ...(trusted ? [{ label: "Got any work?", run: () => dreJob(api) }] : []),
        { label: "Not yet", run: () => api.say(["“I'm not going anywhere.”"]) },
      ];
      api.say(api.tape() ? ["“You got something for me?”"] : ["“I buy beats. Bring me one.”"], choices.length > 1 ? choices : undefined);
      return true;
    }
    case "tank":
      if (api.happened("tank-beaten")) {
        api.say([["“Respect.”"], ["“The stand still working? Good.”"], ["“People know you now. That's a weight. Carry it.”"]][Math.floor(api.t()) % 3]);
        return true;
      }
      if (s.stats.wins < 3) {
        api.say(["He doesn't look at you.", "“Come back when people know your name.”", `(win ${3 - s.stats.wins} more ${3 - s.stats.wins === 1 ? "fight" : "fights"})`]);
        return true;
      }
      api.say(["He looks at you for the first time.", "“So you're the one they're talking about.”", "“Let's see.”"], [
        { label: "Fight Tank", run: api.bossFight },
        { label: "Not tonight", run: () => api.say(["“Thought so.”"]) },
      ]);
      return true;
  }
  if (LINES[a.id]) {
    api.say(next(a.id));
    return true;
  }
  return false;
}
