import { GoogleGenAI } from "@google/genai";
import { AIConfig } from '../types';

// Initialize Gemini with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateText = async (prompt: string, config: AIConfig): Promise<string> => {
  if (!config.enabled) {
    throw new Error("AI is disabled");
  }

  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: prompt,
    });

    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Graceful error handling for the UI
    let errorMessage = "Connection failed.";
    if (error.message) errorMessage += ` ${error.message}`;
    return `[System Error]: ${errorMessage}\n\nPlease ensure your API Key is valid.`;
  }
};