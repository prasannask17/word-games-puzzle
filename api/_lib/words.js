import { buildPrompt } from "./prompt.js";
import { isInappropriate } from "./blocklist.js";

const GENERIC = new Set(
  "thing things stuff people person persons type types kind kinds form forms part parts system systems process processes related various different used using make made new old first last many most some such other large small famous character characters equipment item items style styles service services supply supplies tool tools trait traits feeling feelings accessory accessories cosmetic cosmetics instrument instruments".split(
    /\s+/,
  ),
);

function collectKeys(baseName) {
  const keys = [];
  const addKey = (value) => {
    const key = String(value || "").trim();
    if (key && !keys.includes(key)) keys.push(key);
  };

  addKey(process.env[baseName]);
  for (let i = 1; i <= 20; i++) {
    addKey(process.env[`${baseName}${i}`]);
    addKey(process.env[`${baseName}_${i}`]);
  }

  return keys;
}

const cooldowns = new Map();

function providerId(provider) {
  return `${provider.baseUrl}|${provider.model}|${provider.apiKey}`;
}

function isCoolingDown(provider) {
  const until = cooldowns.get(providerId(provider));
  return Boolean(until && until > Date.now());
}

function coolDown(provider, ms) {
  cooldowns.set(providerId(provider), Date.now() + ms);
}

function providerConfigs() {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 60000);
  const providers = [];
  const seen = new Set();

  const add = (provider) => {
    if (!provider.baseUrl || !provider.apiKey || !provider.model) return;
    const key = `${provider.baseUrl}|${provider.model}|${provider.apiKey}`;
    if (seen.has(key)) return;
    seen.add(key);
    providers.push(provider);
  };

  const primaryBase = (
    process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1"
  ).replace(/\/$/, "");
  const primaryModel =
    process.env.LLM_MODEL || "llama-3.3-70b-versatile";
  const primaryName = process.env.LLM_NAME || primaryModel;
  const primaryKeys = collectKeys("LLM_API_KEY");

  primaryKeys.forEach((apiKey, index) => {
    add({
      name: `${primaryName}${primaryKeys.length > 1 ? ` #${index + 1}` : ""}`,
      baseUrl: primaryBase,
      apiKey,
      model: primaryModel,
      jsonMode: process.env.LLM_JSON_MODE !== "false",
      timeoutMs,
    });
  });

  const fallbackKeys = collectKeys("LLM_FALLBACK_API_KEY");
  const fallbackBase = (
    process.env.LLM_FALLBACK_BASE_URL ||
    (fallbackKeys.length ? "https://api.cohere.ai/compatibility/v1" : "")
  ).replace(/\/$/, "");
  const fallbackModel =
    process.env.LLM_FALLBACK_MODEL ||
    (fallbackKeys.length ? "command-a-plus-05-2026" : "");
  const fallbackName =
    process.env.LLM_FALLBACK_NAME || fallbackModel || "fallback";

  fallbackKeys.forEach((apiKey, index) => {
    add({
      name: `${fallbackName}${
        fallbackKeys.length > 1 ? ` #${index + 1}` : ""
      }`,
      baseUrl: fallbackBase,
      apiKey,
      model: fallbackModel,
      jsonMode: process.env.LLM_FALLBACK_JSON_MODE !== "false",
      timeoutMs: Number(process.env.LLM_FALLBACK_TIMEOUT_MS || timeoutMs),
    });
  });

  if (process.env.LLM_PROVIDERS) {
    try {
      const parsed = JSON.parse(process.env.LLM_PROVIDERS);
      for (const item of parsed) {
        const keys = Array.isArray(item.apiKeys)
          ? item.apiKeys
          : [item.apiKey];
        for (const apiKey of keys) {
          add({
            name: item.name || item.model || "provider",
            baseUrl: String(item.baseUrl || "").replace(/\/$/, ""),
            apiKey: apiKey || "",
            model: item.model || "",
            jsonMode: item.jsonMode !== false,
            timeoutMs: Number(item.timeoutMs || timeoutMs),
          });
        }
      }
    } catch (err) {
      console.warn(`Ignoring invalid LLM_PROVIDERS JSON: ${err.message}`);
    }
  }

  return providers;
}

function clean(raw) {
  const words = raw
    .map((word) => String(word).toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((word) => word.length >= 3 && word.length <= 8)
    .filter((word) => !GENERIC.has(word.toLowerCase()))
    .filter((word) => !isInappropriate(word));
  return Array.from(new Set(words));
}

function collectStrings(value, out) {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
}

function extractWords(content) {
  let text = String(content || "").trim();
  text = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  const attempts = [];
  attempts.push(text);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) attempts.push(text.slice(start, end + 1));
  const arrStart = text.indexOf("[");
  const arrEnd = text.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) attempts.push(text.slice(arrStart, arrEnd + 1));

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      const strings = [];
      collectStrings(parsed, strings);
      const words = clean(strings);
      if (words.length > 0) return words;
    } catch {
      // try the next shape
    }
  }

  return clean(text.match(/[A-Za-z]+/g) || []);
}

function mixHint(words) {
  const hard = words.filter((word) => word.length > 8).length;
  if (hard === 0) return "";
  return `\n\nCorrection: every word must be easy, common, 3-8 letters long and suitable for young children. Do not use long, tricky or inappropriate words. Return exactly 16 words.`;
}

function llmError(prefix, status, text) {
  const err = new Error(`${prefix} ${status}: ${String(text).slice(0, 300)}`);
  err.status = status;
  return err;
}

async function callModel(prompt, provider) {
  const { baseUrl, apiKey, model, timeoutMs, jsonMode } = provider;
  if (!apiKey) {
    throw new Error(
      "Word service is not configured. Set LLM_API_KEY, LLM_BASE_URL and LLM_MODEL.",
    );
  }

  const isOllama = /(?:localhost|127\.0\.0\.1):11434/.test(baseUrl);
  if (isOllama) {
    const nativeBase = baseUrl.replace(/\/v1$/, "");
    const response = await fetch(`${nativeBase}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        think: false,
        format: {
          type: "object",
          properties: {
            words: {
              type: "array",
              items: { type: "string" },
              minItems: 16,
              maxItems: 16,
            },
          },
          required: ["words"],
        },
        options: { temperature: 0.8, num_predict: 2000 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      throw llmError("Ollama", response.status, body);
    }

    const data = await response.json();
    if (!data.response) throw new Error("Ollama returned an empty response");
    return data.response;
  }

  const body = {
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a word-search word curator. Return only valid JSON with a words array.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const request = () =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

  let response = await request();

  if (!response.ok) {
    const text = await response.text();
    const canRetryWithoutJson =
      jsonMode &&
      response.status === 400 &&
      /response_format|json_object|json_schema/i.test(text);

    if (!canRetryWithoutJson) {
      throw llmError("LLM", response.status, text);
    }

    delete body.response_format;
    response = await request();
    if (!response.ok) {
      const retryText = await response.text();
      throw llmError("LLM", response.status, retryText);
    }
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned an empty response");
  return content;
}

export async function generateTopicWords(topic, options = {}) {
  const attempts = options.attempts || 3;
  const count = options.count || 16;
  const exclude = options.exclude || [];
  const cleanTopic = String(topic || "").trim();
  if (!cleanTopic) throw new Error("Topic is required");

  const providers = providerConfigs();
  if (!providers.length) {
    throw new Error(
      "Word service is not configured. Set LLM_API_KEY, LLM_BASE_URL and LLM_MODEL.",
    );
  }

  let previous = [];
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const prompt =
      buildPrompt(cleanTopic, { exclude, count }) +
      (attempt > 1 ? mixHint(previous) : "");

    const available = providers.filter(
      (provider) => !isCoolingDown(provider),
    );
    const candidates = available.length ? available : providers;
    if (!available.length) {
      console.warn(
        `[words] all providers are cooling down; trying anyway for "${cleanTopic}"`,
      );
    }

    for (const provider of candidates) {
      try {
        const content = await callModel(prompt, provider);
        const words = extractWords(content);
        previous = words;

        if (words.length >= count) return words.slice(0, count);

        lastError = new Error(
          `${provider.name} returned only ${words.length} valid words`,
        );
        console.warn(
          `[words] ${provider.name} returned ${words.length}/${count} for "${cleanTopic}"; trying next provider`,
        );
      } catch (err) {
        lastError = err;
        if (err.status === 429) {
          coolDown(
            provider,
            Number(process.env.LLM_COOLDOWN_MS || 60000),
          );
        } else if (err.status === 401 || err.status === 403) {
          coolDown(
            provider,
            Number(process.env.LLM_AUTH_COOLDOWN_MS || 600000),
          );
        }
        console.warn(
          `[words] ${provider.name} failed for "${cleanTopic}": ${err.message}`,
        );
      }
    }
  }

  throw lastError || new Error(`Could not generate words for "${cleanTopic}"`);
}

export { GENERIC, isInappropriate };
