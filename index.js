import express from "express";
import fetch from "node-fetch";

console.log("🔥 tb-proxy LIVE VERSION - COMMISSIONER Z DO YOU SEE!: v2.1.0");

const app = express();
app.use(express.json());

// 🔁 Forward target (real backend on Railway)
const FORWARD_URL = "https://trackblock-backend.up.railway.app/event";

// ✅ Root test route (optional, for quick sanity check)
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

    // ✅ Return upstream status/text to the caller
    return res.status(upstream.status).send(text);

  } catch (err) {
    console.error("❌ Proxy error:", err);
    return res.status(502).send("Proxy failure");
  }
});

// ✅ Catch-all (prevents 404 confusion)
app.all("*", (req, res) => {
  console.log(`❓ Unknown path: ${req.method} ${req.path}`);
  return res.status(404).send("Not found");
});

// ✅ Listen (Railway will inject PORT)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`tb-proxy running on :${PORT}`);
});
