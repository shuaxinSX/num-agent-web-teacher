import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import authRouter from "./auth.js";
import agentRouter from "./agent.js";

// Load dotenv from root directory
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config(); // also load local .env if exists

const app = express();

// Basic middlewares
app.use(cors({
  origin: "*", // allow all or customize
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount API routes
app.use("/api/auth", authRouter);
app.use("/api", agentRouter);

// Serve static frontend assets in production
const publicPath = path.resolve(process.cwd(), "public");
const distPath = path.resolve(process.cwd(), "../dist");

let staticDir = null;
if (fs.existsSync(publicPath)) {
  staticDir = publicPath;
} else if (fs.existsSync(distPath)) {
  staticDir = distPath;
}

if (staticDir) {
  console.log(`Serving static files from: ${staticDir}`);
  app.use(express.static(staticDir));
  
  // Fallback to index.html for SPA routing
  app.get("*", (req, res, next) => {
    // If request looks like an API call, let it go to 404
    if (req.url.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(staticDir, "index.html"));
  });
} else {
  console.log("No static frontend directory found (running in pure API mode).");
  app.get("/", (req, res) => {
    res.json({ message: "Numerical Analysis Agent Backend running." });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "服务器内部错误，请稍后重试。" });
});

// Configure port
const PORT = process.env.PORT || process.env.AGENT_PORT || process.env.VITE_AGENT_PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
