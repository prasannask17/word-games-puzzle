import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const hasProviderKeys = Boolean(
  process.env.LLM_API_KEY ||
    process.env.LLM_API_KEY1 ||
    process.env.LLM_FALLBACK_API_KEY ||
    process.env.LLM_FALLBACK_API_KEY1 ||
    process.env.LLM_PROVIDERS,
);

if (!hasProviderKeys) {
  process.env.LLM_BASE_URL ||= "http://localhost:11434/v1";
  process.env.LLM_API_KEY ||= "ollama";
  process.env.LLM_MODEL ||= "qwen3:8b";
}



const ROOT = process.cwd();
const TOPICS_FILE = path.join(ROOT, "topics.txt");
const OUT_DIR = path.join(ROOT, "generated");
const OUT_FILE = path.join(OUT_DIR, "words.json");
const CACHE_FILE = path.join(OUT_DIR, "valid_cache.json");
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const VALIDATE_CONCURRENCY = Number(process.env.VALIDATE_CONCURRENCY || 6);

const { generateTopicWords, GENERIC, isInappropriate } = await import(
  "../api/_lib/words.js"
);

async function loadJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

const validCache = await loadJson(CACHE_FILE, {});

function normalize(word) {
  return String(word).toUpperCase().replace(/[^A-Z]/g, "");
}

function acceptable(word) {
  return (
    word.length >= 3 &&
    word.length <= 8 &&
    !GENERIC.has(word.toLowerCase()) &&
    !isInappropriate(word)
  );
}

async function isRealWord(word) {
  if (Object.prototype.hasOwnProperty.call(validCache, word)) {
    return validCache[word];
  }

  const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(
    word.toLowerCase(),
  )}&max=1`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`Datamuse ${res.status}`);
      const data = await res.json();
      const match = data?.[0]?.word;
      const ok = Boolean(match) && normalize(match) === word;
      validCache[word] = ok;
      return ok;
    } catch (err) {
      if (attempt === 2) {
        console.error(`  ! validation failed for ${word}: ${err.message}`);
        return false;
      }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return false;
}

async function validateWords(words) {
  const unique = Array.from(new Set(words.map(normalize).filter(acceptable)));
  const valid = new Set();
  const queue = [...unique];

  await Promise.all(
    Array.from({ length: VALIDATE_CONCURRENCY }, async () => {
      while (queue.length) {
        const word = queue.shift();
        if (await isRealWord(word)) valid.add(word);
      }
    }),
  );

  return unique.filter((word) => valid.has(word));
}

async function datamuseRelated(topic) {
  const queries = [
    `ml=${encodeURIComponent(topic)}`,
    `rel_trg=${encodeURIComponent(topic)}`,
  ];
  const seen = [];
  const set = new Set();

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://api.datamuse.com/words?${query}&max=100`,
        { signal: AbortSignal.timeout(20000) },
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data) {
        const word = normalize(item.word);
        if (acceptable(word) && !set.has(word)) {
          set.add(word);
          seen.push(word);
        }
      }
    } catch {
      // ignore and try the other query
    }
  }

  return seen;
}

function mix(words) {
  return {
    easy: words.filter((w) => w.length <= 8).length,
    long: words.filter((w) => w.length > 8).length,
  };
}

async function buildTopic(topic) {
  const valid = [];
  const candidates = [];

  for (let round = 0; round < 4 && valid.length < 16; round++) {
    const words = await generateTopicWords(topic, {
      exclude: valid,
      attempts: 2,
      count: 16,
    });
    candidates.push(...words);

    const fresh = await validateWords(words);
    for (const word of fresh) {
      if (valid.length < 16 && !valid.includes(word)) valid.push(word);
    }
  }

  if (valid.length < 16) {
    const related = await datamuseRelated(topic);
    for (const word of related) {
      if (valid.length >= 16) break;
      if (!valid.includes(word)) valid.push(word);
    }
  }

  if (valid.length < 16) {
    for (const word of candidates.map(normalize).filter(acceptable)) {
      if (valid.length >= 16) break;
      if (!valid.includes(word)) valid.push(word);
    }
  }

  if (valid.length < 15) {
    throw new Error(`Only ${valid.length} words for "${topic}"`);
  }

  return valid.slice(0, 16);
}

async function main() {
  const topics = (await readFile(TOPICS_FILE, "utf8"))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  await mkdir(OUT_DIR, { recursive: true });
  const results = await loadJson(OUT_FILE, {});
  const queue = topics.filter((topic) => !results[topic]?.length);

  console.log(
    `Model: ${process.env.LLM_MODEL} | topics: ${topics.length} | cached: ${
      topics.length - queue.length
    } | pending: ${queue.length}`,
  );

  let writeChain = Promise.resolve();
  const save = (file, data) => {
    writeChain = writeChain.then(() =>
      writeFile(file, JSON.stringify(data, null, 2)),
    );
    return writeChain;
  };

  const failed = [];
  let completed = 0;

  async function worker() {
    while (queue.length) {
      const topic = queue.shift();
      try {
        const words = await buildTopic(topic);
        results[topic] = words;
        completed++;
        const m = mix(words);
        console.log(
          `[${completed}/${topics.length}] ${topic} -> ${words.join(
            ", ",
          )} (easy ${m.easy}, long ${m.long})`,
        );
        await save(OUT_FILE, results);
        await save(CACHE_FILE, validCache);
      } catch (err) {
        failed.push({ topic, error: err.message });
        console.error(`FAILED ${topic}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await save(OUT_FILE, results);
  await save(CACHE_FILE, validCache);

  console.log(
    `\nSaved ${Object.keys(results).length}/${topics.length} topics to ${OUT_FILE}`,
  );
  if (failed.length) {
    console.error(`\nFailed (${failed.length}):`);
    for (const item of failed) console.error(`  - ${item.topic}: ${item.error}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
