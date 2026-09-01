import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-3.6-flash";

/**
 * Prompt del sistema. Pensado para una app que se usa de noche con la
 * voz como canal principal: la respuesta se muestra en pantalla Y se lee
 * con speechSynthesis, así que NO puede traer markdown (los asteriscos
 * se leen como "asterisco" y rompen la lectura). También debe mencionar
 * todas las opciones de la pregunta, para que se note si el audio
 * se entendió mal.
 */
export const SYSTEM_PROMPT = `Sos un asistente de estudio de Biología del Comportamiento y Psicología. Respondé siempre en español rioplatense, claro y conciso.

REGLAS DE FORMATO (obligatorias):
- Nunca uses markdown ni símbolos de formato. Está prohibido: asteriscos, numeral de encabezado, guiones de lista, comillas tipográficas, backticks y links tipo corchete-paréntesis. Escribí texto plano.
- No uses punto y coma como separador (algunos TTS lo leen "punto y coma" y es ruidoso). Usá saltos de línea entre secciones.
- Evitá relleno y frases de cortesía. Respondé solo lo preguntado.
- Si el audio no se entiende bien, decílo explícitamente en una línea aparte y respondé lo que puedas inferir.

PREGUNTAS DE OPCIÓN MÚLTIPLE (verdadero o falso, o a b c d):
Respondé EXACTAMENTE en este formato, un renglón por sección, sin markdown, y mencioná SIEMPRE todas las opciones (incluso las correctas) para confirmar que escuchaste la pregunta completa:

Opción correcta: <letra>) <texto de esa opción>
Por qué es la correcta: <justificación de 1 o 2 oraciones>
Por qué no las demás: <letra>): <motivo breve en una oración>. <letra>): <motivo breve en una oración>. <letra>): <motivo breve en una oración>.

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
 * Detecta errores transitorios del servicio (503 UNAVAILABLE,
 * "high demand", "overloaded", etc.). En esos casos, reintentamos
 * una vez antes de mostrar el error al usuario.
 */
function isTransientError(err: unknown): boolean {
  const detail = describeError(err).toLowerCase();
  return (
    detail.includes("503") ||
    detail.includes("unavailable") ||
    detail.includes("high demand") ||
    detail.includes("overloaded") ||
    detail.includes("try again later")
  );
}

/**
 * Envía el audio a Gemini usando el SDK oficial `@google/genai`.
 *
 * Usamos el SDK (en lugar de `fetch` directo) porque Google dejó de aceptar
 * las nuevas Auth Keys con prefijo `AQ.` en el endpoint REST crudo para
 * algunas cuentas — el SDK negocia la auth correctamente y además nos da
 * errores tipados con el mensaje real de Google.
 *
 * Manejo de errores:
 *  - Errores transitorios (503/UNAVAILABLE/"high demand"): reintenta una
 *    vez con 4 s de espera. Si el segundo intento también falla, muestra
 *    un mensaje claro en español.
 *  - API key inválida / 401/403: mensaje específico, sin reintento.
 *  - Cuota agotada / 429: mensaje específico, sin reintento.
 *  - Errores de red: mensaje específico, sin reintento.
 */
export async function askGemini(base64Audio: string, mimeType: string, apiKey: string): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey || cleanKey === "TU_API_KEY_AQUI") {
    throw new Error("Configura tu API Key de Gemini en el panel de Configuración.");
  }

  const ai = new GoogleGenAI({ apiKey: cleanKey });

  const contents = [
    {
      parts: [
        { inlineData: { mimeType, data: base64Audio } },
        { text: "Escucha el audio adjunto y responde según las instrucciones." },
      ],
    },
  ];
  const config = {
    systemInstruction: SYSTEM_PROMPT,
    // Subimos el techo para que la justificación de las 4 opciones
    // (3 motivos de "por qué no las demás") no se trunque.
    maxOutputTokens: 2048,
  };

  const MAX_ATTEMPTS = 2;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config,
      });
      const text = (response?.text ?? "").trim();
      if (!text) {
        throw new Error("Gemini no devolvió texto. Intenta grabar la pregunta con más claridad.");
      }
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS && isTransientError(err)) {
        // Espera 4 s antes del reintento. Mientras tanto la UI muestra
        // "Procesando con Gemini…" (estado processing).
        await new Promise((resolve) => setTimeout(resolve, 4000));
        continue;
      }
      break;
    }
  }

  // Si llegamos acá, falló definitivamente. Mapeo a un mensaje en
  // español claro, sin JSON crudo en la UI.
  const detail = describeError(lastErr);
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
  if (isTransientError(lastErr)) {
    throw new Error(
      "El servicio de Gemini está saturado. Reintentá en unos minutos. " +
        `Detalle: ${detail}`
    );
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("econn") || lower.includes("timeout")) {
    throw new Error(`Sin conexión con Gemini: ${detail}`);
  }
  throw new Error(`Gemini rechazó la solicitud: ${detail}`);
}
