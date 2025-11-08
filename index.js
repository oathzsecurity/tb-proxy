// tb-proxy: HTTP → HTTPS forwarder for SIM7600
// Accepts POST /event via plain HTTP and relays to backend over TLS

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "1mb" }));

// MUST be set in Railway → Variables → FORWARD_URL = https://api.oathzsecurity.com/event
const forwardUrl = process.env.FORWARD_URL;
if (!forwardUrl) {
  console.error("❌ Missing FORWARD_URL env var");
  process.exit(1);
}

app.get("/", (_, res) => {
  res.send("tb-proxy OK");
});

// Main relay route
app.post("/event", async (req, res) => {
  try {
    const upstream = await fetch(forwardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    console.log(`➡️  Forwarded → ${forwardUrl} (${upstream.status})`);
    res.status(upstream.status).send(text);
  } catch (err) {
    console.error("❌ Proxy error", err);
    res.status(502).send("Proxy failure");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`tb-proxy running on :${PORT}`));
