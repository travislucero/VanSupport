import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Root route
app.get("/", (req, res) => {
  res.send("🚚 Hello from MAX - Mobile AI Xpress Support server!");
});

// Status route (returns JSON)
app.get("/status", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime().toFixed(0) + "s",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
