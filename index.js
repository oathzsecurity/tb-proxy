import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔁 Forward target (your real backend)
const FORWARD_URL = "https://api.oathzsecurity.com/event";

// ✅ Root test route (optional)
app.get("/", (req, res) => {
  res.status(200).send("tb-proxy OK");
});

// ✅ Main relay route
app.post("/event", async (req, res) => {
  try {
    console.log("📩 Incoming POST /event from device");
    console.log("Body:", req.body);

    const upstream = await fetch(FORWARD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    console.log(`➡️  Forwarded → ${FORWARD_URL} (${upstream.status})`);

    // ✅ MUST return so Express does not redirect (fixes 301)
    return res.status(upstream.status).send(text);

  } catch (err) {
    console.error("❌ Proxy error:", err);

    // ✅ Must return here too, otherwise Express continues and 301s
    return res.status(502).send("Proxy failure");
  }
});

// ✅ Everything else = 404
app.all("*", (req, res) => {
  console.log(`❓ Unknown path: ${req.method} ${req.path}`);
  return res.status(404).send("Not found");
});

// ✅ Railway PORT binding
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`tb-proxy running on :${PORT}`)
);
