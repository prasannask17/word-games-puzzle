// Words that must never appear in a children's puzzle.
// EXACT words are blocked only as whole words (so CLASS, GRAPE, DICKENS, PEACOCK stay allowed).
// ROOTS are blocked anywhere inside a word, so only unambiguous roots belong there.

const EXACT = new Set(
  `
  ass arse butt booty boob boobs booby tit tits titty nude naked nudity sexy sex sexual
  dick cock cum penis vagina anus anal pubic nipple bra thong stripper
  hell damn crap piss pee poo poop fart turd bloody bugger bollocks
  rape raped rapist incest pervert grope horny kinky lust erotic orgasm
  hoe hooker pimp escort mistress affair adultery seduce
  kill killer killing murder murderer slay slaughter massacre stab stabbing
  dead death die dying corpse gore suicide behead torture
  gun guns rifle pistol shotgun bullet bomb bombs grenade terror terrorist
  drug drugs weed meth heroin cocaine opium stoned
  beer wine vodka whiskey rum gin booze drunk alcohol cigar cigarette vape tobacco
  casino gamble gambling
  hate idiot stupid dumb moron loser ugly fatso retard freak
  devil satan demon occult
  divorce
  `
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toUpperCase()),
);

const ROOTS = [
  "FUCK", "SHIT", "CUNT", "BITCH", "BASTARD", "WHORE", "SLUT", "PORN",
  "NIGG", "FAGGOT", "DILDO", "WANK", "TWAT", "JIZZ", "BOLLOCK", "ASSHOLE",
  "MOTHERF", "PUSSY", "HORNY", "NAZI", "RETARD",
];

export function isInappropriate(word) {
  const w = String(word || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!w) return false;
  if (EXACT.has(w)) return true;
  return ROOTS.some((root) => w.includes(root));
}
