import { GoogleGenAI, ThinkingLevel } from "@google/genai";

/**
 * Google no publica un model id llamado "ultimate". El equivalente de
 * máxima calidad en la API (tier Pro / Ultra) es Gemini 3.1 Pro.
 * gemini-3.6-flash es válido, pero el thinking medio por defecto
 * explica esperas de ~100 s y respuestas cortadas si maxOutputTokens
 * es bajo (los tokens de pensamiento cuentan en el techo de salida).
 */
export const GEMINI_MODEL = "gemini-3.1-pro-preview";

/**
 * Prompt del sistema. Texto plano para pantalla y TTS: sin markdown
 * (si no, speechSynthesis lee "asterisco asterisco") y sin punto y
 * coma como separador (en algunos motores se lee "punto y coma").
 */
export const SYSTEM_PROMPT = `Sos un asistente de estudio de Biología del Comportamiento y Psicología. Respondé siempre en español rioplatense, claro y conciso.

REGLAS DE FORMATO (obligatorias):
Nunca uses markdown ni símbolos de formato. Está prohibido: asteriscos, numeral de encabezado, guiones de lista, comillas tipográficas, backticks y links tipo corchete. Escribí texto plano. No uses punto y coma para separar secciones. Evitá relleno y frases de cortesía.

PREGUNTAS DE OPCIÓN MÚLTIPLE (verdadero o falso, o a b c d):
Respondé exactamente en este formato, en dos o tres renglones, sin markdown:

Opción correcta: a) Verdadero
¿Por qué es la correcta?: <justificación de 1 o 2 oraciones>
¿Por qué no las demás?: Opción b: <motivo>. Opción c: <motivo>.

Si la pregunta es solo verdadero o falso, omití la línea de las demás opciones. En la primera línea usá la letra y el texto de esa opción (por ejemplo a) Verdadero o b) Falso).

PREGUNTAS ABIERTAS (explicame X, definí, compará, etc.):
Respondé en una o dos oraciones directas, texto plano, sin viñetas ni listas.

IDIOMA:
Español rioplatense (vos, sos, tenés). Si la pregunta está en otro idioma, respondé en español.`;

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

/**
 * Limpia el markdown que el modelo pueda colar aunque se lo pidamos
 * no usar. Lo aplicamos a la respuesta antes de mostrarla y antes de
 * pasarla a `speechSynthesis` para que el TTS no lea "asterisco
 * asterisco" en lugar del texto en negrita.
 *
 * Quita:
 *   - **xxx** / __xxx__ → xxx
 *   - *xxx* / _xxx_ → xxx
 *   - `xxx` → xxx
 *   - # / ## / ### al inicio de línea
 *   - Viñetas -, * y numeradas (1. 2. 3.) al inicio de línea
 *   - Links [texto](url) → texto
 *   - Múltiples saltos de línea → uno solo
 */
export function stripMarkdown(input: string): string {
  if (!input) return "";
  let s = input;

  // Bloques de código ```...``` → conservamos solo el contenido
  s = s.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/^```[a-zA-Z0-9_-]*\n?/, "").replace(/```$/, "").trim()
  );

  // Links: [texto](url) → texto
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // Negrita: **xxx** o __xxx__ → xxx
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");

  // Cursiva: *xxx* o _xxx_ → xxx (cuidado con guiones bajos en medio de palabras;
  // limitamos a casos claros)
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2");
  s = s.replace(/(^|\s)_([^_\n]+)_(?!\w)/g, "$1$2");

  // Código en línea: `xxx` → xxx
  s = s.replace(/`([^`]+)`/g, "$1");

  // Encabezados al inicio de línea: #, ##, ### + espacio
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // Viñetas y listas numeradas al inicio de línea
  s = s.replace(/^\s*[-*+]\s+/gm, "");
  s = s.replace(/^\s*\d+\.\s+/gm, "");

  // Comillas tipográficas → rectas
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // Múltiples saltos de línea → máximo dos
  s = s.replace(/\n{3,}/g, "\n\n");

  // Múltiples espacios → uno (preservando saltos de línea)
  s = s.replace(/[ \t]{2,}/g, " ");

  // Residuos que el TTS leería literal ("asterisco", "numeral", "guion bajo")
  s = s.replace(/[*#`~]+/g, "");
  s = s.replace(/(^|\s)_+/g, "$1");

  return s.trim();
}

/**
 * Texto listo para speechSynthesis: markdown fuera y separadores que
 * algunos motores leen en voz alta ("punto y coma") convertidos a pausa.
 */
export function prepareForSpeech(input: string): string {
  let s = stripMarkdown(input);
  s = s.replace(/\s*;\s*/g, ". ");
  s = s.replace(/\n+/g, ". ");
  s = s.replace(/\.\s*\./g, ".");
  s = s.replace(/\s{2,}/g, " ");
  return s.trim();
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
            { text: "Escucha el audio adjunto y responde según las instrucciones del system prompt." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        // Gemini 3 Pro piensa en HIGH por defecto (lento). LOW alcanza
        // para V/F y definiciones y baja la espera de ~100 s.
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        // El pensamiento cuenta contra este techo: 2048 recorta la
        // respuesta visible. 8192 deja margen para justificación completa.
        maxOutputTokens: 8192,
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

  const text = extractResponseText(response as GeminiGenerateResponse);
  if (!text) {
    const reason = extractFinishReason(response);
    const hint = reason ? ` (finishReason: ${reason})` : "";
    throw new Error(
      `Gemini no devolvió texto${hint}. Intenta grabar la pregunta con más claridad.`
    );
  }
  // Red de seguridad: aunque el system prompt prohíbe markdown, a veces
  // el modelo igual lo emite. Limpiamos antes de devolver para que ni la
  // UI ni el TTS muestren/lean asteriscos, #, etc.
  return stripMarkdown(text);
}

type GeminiPart = { text?: string; thought?: boolean };
type GeminiCandidate = {
  finishReason?: string;
  content?: { parts?: GeminiPart[] };
};
type GeminiGenerateResponse = {
  text?: string;
  candidates?: GeminiCandidate[];
};

function extractFinishReason(response: GeminiGenerateResponse): string {
  return String(response?.candidates?.[0]?.finishReason ?? "");
}

/** Junta el texto visible y omite partes de pensamiento interno. */
function extractResponseText(response: GeminiGenerateResponse): string {
  const direct = (response?.text ?? "").trim();
  if (direct) return direct;
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text as string)
    .join("\n")
    .trim();
}
