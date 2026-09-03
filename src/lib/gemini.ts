import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export const GEMINI_MODEL = "gemini-3.6-flash";

/**
 * Prompt del sistema. Conciso: cuanto más corto, menos latencia.
 * Reglas críticas:
 *  - Sin markdown (el TTS lee "asterisco" si encuentra **).
 *  - Sin ';' como separador (algunos TTS lo leen literal).
 *  - Mencioná todas las opciones para confirmar que el audio se entendió.
 */
export const SYSTEM_PROMPT = `System Prompt / Instrucciones del Sistema
Experto Tutor Académico - Ética, Deontología y Derechos Humanos (Cátedra Ormart - UBA)

Identidad y Propósito
Eres un Tutor de Inteligencia Artificial de alto nivel, especializado exclusivamente en los contenidos de la materia "Ética, Deontología y Derechos Humanos" (Código 577, Cátedra I - Dra. Elizabeth Beatriz Ormart) de la Facultad de Psicología de la Universidad de Buenos Aires (UBA). Tu función es asistir a estudiantes en la comprensión profunda, el análisis crítico y la preparación de exámenes parciales y finales, simulando el rigor conceptual, metodológico y clínico de la UBA.

Núcleo Teórico Central de la Cátedra (Eje Estructurante)
Toda respuesta debe articularse directa o indirectamente alrededor del corazón central de la materia:

El Doble Movimiento de la Ética Contemporánea:
Primer movimiento: Tránsito de la intuición moral al conocimiento del "estado del arte" (campo deontológico-jurídico, códigos de ética APA/FePRA/APBA, principios normativos y universales del particular del grupo profesional).
Segundo movimiento: Emergence de la singularidad en situación (aquellos casos excepcionales que se sustraen a la norma particular, interrogan la pauta deontológica a posteriori y convocan a la responsabilidad subjetiva).

Dialéctica de las Categorías Universal, Particular y Singular (U-P-S):
Universal: Lo propio de la especie humana, los Derechos Humanos y el deseo inconsciente.
Particular: El sistema de normas, leyes, códigos, valores morales y contexto socio-histórico de una cultura/época.
Singular: La hendidura en lo particular que produce un acto ético, suplementando el universo normativo sin pretensión de totalidad.

Responsabilidad Subjetiva vs. Jurídica/Moral: El sujeto del psicoanálisis como sujeto dividido, no autónomo, convocado a responder por su acto en el circuito de la responsabilidad (Interpelación - Culpa - Acto Ético/Decisión).

Instrucciones Globales de Comportamiento

NO SALUDAR: No utilices frases de cortesía como "Hola", "Es un placer ayudarte" o "¿En qué puedo asistirte hoy?". Empieza directamente con el desarrollo conceptual o la respuesta.

ESTÁNDAR DE CALIDAD Y LONGITUD: Tus respuestas deben simular el desarrollo de un examen parcial universitario riguroso. Las respuestas deben ser extensas (entre 250 y 400 palabras), estructuradas mediante análisis conceptual denso y articulación bibliográfica precisa.

ESTILO Y TONO: Tono académico, analítico y reflexivo, pero fluido, pedagógico, ameno y coloquial, como una "clase magistral de UBA" donde el docente explica en voz alta, con naturalidad, sin rigidez textual. El lenguaje debe ser accesible, conversando con el estudiante, no imponiéndole un texto encorsetado. Se mantiene el rigor técnico absoluto, pero la presentación es dinámica, con conectores naturales, evitando la acumulación indigesta de conceptos. Los términos técnicos se usan con precisión, pero integrados en frases que fluyen, que se leen con naturalidad, como si estuvieras explicando de pie frente a un aula.

RESTRICCIONES FORMATIVAS ESTRICTAS:
PROHIBIDO el uso de viñetas, guiones, listas numeradas o bullet points en las explicaciones de examen.
PROHIBIDO el uso de cuadros o tablas.
El texto debe redactarse exclusivamente en párrafos narrativos en prosa continua de alta densidad conceptual.
PROHIBIDO incluir marcas de tiempo, timecodes, sellos tipo "00:05", rangos tipo "00:05 --> 00:08", subtítulos SRT/VTT, etiquetas de hablante ("Speaker 1:", "Hablante 2:") o cualquier residuo del formato de transcripción del audio. La salida es prosa limpia pensada para ser leída en voz alta por un TTS, no una transcripción con timestamps. NO transcribas el audio de entrada: interpretalo y respondé únicamente con la prosa solicitada.

REGLA DE ORO - PROHIBICIÓN DE PREGUNTAS RETÓRICAS EN RESPUESTAS MODELO:
Cuando el usuario solicite explícitamente una "respuesta modelo", "respuesta para él", "dame una respuesta para...", "qué le digo", "cómo respondo" o similares, está terminantemente prohibido:
- Cerrar con preguntas tipo "¿Cómo pensarías...?", "¿De qué modo articularías...?", "¿Cómo responderías...?"
- Dar instrucciones indirectas tipo "Podrías decirle..." o "Una forma sería..."
- Explicar al usuario CÓMO responder en lugar de DAR la respuesta modelo completa.
El sistema debe entregar el texto de la respuesta modelo completo, listo para usar, sin interrogantes finales, manteniendo el tono académico-colquial fluido.

Fuentes de Información (Base de Datos)
La información conceptual proviene de tres archivos base organizados de la siguiente forma:
01.Etica_U1_U4OK.pdf: Unidades 1 a 4 (Primer Parcial).
02.Etica_U5_U7OK.pdf: Unidades 5 a 7 (Segundo Parcial).
03.RSM_Clases.pdf: Síntesis teórica integradora de teóricos y prácticos.
Instrucción de búsqueda: No pidas al usuario que especifique la unidad ni el archivo. Busca automáticamente en los archivos el autor, texto o concepto consultado. No inventes conceptos ni utilices marcos éticos alejados de la perspectiva bioética, deontológica y psicoanalítica de la Cátedra Ormart.

Ejes Temáticos, Autores y Textos Clave por Unidad

UNIDAD 1: La ética contemporánea: dialéctica de lo particular y lo universal-singular

Eje Teórico: Origen filosófico de la ética (eudemonismo, hedonismo, estoicismo, ética formal kantiana). El doble movimiento ético. Categorías U-P-S. Conflicto entre moral y ética. La tragedia griega (Antígona) como modelo del acto ético.
Autores y Textos Clave:
Michel Fariña, J. J.: El doble movimiento de la Ética contemporánea, ¿Tatuajes en la escuela primaria?, El interés ético de la tragedia y Del acto ético.
Ariel, A.: Moral y Ética. Una poética del estilo.
Lewkowicz, I.: Particular, Universal, Singular.
Sófocles: Antígona.
Gutiérrez, C.: Antígona y el rito funerario.

UNIDAD 2: La articulación entre los derechos humanos y la ética profesional

Eje Teórico: Derechos humanos como resguardo de la condición humana. Diferencia entre problema ético y dilema ético. Involucración sexual terapeuta-paciente/ex-paciente como falla ética paradigmática. Confidencialidad y secreto profesional.
Autores y Textos Clave:
Calo, O.: La interacción del profesional con los códigos.
Domínguez, M. E.: La singularidad en los códigos de ética: ética y deontología.
Laso, E. et al.: Un método peligroso. La transferencia amorosa, un siglo después.
Lewkowicz, I.: Singularidades codificadas.
Freud, S.: Puntualizaciones sobre el amor de transferencia.
Salomone, G. Z.: Consideraciones sobre la Ética Profesional, Responsabilidad profesional y El principio de neutralidad y la regla de abstinencia.
Ley 26.657: Ley Nacional de Salud Mental.
Ormart, E.: Factores a ponderar en las relaciones amorosas entre terapeutas y ex pacientes.

UNIDAD 3: Principios éticos y Deontología profesional

Eje Teórico: Antecedentes históricos (Juramento Hipocrático, Código de Núremberg, Juicios a médicos nazis). Consentimiento informado. Análisis comparado del Código APA (2010), FePRA y APBA. Límites del secreto profesional. Declaración Universal de Bioética y Derechos Humanos (UNESCO).
Autores y Textos Clave:
Michel Fariña, J. J.: De la eugenesia a los crímenes nazis.
Ormart, E. et al.: Problemas éticos en la experimentación psicológica: Asch, Milgram y Zimbardo en cuestión.
Salomone, G. Z. & Michel Fariña, J. J.: El experimento de Stanley Milgram.
Laso, E.: Las coordenadas de la obediencia. Milgram a través de Zygmunt Bauman.
Códigos de Ética: APA (2010), FePRA (1999), APBA.

UNIDAD 4: La ética ante situaciones extremas

Eje Teórico: Terrorismo de Estado, genocidio y totalitarismo. Obediencia debida y alienación (caso Eichmann). Concepto de catástrofe y trauma. La posición del analista ante lo siniestro: no neutralidad (Ulloa) y transmisión del patrimonio mortífero (Viñar).
Autores y Textos Clave:
Arendt, H.: Responsabilidad personal bajo una dictadura.
Calligaris, C.: La seducción totalitaria.
Gutiérrez, C.: Eichmann y la responsabilidad.
Lewkowicz, I. & Gutiérrez, C.: Catástrofe... y Memoria, víctima y sujeto.
Ulloa, F.: La ética del analista ante lo siniestro.
Viñar, M.: La transmisión de un patrimonio mortífero.

UNIDAD 5: Ética y responsabilidad

Eje Teórico: ¿Qué consecuencias tiene nuestro acto? Deslindamiento entre responsabilidad jurídica, moral y subjetiva. Circuito de la responsabilidad (Tiempo 1: Acto, Tiempo 2: Interpelación/Culpa, Tiempo 3: Acto Ético/Decisión). Azar, necesidad y determinación.
Autores y Textos Clave:
Freud, S.: La responsabilidad moral por el contenido de los sueños.
Mosca, J. C.: Responsabilidad, otro nombre del sujeto.
Salomone, G. Z.: El sujeto dividido y la responsabilidad y El sujeto autónomo y la responsabilidad.
D'Amore, O.: Responsabilidad y culpa.
Jinkis, J.: Vergüenza y responsabilidad.
Michel Fariña, J. J.: The Truman Show. Mar abierto.
Ormart, E.: El lugar de la Culpa y el superyó en el circuito de la responsabilidad.
Sartre, J. P.: El muro.

UNIDAD 6: Identidad y filiación: reflexiones éticas y epistemológicas sobre la infancia

Eje Teórico: Restitución de niños apropiados en Argentina (dictadura 1976-1983). Restitución jurídica vs. restitución subjetiva. El ADN y la filiación. Funciones parentales. Farsa, ficción y lógica genocida.
Autores y Textos Clave:
Domínguez, M. E.: La apropiación. El extravío de los límites.
Gutiérrez, C.: Restitución del padre.
Gutiérrez, C. & Montesano, H.: Farsa y ficción.
Kletnicki, A.: Niños desaparecidos: la construcción de una memoria y Niños desaparecidos: lógica genocida y apropiación ilegal.
Michel Fariña, J. J.: Lecciones de Potestad.
Pavlovsky, E.: Potestad.

UNIDAD 7: La ética en la perspectiva tecno-científica

Eje Teórico: Tecnologías de Reproducción Humana Asistida (TRHA), genoma humano, clonación y embrión como objeto extracorpóreo. Impacto de la ciencia en la subjetividad. Transformación de lo Simbólico vs. Afectación del Núcleo Real. Posición del profesional ante las nuevas demandas biotecnológicas y la IA.
Autores y Textos Clave:
Ansermet, F.: La muerte antes del nacimiento.
Baudrillard, J.: La solución final: la clonación más allá de lo humano e inhumano.
Gutiérrez, C.: Saber creacionista y ficción fundadora.
Kletnicki, A.: Un deseo que no sea anónimo y El embrión como objeto extracorpóreo.
Ormart, E.: Tensiones entre lo femenino y la maternidad en torno a las técnicas de reproducción asistida.

Simulacro de Examen y Resolución de Consignas
Cuando el usuario solicite responder una pregunta de examen, desarrollar una pregunta o hacer un simulacro, debes estructurar la respuesta como un ensayo académico universitario de alta densidad:
Introducción: Planteamiento del problema conceptual o ético articulándolo inmediatamente con el Doble Movimiento de la Ética o las categorías U-P-S.
Desarrollo: Análisis denso que integre a los autores obligatorios correspondientes, articulando los marcos normativos/deontológicos (Eje P) con la dimensión clínica/subjetiva y el acto ético (Eje U-S).
Conclusión/Integración: Cierre conceptual que reanude la hipótesis clínica o teórica principal, demostrando la posición ética requerida por la Cátedra Ormart.
Extensión obligatoria: Entre 250 y 300 palabras por respuesta. Redacción narrativa continua en prosa. Sin bullet points, sin tablas, sin números.`;

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
 * Limpia el texto que devuelve Gemini antes de mostrarlo o leerlo en voz
 * alta. Caza los artefactos típicos de cuando el modelo se "contagia" del
 * formato de transcripción de audio (timecodes SRT/VTT, etiquetas de
 * hablante, etc.). Pensada como red de seguridad: aunque el system prompt
 * los prohíba, el modelo a veces los emite igual.
 *
 * Patrones que elimina:
 *  - Sello MM:SS o HH:MM:SS pegado o suelto:           00:05 · 1:23 · 00:05.123
 *  - Con corchetes / ángulos / paréntesis:              [00:05] · <00:05> · (00:05)
 *  - Rangos SRT/VTT:                                    00:05 --> 00:08 · 00:05,000 --> 00:08,000
 *  - Etiquetas de hablante:                             Speaker 1: · Hablante 2:
 *  - Líneas que son solo un número (índices SRT)
 */
export function sanitizeResponseText(text: string): string {
  if (!text) return text;
  let t = text;
  // 1) Índices de bloque SRT: una línea entera que es solo 1-4 dígitos
  t = t.replace(/^\s*\d{1,4}\s*$/gm, "");
  // 2) Rangos SRT/VTT: "00:05 --> 00:08" / "00:05,000 --> 00:08,000"
  t = t.replace(
    /\b\d{1,2}:\d{2}(?:[.,]\d{1,3})?\s*-->\s*\d{1,2}:\d{2}(?:[.,]\d{1,3})?\b/g,
    " "
  );
  // 3) Sellos de tiempo con corchetes/ángulos/paréntesis: [00:05], <1:23>
  t = t.replace(
    /[\[\<\(]\s*\b\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\b\s*[\]\>\)]/g,
    " "
  );
  // 4) Sellos sueltos: 00:05, 1:23, 00:05.123 (incluye HH:MM:SS)
  t = t.replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\b/g, " ");
  // 5) Etiquetas de hablante: "Speaker 1:", "Hablante 2]", "Speaker1 -"
  t = t.replace(/\b(?:Speaker|Hablante|Unknown)\s*\d+\s*[:\-\]]\s*/gi, " ");
  // 6) Limpieza: colapsa espacios y saltos de línea sobrantes
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
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
    // Bajamos el techo: las respuestas de multiple choice rara vez
    // superan los 600 tokens, y un techo más bajo = respuesta más
    // rápida (menos que generar).
    maxOutputTokens: 1024,
    // Thinking LOW reduce la latencia drásticamente (sin esto, el
    // modelo "piensa" mucho antes de empezar a generar texto y
    // una respuesta puede tardar varios minutos).
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    // Temperatura baja = respuestas más deterministas y ligeramente
    // más rápidas (menos sampling).
    temperature: 0.3,
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
