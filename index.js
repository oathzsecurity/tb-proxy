import express from "express";
import fetch from "node-fetch";

console.log("🔥 tb-proxy LIVE VERSION - COMMISSIONER Z DO YOU SEE!: v2.1.0");

const app = express();
app.use(express.json());

// 🔁 Forward target (your real backend)
const FORWARD_URL = "https://api.oathzsecurity.com/event";

// ✅ Root test route (optional)
app.get("/", (req, res) => {
  res.status(200).send("tb-proxy OK (v2.1.0)");
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

    const text = await upstream.text();
    console.log(`➡️ Forwarded → ${FORWARD_URL} (${upstream.status})`);

    // ✅ Properly return JSON response for Cloudflare
    res.status(upstream.status);
    res.set("Content-Type", "application/json");
    return res.send(text);

  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.status(502);
    res.set("Content-Type", "application/json");
    return res.send(JSON.stringify({ error: "Proxy failure" }));
  }
});

// ✅ Catch-all (prevents default redirect)
app.all("*", (req, res) => {
  console.log(`❓ Unknown path: ${req.method} ${req.path}`);
  res.status(404).send("Not found");
});

// ✅ Listen (Railway will inject PORT)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`tb-proxy running on :${PORT}`);
});
