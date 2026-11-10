export function buildPrompt(topic, { exclude = [], count = 16 } = {}) {
  const exclusion = exclude.length
    ? `\nDo not use any of these words: ${exclude.join(", ")}.`
    : "";

  return `You are a word-search word curator. For the topic, output exactly ${count} uppercase A-Z words (max 15 chars, no spaces, no duplicates) strongly related to it. Mix difficulty: about 5 easy (3-6 letters), 7 medium (7-8 letters), 4 tricky (9-15 letters or advanced).

Rules:
- Prefer specific, recognizable topic words.
- Write multi-word names as one word (e.g., SPIDERMAN, IRONMAN, WONDERWOMAN).
- Avoid generic filler words like MAN, SUPER, DYNAMIC, STEALTH, THING, STUFF, ITEM.
- Use real words only; do not truncate or invent words.
- Use correct spelling and no duplicates.${exclusion}

Examples:
Topic: Volcanoes
Words: LAVA, ASH, VENT, MAGMA, CRATER, ERUPTION, TECTONIC, CALDERA, OBSIDIAN, BASALT, CONDUIT, PYROCLASTIC, GEOTHERMAL, FUMAROLE, STRATOVOLCANO, SEISMIC

Topic: Famous Authors
Words: POE, HOMER, KAFKA, DANTE, VIRGIL, MILTON, TWAIN, ORWELL, AUSTEN, DICKENS, TOLSTOY, TOLKIEN, HEMINGWAY, SHAKESPEARE, DOSTOEVSKY, ARISTOTLE

Topic: Emotions & Feelings
Words: JOY, SAD, HAPPY, ANGRY, FEAR, LOVE, HATE, CALM, PROUD, HOPE, GUILT, SHAME, EXCITED, ANXIOUS, FRUSTRATED, EMBARRASSED

Topic: Computer Parts
Words: CPU, RAM, GPU, SSD, FAN, USB, MOUSE, PORTS, SCREEN, MEMORY, CHIPSET, KEYBOARD, MONITOR, ETHERNET, PROCESSOR, MOTHERBOARD

Topic: Superheroes
Words: HULK, THOR, FLASH, BATMAN, IRONMAN, SPIDERMAN, SUPERMAN, WOLVERINE, AQUAMAN, CYCLOPS, DEADPOOL, HAWKEYE, STORM, WONDERWOMAN, GREENLANTERN, CAPTAINAMERICA

Topic: ${topic}
Return only JSON in this shape: {"words": ["WORD1", "WORD2", "... exactly ${count} ..."]}`;
}
