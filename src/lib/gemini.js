import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "quant-ai-486520";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const useEnterprise = process.env.GOOGLE_GENAI_USE_ENTERPRISE === "true" || !!process.env.GOOGLE_CLOUD_PROJECT;

const config = {};

if (useEnterprise) {
  config.enterprise = true;
  config.project = projectId;
  config.location = location;
} else {
  config.apiKey = process.env.GEMINI_API_KEY || "";
}

const ai = new GoogleGenAI(config);

// Wrapper with retries (exponential backoff) and fallback models to bypass transient 503 / high demand errors
export async function generateContentWithFallback({ model = "gemini-2.5-flash", contents, config: genConfig }) {
  const modelsToTry = [model, "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError;

  for (const modelName of modelsToTry) {
    let delay = 1000;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Gemini] Intentando modelo '${modelName}' (Intento ${attempt}/3)...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: genConfig,
        });
        console.log(`[Gemini] Respuesta exitosa con modelo '${modelName}'`);
        return response;
      } catch (err) {
        lastError = err;
        const errMsg = err.message || String(err);
        console.warn(`[Gemini] Error en intento ${attempt}/3 con modelo '${modelName}':`, errMsg);

        // Don't retry on auth or argument errors
        const cleanMsg = errMsg.toLowerCase();
        if (
          cleanMsg.includes("key") || 
          cleanMsg.includes("auth") || 
          cleanMsg.includes("credential") || 
          cleanMsg.includes("permission") || 
          cleanMsg.includes("invalid argument")
        ) {
          throw err;
        }

        // Wait before next attempt
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // backoff exponencial
        }
      }
    }
  }

  throw lastError || new Error("Gemini API falló tras agotar todos los intentos y modelos de respaldo.");
}

export default ai;
