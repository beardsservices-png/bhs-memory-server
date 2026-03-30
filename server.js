import express from "express";
import { Retell } from "retell-sdk";
import { db, upsertCaller, getCaller } from "./db.js";

const app = express();

// Raw body needed for Retell signature verification on /webhook
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ─── INBOUND CALL WEBHOOK (pre-call lookup) ───────────────────────────────────
// Retell fires this BEFORE the call connects. We look up the caller and inject
// their history into William's prompt as dynamic variables.
app.post("/inbound", (req, res) => {
  const { call_inbound } = req.body;
  const fromNumber = call_inbound?.from_number;

  if (!fromNumber) {
    // No number — let the call through with no overrides
    return res.status(200).json({});
  }

  const caller = getCaller(fromNumber);

  if (!caller) {
    // First-time caller — no memory to inject, proceed normally
    return res.status(200).json({});
  }

  // Returning caller — build context string for William's prompt
  const lastCallDate = caller.last_call_date
    ? new Date(caller.last_call_date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  const contextLines = [];
  if (caller.name) contextLines.push(`Caller's name: ${caller.name}`);
  if (caller.callback_number) contextLines.push(`Their callback number on file: ${caller.callback_number}`);
  if (caller.last_service) contextLines.push(`Last job they called about: ${caller.last_service}`);
  if (caller.last_location) contextLines.push(`Job location previously mentioned: ${caller.last_location}`);
  if (caller.notes) contextLines.push(`Notes from prior call: ${caller.notes}`);
  if (lastCallDate) contextLines.push(`Last call was on: ${lastCallDate}`);

  const callerContext = contextLines.join("\n");

  // Build a personalized greeting that William will use
  const firstName = caller.name ? caller.name.split(" ")[0] : null;
  const beginMessage = firstName
    ? `Hey ${firstName}, good to hear from you — Brian's not available right now but I can help. What's going on?`
    : `Hey, good to hear from you again — Brian's not available right now but I can help. What's going on?`;

  return res.status(200).json({
    call_inbound: {
      dynamic_variables: {
        returning_caller: "true",
        caller_context: callerContext,
        caller_name_on_file: caller.name || "",
        callback_number_on_file: caller.callback_number || "",
        last_service_on_file: caller.last_service || "",
      },
      agent_override: {
        retell_llm: {
          begin_message: beginMessage,
        },
      },
    },
  });
});

// ─── POST-CALL WEBHOOK (call_analyzed — write to memory) ─────────────────────
// Fires after Retell finishes analyzing the call. Contains the full transcript
// and all extracted fields. We write/update the caller's record here.
app.post("/webhook", (req, res) => {
  // Verify the signature so we only accept payloads from Retell
  if (
    !Retell.verify(
      req.body.toString("utf-8"),
      process.env.RETELL_API_KEY,
      req.headers["x-retell-signature"] ?? ""
    )
  ) {
    console.error("Webhook signature invalid — rejected");
    return res.status(401).send();
  }

  const { event, call } = JSON.parse(req.body.toString("utf-8"));

  if (event === "call_analyzed" && call) {
    const fromNumber = call.from_number;
    const analysis = call.call_analysis?.custom_analysis_data || {};

    // Only store records where we got at least a name or the call was meaningful
    const callDurationSec = call.end_timestamp && call.start_timestamp
      ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
      : 0;

    if (fromNumber && callDurationSec > 15) {
      upsertCaller({
        phone: fromNumber,
        name: analysis.caller_name || null,
        callback_number: analysis.caller_phone || null,
        last_service: analysis.service_needed || null,
        last_location: analysis.job_location || null,
        notes: analysis.caller_notes || null,
        last_call_id: call.call_id || null,
        last_call_date: call.end_timestamp
          ? new Date(call.end_timestamp).toISOString()
          : new Date().toISOString(),
        call_summary: call.call_analysis?.call_summary || null,
        sentiment: call.call_analysis?.user_sentiment || null,
      });

      console.log(`[call_analyzed] Saved caller record for ${fromNumber} — ${analysis.caller_name || "unnamed"}`);
    } else {
      console.log(`[call_analyzed] Skipped short/incomplete call from ${fromNumber} (${callDurationSec}s)`);
    }
  }

  res.status(204).send();
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok", service: "BHS Memory Server" }));

// ─── ADMIN: VIEW ALL CALLER RECORDS (for debugging) ──────────────────────────
app.get("/callers", (req, res) => {
  const rows = db.prepare("SELECT * FROM callers ORDER BY last_call_date DESC").all();
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`BHS Memory Server running on port ${PORT}`);
});
