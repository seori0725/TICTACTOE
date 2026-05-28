import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const LEVEL_INSTRUCTIONS: Record<number, string> = {
  1: "You are the O player. You are a beginner and should play almost randomly. Do not worry about strategy. Say something confused or silly in Korean.",
  2: "You are the O player. You are a casual player. Play mostly randomly but try to block immediate wins if you see them. Say something casual and friendly in Korean.",
  3: "You are the O player. You are an intermediate player. Try to play strategically but occasionally make mistakes. Say something confident but slightly flawed in Korean.",
  4: "You are the O player. You are an advanced player. Play very strategically and try to win or force a draw. Say something slightly intimidating and smart in Korean.",
  5: "You are the O player. You are a Grandmaster. Under no circumstances should you ever lose. Play perfectly. Say something extremely arrogant and overpowering in Korean, like an anime villain."
};

export async function generateAIMove(board: (string | null)[], level: number, temperature: number = 0.1): Promise<{move: number, message: string}> {
  if (!board || !Array.isArray(board) || board.length !== 9) {
    throw new Error("Invalid board data");
  }

  const instruction = LEVEL_INSTRUCTIONS[level] || LEVEL_INSTRUCTIONS[5];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: JSON.stringify(board),
      config: {
        systemInstruction: `${instruction} The board is a 9-element array indexed 0–8. Respond with ONLY a single integer for your move. Only choose cells where the value is null.`,
        temperature: temperature,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                move: { type: Type.INTEGER },
                message: { type: Type.STRING }
            },
            required: ["move", "message"]
        }
      },
    });

    const text = response.text?.trim() || "{}";
    const data = JSON.parse(text);

    const move = data.move;
    const message = data.message || "제가 둘 차례군요.";

    if (isNaN(move) || move < 0 || move > 8 || board[move] !== null) {
      console.warn("Invalid AI response, falling back to safe move:", data);
      throw new Error("Invalid move response");
    }

    return { move, message };
  } catch (error) {
    console.error("AI Generation failed:", error);
    // Find first available move
    const availableMoves = board.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
    if (availableMoves.length === 0) throw new Error("No moves left");
    const fallbackMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
    return { move: fallbackMove, message: "(네트워크 불안정으로 무작위 수를 둡니다...)" };
  }
}
