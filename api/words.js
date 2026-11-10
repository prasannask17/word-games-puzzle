import { generateTopicWords } from "./_lib/words.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const topic = (req.query?.topic || url.searchParams.get("topic") || "").trim();

  if (!topic) {
    res.status(400).json({ error: "Missing topic" });
    return;
  }

  const key = topic.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({ words: cached.words, cached: true });
    return;
  }

  try {
    const words = await generateTopicWords(topic);
    cache.set(key, { words, at: Date.now() });
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({ words });
  } catch (err) {
    res.status(502).json({ error: err.message || "Failed to generate words" });
  }
}
