import { loadStore, type Project } from "./studio/project";

// What people around the block say: the lines cycled per conversation, and
// what someone makes of a tape you play them.

/** Lines people say, cycled one set per conversation. */
export const LINES: Record<string, string[][]> = {
  "crew-smoke": [
    ["\u201cYou live up top? Light's on all night.\u201d"],
    ["\u201cThis block's quieter than it looks.\u201d", "\u201cThat's the problem.\u201d"],
    ["\u201cDon't answer that payphone. Or do. Your business.\u201d"],
  ],
  "crew-drink": [["\u201cStore never closes. Neither do we.\u201d"], ["\u201cMilo found that speaker in a skip. Still slaps.\u201d"]],
  "crew-box": [["\u201cThis speaker's older than me.\u201d"], ["\u201cYou make beats? Bring us something.\u201d"]],
  walker: [["\u201cHe likes you. He doesn't like anyone.\u201d"], ["\u201cSame walk every night. He insists.\u201d"]],
  "couch-cup": [["\u201cSip slow.\u201d"], ["\u201cYou cooking tonight or just looking at the pads?\u201d"]],
  "couch-blunt": [["\u201cSit down, you're making the room nervous.\u201d"]],
  "couch-phones": [["She slides one side of her headphones off."]],
  oldman: [
    ["\u201cSame pigeons every night. I think they know me.\u201d"],
    ["\u201cThat payphone on the corner rings for years now.\u201d", "\u201cI stopped wondering who.\u201d"],
  ],
  "hooper-1": [["\u201cNext.\u201d"]],
  "hooper-2": [["\u201cHe's been missing all night. Don't tell him.\u201d"]],
  "alley-cat": [
    ["The cat lets you scratch behind one ear. Then it decides that's enough."],
    ["It looks at you like you owe it money."],
    ["It purrs, very quietly, like it doesn't want anyone to know."],
  ],
  ledge: [["She doesn't turn around."], ["\u201cYou can see the whole block from here.\u201d", "\u201cYour window's the one that never goes dark.\u201d"]],
};
/** How many saved projects there are (they show as tapes on the shelf). */
export const savedProjects = () => loadStore().slots.filter(Boolean).length;

/** What someone makes of a tape, from how it actually goes. */
export function verdict(p: Project): string[] {
  const t = p.tempo;
  const says = t < 80 ? "\u201cSlow. Like walking home the long way.\u201d" : t < 100 ? "\u201cThat's a Sunday. That's a whole Sunday.\u201d" : t < 130 ? "\u201cNow my knee's going. Look at it.\u201d" : "\u201cToo fast for me. But I'll allow it.\u201d";
  const feel = p.swing >= 0.2 ? "\u201cIt limps. The good kind.\u201d" : p.channels.some((c) => c.voice.startsWith("cut:") || c.voice.startsWith("chop:")) ? "\u201cI know that sample from somewhere.\u201d" : null;
  return feel ? [says, feel] : [says];
}
