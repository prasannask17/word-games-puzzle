import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const ROOT = process.cwd();
const OUT_PDF = path.join(ROOT, "word-search-puzzles.pdf");
const PORT = Number(process.env.PORT || 5180);

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
].filter(Boolean);

async function launchBrowser() {
  let lastError;
  for (const executablePath of CHROME_PATHS) {
    try {
      return await chromium.launch({ executablePath, headless: true });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function main() {
  const topics = (await readFile(path.join(ROOT, "topics.txt"), "utf8"))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const words = JSON.parse(
    await readFile(path.join(ROOT, "generated", "words.json"), "utf8"),
  );

  const missing = topics.filter((topic) => !words[topic]);
  if (missing.length) {
    throw new Error(
      `Missing cached words for ${missing.length} topic(s): ${missing.join(", ")}`,
    );
  }

  const server = await createServer({
    root: ROOT,
    logLevel: "error",
    server: { port: PORT, strictPort: true },
  });
  await server.listen();

  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  let intercepted = 0;
  await page.route("**/api/words**", async (route) => {
    const url = new URL(route.request().url());
    const topic = url.searchParams.get("topic");
    const topicWords = topic ? words[topic] : null;

    if (!topicWords) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: `No cached words for ${topic}` }),
      });
      return;
    }

    intercepted++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ words: topicWords }),
    });
  });

  try {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    await page.fill("#topics", topics.join(", "));
    await page.getByRole("button", { name: /Generate Puzzle|Regenerate/ }).click();

    const outcome = await page.waitForFunction(
      () => {
        const error = document.querySelector(".error-message");
        if (error) return { state: "error", message: error.textContent };
        const status = document.querySelector(".status-text");
        if (status && status.textContent.trim() === "Ready") {
          return { state: "ready" };
        }
        return false;
      },
      null,
      { timeout: 20 * 60 * 1000 },
    );
    const result = await outcome.jsonValue();
    if (result.state === "error") {
      throw new Error(`App error: ${result.message}`);
    }

    const pageCount = await page.locator(".page").count();
    const expected = topics.length + Math.ceil(topics.length / 4);
    console.log(
      `Generated ${topics.length} puzzles (${pageCount} pages, expected ${expected}); intercepted ${intercepted} API calls.`,
    );

    const downloadPromise = page.waitForEvent("download", {
      timeout: 30 * 60 * 1000,
    });
    await page
      .getByRole("button", { name: /Download PDF/i })
      .first()
      .click();
    const download = await downloadPromise;
    await download.saveAs(OUT_PDF);
    console.log(`Saved ${OUT_PDF}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
