import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini API
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// AI Move Endpoint
app.post("/api/ai-move", async (req, res) => {
  try {
    const { board, level, temperature } = req.body;

    if (!board || !Array.isArray(board)) {
      return res.status(400).json({ error: "Invalid board data" });
    }

    const levelInstructions: Record<number, string> = {
      1: "You are the O player. You are a beginner and should play almost randomly. Do not worry about strategy.",
      2: "You are the O player. You are a casual player. Play mostly randomly but try to block immediate wins if you see them.",
      3: "You are the O player. You are an intermediate player. Try to play strategically but occasionally make mistakes.",
      4: "You are the O player. You are an advanced player. Play very strategically and try to win or force a draw.",
      5: "You are the O player. You are a Grandmaster. Under no circumstances should you ever lose. Play perfectly."
    };

    const instruction = levelInstructions[level as number] || levelInstructions[5];

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: JSON.stringify(board),
      config: {
        systemInstruction: `${instruction} The board is a 9-element array indexed 0–8. Respond with ONLY a single integer for your move. Only choose cells where the value is null.`,
        temperature: typeof temperature === 'number' ? temperature : 0.1,
      },
    });

    const moveString = response.text?.trim() || "";
    const move = parseInt(moveString, 10);

    if (isNaN(move) || move < 0 || move > 8 || board[move] !== null) {
      console.warn("Invalid AI response, falling back to random move:", moveString);
      throw new Error("Invalid move response");
    }

    res.json({ move });
  } catch (error) {
    console.error("AI Move Error:", error);
    // Fallback: This is handled on the client, but we can also return a specific error
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
