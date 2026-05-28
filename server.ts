import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { generateAIMove } from "./server/ai.service.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// AI Move Endpoint
app.post("/api/ai-move", async (req, res) => {
  try {
    const { board, level, temperature } = req.body;
    
    // Type casting and defaults
    const currentLevel = typeof level === 'number' ? level : 5;
    const currentTemp = typeof temperature === 'number' ? temperature : 0.1;

    const { move, message } = await generateAIMove(board, currentLevel, currentTemp);
    res.json({ move, message });
  } catch (error) {
    console.error("AI Move Error:", error);
    res.status(500).json({ error: "API Failure" });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
