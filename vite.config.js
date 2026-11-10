import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function wordsApiPlugin() {
  return {
    name: "words-api",
    configureServer(server) {
      server.middlewares.use("/api/words", async (req, res) => {
        try {
          const { generateTopicWords } = await import("./api/_lib/words.js");
          const url = new URL(req.url || "/", "http://localhost");
          const topic = (url.searchParams.get("topic") || "").trim();

          if (!topic) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Missing topic" }));
            return;
          }

          const words = await generateTopicWords(topic);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify({ words }));
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message || "Failed to generate words" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [react(), wordsApiPlugin()],
  };
});
