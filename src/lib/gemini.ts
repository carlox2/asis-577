import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-3.6-flash";
export const SYSTEM_PROMPT = "Eres un asistente útil y amable.";

/**
 * Lee la API key desde la variable de entorno de Vite.
 * Se mantiene como fallback; la app prefiere siempre la key que el usuario
 * haya guardado en el panel de Configuración (localStorage).
 */
export const GEMINI_API_KEY: string = (
  (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env?.VITE_GEMINI_API_KEY ?? ""
).trim();


export function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "audio/webm";
}

/**
 * Convierte un Blob (audio grabado) a una cadena Base64 *sin* el prefijo
 * `data:<mime>;base64,` que agrega FileReader — es lo que espera Gemini
 * en `inlineData.data`.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("No se pudo codificar el audio a Base64."));
    reader.readAsDataURL(blob);
  });
}

/** Extrae un mensaje legible de un error arbitrario (incluido el del SDK). */
function describeError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as {
      message?: string;
      status?: number | string;
      code?: number | string;
      error?: { message?: string; code?: number | string; status?: string };
    };
    if (e.error?.message) {
      const code = e.error.code ?? e.error.status ?? e.status ?? e.code;
      return code ? `[${code}] ${e.error.message}` : e.error.message;
    }
    if (e.message) return e.message;
  }
  return "Error desconocido al hablar con Gemini.";
}

/**
 * Envía el audio a Gemini usando el SDK oficial `@google/genai`.
 *
 * Usamos el SDK (en lugar de `fetch` directo) porque Google dejó de aceptar
 * las nuevas Auth Keys con prefijo `AQ.` en el endpoint REST crudo para
 * algunas cuentas — el SDK negocia la auth correctamente y además nos da
 * errores tipados con el mensaje real de Google.
 */
export async function askGemini(base64Audio: string, mimeType: string, apiKey: string): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey || cleanKey === "TU_API_KEY_AQUI") {
    throw new Error("Configura tu API Key de Gemini en el panel de Configuración.");
  }

  const ai = new GoogleGenAI({ apiKey: cleanKey });

  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64Audio } },
            { text: "Escucha el audio adjunto y responde según las instrucciones." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
  } catch (err) {
    const detail = describeError(err);
    const lower = detail.toLowerCase();
    if (
      lower.includes("api key") ||
      lower.includes("auth") ||
      lower.includes("credential") ||
      lower.includes("permission") ||
      lower.includes("401") ||
      lower.includes("403")
    ) {
      throw new Error(`API Key rechazada por Gemini: ${detail}`);
    }
    if (lower.includes("quota") || lower.includes("429") || lower.includes("rate")) {
      throw new Error(`Cuota o rate-limit de Gemini: ${detail}`);
    }
    if (lower.includes("network") || lower.includes("fetch") || lower.includes("econn") || lower.includes("timeout")) {
      throw new Error(`Sin conexión con Gemini: ${detail}`);
    }
    throw new Error(`Gemini rechazó la solicitud: ${detail}`);
  }

  const text = (response?.text ?? "").trim();
  if (!text) {
    throw new Error("Gemini no devolvió texto. Intenta grabar la pregunta con más claridad.");
  }
  return text;
}
