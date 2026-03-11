import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mock endpoint for physiological data (simulating IoT device)
  app.get("/api/physiological/:uid", (req, res) => {
    const { uid } = req.params;
    // Simulate real-world data with slight variations
    res.json({
      uid,
      hrv: [62, 65, 58, 70, 68, 72, 64].map(v => v + Math.floor(Math.random() * 10 - 5)),
      restingHR: [72, 70, 75, 68, 69, 67, 71].map(v => v + Math.floor(Math.random() * 6 - 3)),
      sleepDuration: [7.2, 6.5, 5.8, 7.5, 8.0, 7.2, 6.8],
      deepSleepRatio: [25, 22, 18, 28, 30, 26, 24],
      activityLevel: [8000, 6500, 4000, 9000, 11000, 7500, 8200],
      timestamps: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    });
  });

  // Mock workload data endpoint (simulating teaching system integration)
  app.get("/api/workload/:uid", (req, res) => {
    res.json({
      classHours: 16 + Math.floor(Math.random() * 6),
      meetingHours: 4 + Math.floor(Math.random() * 4),
      nonTeachingTasks: 3 + Math.floor(Math.random() * 5),
      totalWorkloadIndex: 65 + Math.floor(Math.random() * 20)
    });
  });

  // IRT-based question selection mock
  app.post("/api/assessment/next-questions", (req, res) => {
    const { type, history } = req.body;
    // In a real IRT system, this would analyze 'history' to pick the most informative next questions
    // Here we just return a subset
    res.json({
      nextBatch: [1, 5, 12, 18, 25], // Mock IDs
      isComplete: history.length > 20 // Stop after 20 questions for demo
    });
  });

  // 2.1 Risk Algorithm Engine (Mock LSTM)
  app.post("/api/risk-engine/analyze/:uid", (req, res) => {
    const { uid } = req.params;
    // Simulate LSTM processing of time-series data
    const riskScore = Math.random();
    const depressionIndex = Math.random() * 3; // 0-3 scale
    
    let warningTriggered = false;
    let warningLevel = null;

    if (depressionIndex >= 2.0 || riskScore > 0.75) {
      warningTriggered = true;
      warningLevel = riskScore > 0.9 ? 'emergency' : (riskScore > 0.8 ? 'intervention' : 'attention');
    }

    res.json({
      uid,
      riskScore,
      depressionIndex,
      warningTriggered,
      warningLevel,
      factors: [
        riskScore > 0.6 ? "HRV 持续下降 (RMSSD < 20ms)" : null,
        depressionIndex > 1.5 ? "抑郁因子分显著升高" : null,
        "工作负荷指数处于高位 (72/100)",
        "社交活跃度近一周下降 30%"
      ].filter(Boolean),
      patterns: riskScore > 0.7 ? ["高负荷-低支持复合风险"] : ["常规波动"]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
