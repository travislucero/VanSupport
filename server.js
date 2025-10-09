import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// 1. Create the Supabase client using your environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 2. Serve static files from dashboard/dist
app.use(express.static(path.join(__dirname, "dashboard", "dist")));

// 3. API routes (must come before catch-all route)
app.get("/test-supabase", async (req, res) => {
  // Try to pull just one row from session_events
  const { data, error } = await supabase
    .from("session_events")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Supabase error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.get("/api/session-events", async (req, res) => {
  const { data, error } = await supabase
    .from("session_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/resolution-by-step", async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = { p_start_date: from, p_end_date: to };
    }

    const { data, error } = await supabase.rpc(
      "get_resolution_by_step",
      params
    );

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard-summary", async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = { p_start_date: from, p_end_date: to };
    }

    const { data, error } = await supabase.rpc(
      "get_dashboard_summary",
      params
    );

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/issue-distribution", async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = { p_start_date: from, p_end_date: to };
    }

    const { data, error } = await supabase.rpc(
      "get_issue_distribution",
      params
    );

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/resolution-time-trend", async (req, res) => {
  try {
    const { days, from, to, interval = "day" } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
        p_interval: interval,
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
        p_interval: interval,
      };
    }

    console.log("📉 Resolution Time Trend - Request params:", { days, from, to, interval });
    console.log("📉 Resolution Time Trend - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_resolution_time_trend",
      params
    );

    if (error) {
      console.error("📉 Resolution Time Trend - Supabase error:", error);
      throw error;
    }

    console.log("📉 Resolution Time Trend - Data returned:", data);
    console.log("📉 Resolution Time Trend - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("📉 Resolution Time Trend - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/first-contact-resolution", async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
      };
    }

    console.log("📊 First Contact Resolution - Request params:", { days, from, to });
    console.log("📊 First Contact Resolution - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_first_contact_resolution",
      params
    );

    if (error) {
      console.error("📊 First Contact Resolution - Supabase error:", error);
      throw error;
    }

    console.log("📊 First Contact Resolution - Data returned:", data);
    console.log("📊 First Contact Resolution - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("📊 First Contact Resolution - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/van-performance", async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
      };
    }

    console.log("🚐 Van Performance - Request params:", { days, from, to });
    console.log("🚐 Van Performance - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_van_performance",
      params
    );

    if (error) {
      console.error("🚐 Van Performance - Supabase error:", error);
      throw error;
    }

    console.log("🚐 Van Performance - Data returned:", data);
    console.log("🚐 Van Performance - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("🚐 Van Performance - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chronic-problem-vans", async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
      };
    }

    console.log("⚠️ Chronic Problem Vans - Request params:", { days, from, to });
    console.log("⚠️ Chronic Problem Vans - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_chronic_problem_vans",
      params
    );

    if (error) {
      console.error("⚠️ Chronic Problem Vans - Supabase error:", error);
      throw error;
    }

    console.log("⚠️ Chronic Problem Vans - Data returned:", data);
    console.log("⚠️ Chronic Problem Vans - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("⚠️ Chronic Problem Vans - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/handoff-patterns", async (req, res) => {
  try {
    console.log("🔄 Handoff Patterns - Calling function without parameters (may not accept date filters)");

    // Try calling without parameters first - the function may not accept date filters
    const { data, error } = await supabase.rpc("get_handoff_patterns");

    if (error) {
      console.error("🔄 Handoff Patterns - Supabase error:", error);
      console.error("🔄 Handoff Patterns - Full error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    console.log("🔄 Handoff Patterns - Data returned:", data);
    console.log("🔄 Handoff Patterns - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("🔄 Handoff Patterns - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/call-volume-heatmap", async (req, res) => {
  try {
    const { days, from, to } = req.query;

    let params = {};

    if (days) {
      params = {
        p_start_date: new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString(),
        p_end_date: new Date().toISOString(),
      };
    } else if (from && to) {
      params = {
        p_start_date: from,
        p_end_date: to,
      };
    }

    console.log("🔥 Call Volume Heatmap - Request params:", { days, from, to });
    console.log("🔥 Call Volume Heatmap - Supabase params:", params);

    const { data, error } = await supabase.rpc(
      "get_call_volume_heatmap",
      params
    );

    if (error) {
      console.error("🔥 Call Volume Heatmap - Supabase error:", error);
      throw error;
    }

    console.log("🔥 Call Volume Heatmap - Data returned:", data);
    console.log("🔥 Call Volume Heatmap - Row count:", data?.length || 0);

    res.json(data);
  } catch (err) {
    console.error("🔥 Call Volume Heatmap - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all route: serve index.html for React Router (Express 5 compatible)
app.get("/*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dashboard", "dist", "index.html"));
});

// 4. Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
