
import { AIConfig } from '../types';

export const generateText = async (prompt: string, config: AIConfig): Promise<string> => {
  if (!config.enabled) {
    throw new Error("AI is disabled");
  }

  // Default to localhost for Ollama if not specified
  const endpoint = config.endpoint || 'http://localhost:11434';

  // Simulate delay for realism if we are in a "mock" environment or if connection fails fast
  // For the purpose of this web demo, real localhost calls might fail due to browser Mixed Content policies
  // if served over HTTPS, or CORS. We will attempt it, but fallback to mock if it fails.
  
  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.warn("Local AI Connection Failed (Expected in web demo environment without local proxy). Falling back to mock response.");
    
    // Fallback Mock Response for Demo Purposes
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`[Local LLM Response]: Based on your input, here is a polished version:\n\n"${prompt}"\n\n(Note: This is a simulated response because the browser could not connect to ${endpoint}. In a real desktop app (Electron/Tauri), this would connect directly to your local Ollama instance.)`);
      }, 1500);
    });
  }
};