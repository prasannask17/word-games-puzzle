export function buildPrompt(topic, { exclude = [], count = 16 } = {}) {
  const exclusion = exclude.length
    ? `\nDo not use any of these words: ${exclude.join(", ")}.`
    : "";

  return `You are a word-search word curator. For the topic, output exactly ${count} uppercase A-Z words (no spaces, no duplicates) strongly related to it. ALL words must be EASY: short (3-8 letters), common, everyday words that a child would know. Do not include hard, long, technical, rare or tricky words.
These puzzles are for CHILDREN: every word must be safe and appropriate for young kids. Never use swear words, rude or insulting words, body/adult/sexual words, violence or weapons, death, drugs, alcohol, smoking, gambling, or scary/dark themes.

Rules:
- Prefer simple, well-known topic words.
- Write multi-word names as one word (e.g., IRONMAN, BATMAN).
- Avoid generic filler words like MAN, SUPER, DYNAMIC, STEALTH, THING, STUFF, ITEM.
- Use real words only; do not truncate or invent words.
- Use correct spelling and no duplicates.${exclusion}

Examples:
Topic: Volcanoes
Words: LAVA, ASH, VENT, MAGMA, CRATER, ROCK, SMOKE, HEAT, FIRE, GAS, CONE, PEAK, ERUPT, BOOM, DUST, STEAM

Topic: Famous Authors
Words: SEUSS, DAHL, CARLE, MILNE, POTTER, BLYTON, TWAIN, LEWIS, TOLKIEN, AUSTEN, DICKENS, WHITE, SENDAK, ALCOTT, GRIMM, BAUM

Topic: Emotions & Feelings
Words: JOY, SAD, HAPPY, ANGRY, FEAR, LOVE, KIND, CALM, PROUD, HOPE, SILLY, BRAVE, BORED, SHY, GLAD, UPSET

Topic: Computer Parts
Words: CPU, RAM, GPU, SSD, FAN, USB, MOUSE, PORTS, SCREEN, MEMORY, CHIP, KEYBOARD, MONITOR, CABLE, DISK, SPEAKER

Topic: Superheroes
Words: HULK, THOR, FLASH, BATMAN, IRONMAN, SUPERMAN, AQUAMAN, STORM, ROBIN, ROGUE, GROOT, VISION, BLADE, CYBORG, WASP, FALCON

Topic: ${topic}
Return only JSON in this shape: {"words": ["WORD1", "WORD2", "... exactly ${count} ..."]}`;
}
