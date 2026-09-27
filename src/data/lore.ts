// found_footage.txt: a log typed up from a tape box, "the night the tapes
// were made". Plain strings; a line wrapped in ██ is shown blacked out.

export const FOOTAGE_HEADER = [
  "REEL ONE. log, typed up from the notes on the tape box.",
  "the dates are wrong on purpose.",
];

export const FOOTAGE_LOG: { time: string; text: string }[] = [
  { time: "02:07", text: "rain again. the cat has been on the desk since midnight, watching the screen like it knows the song." },
  { time: "02:19", text: "started the loop that turned into care4me. four bars. i keep them because they never resolve." },
  { time: "02:31", text: "recorded the room tone onto a blank tape: rain, the fridge, the lamp buzzing. played it back and there was a fourth sound." },
  { time: "02:44", text: "headphones on, speakers off, and i can still hear the beat in the room." },
  { time: "02:58", text: "the clock on the laptop went back a minute, then forward again. writing it down so i believe it in the morning." },
  { time: "03:03", text: "the cat turned around. not to me. to the door." },
  { time: "03:12", text: "bounced elbtunnel to tape. the counter stopped at 0:42 and the song kept going." },
  { time: "03:26", text: "someone on the radio read out numbers between songs. there is no station on that part of the dial." },
  { time: "03:33", text: "the file i deleted is back in the bin. ██████████████. i didn't put it there." },
  { time: "03:47", text: "if you're reading this, the tapes got out. play them loud. don't play them alone." },
];

export const FOOTAGE_FOOTER = "(end of reel. the rest is static.)";
