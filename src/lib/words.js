function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateWords(topic, { retries = 2 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `/api/words?topic=${encodeURIComponent(topic)}`,
      );
      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Word service ${response.status}: ${body.slice(0, 300)}`,
        );
      }

      const data = await response.json();
      const words = Array.isArray(data.words) ? data.words : [];
      if (words.length < 15) {
        throw new Error(`Expected at least 15 words, got ${words.length}`);
      }
      return words.slice(0, 16);
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(1000 * (attempt + 1));
    }
  }

  throw lastError;
}
