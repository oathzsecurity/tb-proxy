import express from "express";
import fetch from "node-fetch";

console.log("🔥 tb-proxy LIVE VERSION v2.3.0 — OATHZ Relay Online");

const app = express();
app.use(express.json());

// 🛰 Forward target (main backend)
const FORWARD_URL = "https://api.oathzsecurity.com/event";

// ✅ Root test route
app.get("/", (req, res) => {
  res.status(200).send("tb-proxy OK (v2.3.0)");
});

// ✅ Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "tb-proxy",
    version: "v2.3.0",
    timestamp: new Date().toISOString()
  });
});

// ✅ Main relay route
app.post("/event", async (req, res) => {
  console.log("📡 PROXY HIT /event");
  console.log("📩 Incoming body:", req.body);

  try {
    const upstream = await fetch(FORWARD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const result = await upstream.text();
    console.log(`➡️ Forwarded → ${FORWARD_URL} (${upstream.status})`);

    // ✅ Cloudflare-safe JSON return
    res.status(upstream.status || 200);
    res.set("Content-Type", "application/json");

    if (result.trim().startsWith("{")) {
      return res.send(result);
    } else {
      return res.send(JSON.stringify({ ok: true, forwarded: true }));
    }

  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.status(502).json({ error: "Proxy failure", details: err.message });
  }
});

// ✅ Catch-all (prevents Cloudflare 404 fallthrough)
app.all("*", (req, res) => {
  console.log(`❓ Unknown path: ${req.method} ${req.path}`);
  res.status(404).send("Not found");
});

// ✅ Listen (Railway injects PORT automatically)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`tb-proxy running on :${PORT}`);
});
