// Night Radio: each of saeculo's tracks is a pirate station somewhere on
// the dial, with a call sign and a line the DJ types out when you land on
// it. One more station sits past the end of the printed scale.

export const DIAL = { min: 86, max: 110, printedMin: 88, printedMax: 108 };

export interface Station {
  freq: number;
  /** Which track (id from tracks.ts) the station plays. */
  trackId: string;
  call: string;
  line: string;
}

export const STATIONS: Station[] = [
  { freq: 88.3, trackId: "elbtunnel", call: "WSAE", line: "you're listening to 88.3. it's 3 am. this one's elbtunnel." },
  { freq: 94.7, trackId: "care4me", call: "KTAP", line: "94.7. no ads, no names. somebody asked for care4me, so here it is." },
  { freq: 101.9, trackId: "dull-knife", call: "WRM3", line: "101.9, from under the laundromat. if you're still awake, this is dull knife." },
];

/** The station that isn't in the listings (see flyer_nightradio.jpg). It
 *  plays a snippet from the vault and reads out a fourth clue. */
export const HIDDEN_STATION = {
  freq: 109.3,
  call: "????",
  line: "…three words open the bin. one is written white on white. one waits behind the first boss. one is older than you are: up, up, down, down… repeating.",
};
