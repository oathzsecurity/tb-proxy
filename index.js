import express from "express";
import fetch from "node-fetch";
import twilio from "twilio";

console.log("🔥 tb-proxy LIVE VERSION v3.0.0 — OATHZ Relay + Twilio Alerts Online");

const app = express();
app.use(express.json());

// 🛰 MAIN BACKEND TARGET
const FORWARD_URL = process.env.FORWARD_URL || "https://api.oathzsecurity.com/event";

// 🛜 TWILIO CREDS (loaded from Railway variables)
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_NUMBER
} = process.env;

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

// ======================================================
// 🩺 Root test route
// ======================================================
app.get("/", (req, res) => {
  res.status(200).send("tb-proxy OK (v3.0.0)");
});

// ======================================================
// ❤️ HEALTH CHECK
// ======================================================
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "tb-proxy",
    version: "v3.0.0",
    timestamp: new Date().toISOString(),
    twilio_ready: !!twilioClient
  });
});

// ======================================================
// 📡 CORE FORWARDING RELAY
// ======================================================
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

// ======================================================
// 📩 SEND SMS VIA TWILIO
// ======================================================
app.post("/twilio/sms", async (req, res) => {
  if (!twilioClient) {
    return res.status(500).json({ ok: false, error: "Twilio not configured" });
  }

  const { to, body } = req.body;

  if (!to || !body) {
    return res.status(400).json({ ok: false, error: "Missing 'to' or 'body'" });
  }

  console.log(`📨 Sending SMS → ${to}`);

  try {
    const msg = await twilioClient.messages.create({
      from: TWILIO_NUMBER,
      to,
      body
    });

    res.json({ ok: true, sid: msg.sid });
  } catch (err) {
    console.error("❌ SMS ERROR:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ======================================================
// ☎️ MAKE 10-SECOND ALERT CALL
// ======================================================
app.post("/twilio/call", async (req, res) => {
  if (!twilioClient) {
    return res.status(500).json({ ok: false, error: "Twilio not configured" });
  }

  const { to } = req.body;

  if (!to) {
    return res.status(400).json({ ok: false, error: "Missing 'to'" });
  }

  console.log(`📞 Calling → ${to}`);

  try {
    const call = await twilioClient.calls.create({
      from: TWILIO_NUMBER,
      to,
      url: "https://trackblock-alerts.s3.amazonaws.com/alert.xml"
    });

    res.json({ ok: true, sid: call.sid });
  } catch (err) {
    console.error("❌ CALL ERROR:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ======================================================
// 🚫 CATCH-ALL
// ======================================================
app.all("*", (req, res) => {
  console.log(`❓ Unknown path: ${req.method} ${req.path}`);
  res.status(404).json({ ok: false, error: "Not found" });
});

// ======================================================
// 🚀 START SERVER
// ======================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🟢 tb-proxy running on :${PORT}`);
});
