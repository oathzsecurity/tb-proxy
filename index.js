import express from "express";
import fetch from "node-fetch";
import twilio from "twilio";

console.log("🔥 tb-proxy LIVE VERSION v3.0.0 — OATHZ Relay + Twilio Alerts Online");

const app = express();
app.use(express.json());

// 🛰 Backend forward target
const FORWARD_URL = process.env.FORWARD_URL || "https://api.oathzsecurity.com/event";

// 🟢 Twilio Environment Vars (MUST exist in Railway)
const TWILIO_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM   = process.env.TWILIO_NUMBER;
const TWILIO_TO     = process.env.TWILIO_NOTIFY_NUMBER;   // <— YOUR number for now

let twilioClient = null;

// Only initialise client if all vars exist
if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
  twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
  console.log("📞 Twilio client initialised");
} else {
  console.log("⚠️ Twilio disabled — missing environment vars");
}

// ======================
// ROOT TEST ROUTES
// ======================
app.get("/", (req, res) => {
  res.status(200).send("tb-proxy OK (v3.0.0)");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "tb-proxy",
    version: "v3.0.0",
    twilio_ready: !!twilioClient,
    forward_url: FORWARD_URL,
    timestamp: new Date().toISOString()
  });
});

// ============================
//   🔥 MAIN RELAY + ALERT LOGIC
// ============================
app.post("/event", async (req, res) => {
  console.log("📡 PROXY HIT /event");
  console.log("📩 Incoming:", req.body);

  const { event_type, device_id, latitude, longitude } = req.body;

  // 🛑 SAFETY CHECK — prevent undefined numbers
  const alertsEnabled = twilioClient && TWILIO_TO && TWILIO_FROM;

  // ============================
  // 🔔 AUTO ALERT ON MOVEMENT
  // ============================
  if (event_type === "movement_confirmed" && alertsEnabled) {
    console.log("🚨 MOVEMENT CONFIRMED — FIRING TWILIO ALERTS");

    try {
      const smsBody =
        `🚨 TRACKBLOCK ALERT 🚨\n` +
        `${device_id} IS MOVING!\n\n` +
        (latitude && longitude
          ? `LIVE LOCATION:\n${latitude}, ${longitude}`
          : `NO GPS FIX YET`);

      // SEND SMS
      await twilioClient.messages.create({
        body: smsBody,
        from: TWILIO_FROM,
        to: TWILIO_TO
      });

      console.log("📲 SMS SENT");

      // SEND 10-SECOND CALL
      await twilioClient.calls.create({
        to: TWILIO_TO,
        from: TWILIO_FROM,
        twiml: `<Response><Say voice="man">Warning. Your Trackblock device is moving. Check your dashboard immediately.</Say></Response>`
      });

      console.log("📞 CALL PLACED");
    } catch (err) {
      console.error("❌ TWILIO ERROR:", err);
    }
  }

  // ============================
  // 🔁 FORWARD EVENT TO BACKEND
  // ============================
  try {
    const upstream = await fetch(FORWARD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const upstreamText = await upstream.text();
    console.log(`➡️ Forwarded → ${FORWARD_URL} (${upstream.status})`);

    res.status(upstream.status || 200);
    res.set("Content-Type", "application/json");

    if (upstreamText.trim().startsWith("{")) {
      return res.send(upstreamText);
    } else {
      return res.send(JSON.stringify({ ok: true, forwarded: true }));
    }

  } catch (err) {
    console.error("❌ PROXY ERROR:", err);
    res.status(502).json({ error: "proxy_failure", details: err.message });
  }
});

// ======================
//  404 FALLBACK
// ======================
app.all("*", (req, res) => {
  console.log(`❓ Unknown route ${req.method} ${req.path}`);
  res.status(404).send("Not found");
});

// ======================
//  LISTEN
// ======================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🟢 tb-proxy listening on ${PORT}`);
});
