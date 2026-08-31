/* ============================================================
   MOTOR DE RETROALIMENTACIÓN AUDITIVA (Web Audio API)
   ------------------------------------------------------------
   Todos los sonidos se generan programáticamente con osciladores:
   no hay archivos de audio externos. Cada estado de la app tiene
   un sonido distintivo:

     · recStart  → beep corto y agudo (800 Hz / 100 ms): inicia grabación
     · recTick   → el mismo beep, repetido cada 2 s mientras graba activamente
     · recPause  → beep grave (400 Hz / 150 ms): grabación en pausa
     · send      → dos beeps ascendentes rápidos (600 → 900 Hz): audio enviado
     · think     → beep suave y bajo cada segundo: la IA está procesando
     · ready     → arpegio alegre ascendente: respuesta lista, empieza a hablar
     · error     → doble tono descendente: algo falló

   El AudioContext se crea de forma perezosa en el primer gesto del
   usuario (política de autoplay de los navegadores) y se reutiliza
   también para el analizador de forma de onda.
   ============================================================ */

/** Volumen general de los feedbacks. Ajústalo aquí (0.0 – 1.0). */
export const SOUND_VOLUME = 0.3;

let ctx: AudioContext | null = null;
let muted = false;
/** `sinkId` actualmente aplicado al AudioContext (si el navegador lo soporta). */
let currentSinkId: string | null = null;

/** Silencia o reactiva todos los sonidos de feedback. */
export function setSfxMuted(value: boolean) {
  muted = value;
}

/**
 * Garantiza un AudioContext activo. Se crea dentro del gesto del
 * usuario para cumplir la política de autoplay y se comparte con
 * el analizador de la forma de onda del micrófono.
 *
 * Si el navegador soporta `setSinkId` en AudioContext y la página
 * seleccionó un dispositivo de salida, lo aplicamos para que los
 * sfx (beeps de feedback) salgan por el dispositivo elegido
 * (auriculares BT, USB-C, etc.).
 */
export function ensureAudio(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const opts: AudioContextOptions = {};
    if (currentSinkId) {
      (opts as unknown as { sinkId?: string }).sinkId = currentSinkId;
    }
    try {
      ctx = new AC(opts);
    } catch {
      // Algunos navegadores no aceptan el objeto de opciones vacío;
      // caemos al constructor simple.
      ctx = new AC();
    }
  } else if (currentSinkId) {
    // Si el sink cambió desde la última creación, intentamos actualizarlo
    // en caliente. No-op en navegadores que no lo soporten.
    const c = ctx as unknown as { setSinkId?: (id: string) => Promise<void> };
    if (typeof c.setSinkId === "function") {
      try {
        void c.setSinkId(currentSinkId);
      } catch {
        /* ignorar */
      }
    }
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

/**
 * Cambia el dispositivo de salida del AudioContext (donde esté soportado).
 * Devuelve `true` si se aplicó, `false` si el navegador no lo soporta.
 */
export function setOutputSinkId(id: string | null): boolean {
  currentSinkId = id;
  if (!ctx) return false;
  const c = ctx as unknown as { setSinkId?: (id: string) => Promise<void> };
  if (typeof c.setSinkId !== "function") return false;
  try {
    void c.setSinkId(id ?? "default");
    return true;
  } catch {
    return false;
  }
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;      // 0–1, relativo al volumen maestro
  at?: number;        // retraso en segundos desde ahora
  slideTo?: number;   // frecuencia final para un glissando suave
}

/** Un tono con envolvente rápida (ataque/decaimiento) para evitar "clics". */
function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  if (muted) return;
  try {
    const c = ensureAudio();
    const { type = "sine", gain = 1, at = 0, slideTo } = opts;
    const t0 = c.currentTime + at;

    const osc = c.createOscillator();
    const g = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

    // Envolvente: sube en 12 ms y cae al final → beep limpio
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, SOUND_VOLUME * gain), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.06);
  } catch {
    /* Si el audio falla, la app sigue funcionando en silencio. */
  }
}

/** Diccionario de sonidos por estado. */
export const sfx = {
  /** Inicio / reanudación de grabación: beep corto y agudo. */
  recStart() {
    tone(800, 0.1);
  },
  /** Latido cada 2 s mientras se graba activamente. */
  recTick() {
    tone(800, 0.08, { gain: 0.7 });
  },
  /** Pausa de grabación: beep más grave. */
  recPause() {
    tone(400, 0.15);
  },
  /** Envío del clip: dos beeps ascendentes rápidos (600 → 900 Hz). */
  send() {
    tone(600, 0.09);
    tone(900, 0.12, { at: 0.11 });
  },
  /** "Pensando": beep suave y bajo, repetido cada segundo por la app. */
  think() {
    tone(320, 0.18, { type: "triangle", gain: 0.55 });
  },
  /** Respuesta lista: arpegio alegre ascendente (Do–Mi–Sol). */
  ready() {
    tone(523.25, 0.1);
    tone(659.25, 0.1, { at: 0.09 });
    tone(783.99, 0.18, { at: 0.18 });
  },
  /** Error discreto: doble tono descendente. */
  error() {
    tone(240, 0.12, { type: "square", gain: 0.3 });
    tone(170, 0.16, { type: "square", gain: 0.3, at: 0.13 });
  },
};

/* ============================================================
   WARM-UP DE SALIDA
   ------------------------------------------------------------
   En Android (Chrome / Samsung Internet) `speechSynthesis` a veces
   arranca por el altavoz del teléfono aunque haya un dispositivo
   Bluetooth conectado. La causa típica: la página no estaba
   reproduciendo audio por una ruta "ruteable" cuando se dispara
   el TTS, así que el sistema elige el destino por defecto (el
   altavoz).

   Truco: justo antes de `speak()`, reproducimos ~80 ms de silencio
   por un `<audio>` element con `setSinkId` aplicado al dispositivo
   de salida elegido. Esto "engancha" el destino BT, y la utterance
   siguiente sale por la misma ruta.
   ============================================================ */

let warmupAudio: HTMLAudioElement | null = null;
let warmupSinkId: string | null = null;

/** Devuelve (y crea perezoso) el `<audio>` element usado para warm-up. */
function getWarmupAudio(): HTMLAudioElement {
  if (!warmupAudio) {
    warmupAudio = new Audio();
    warmupAudio.preload = "auto";
    // Generamos un WAV de 80 ms en silencio. 16-bit mono a 8 kHz = 1600 muestras = 3200 bytes.
    const sampleRate = 8000;
    const samples = Math.floor(sampleRate * 0.08);
    const dataSize = samples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);
    // samples ya quedan a 0 (silencio).
    const blob = new Blob([buffer], { type: "audio/wav" });
    warmupAudio.src = URL.createObjectURL(blob);
  }
  return warmupAudio;
}

/** Aplica el `sinkId` al elemento de warm-up. Se llama cuando
 *  el usuario cambia el dispositivo de salida. */
export function setWarmupSinkId(id: string | null) {
  warmupSinkId = id;
  const a = getWarmupAudio();
  const sa = a as unknown as { setSinkId?: (id: string) => Promise<void> };
  if (typeof sa.setSinkId === "function") {
    try {
      void sa.setSinkId(id ?? "default");
    } catch {
      /* el navegador no acepta el dispositivo — se ignora */
    }
  }
}

/**
 * Dispara el warm-up de salida. Devuelve una promesa que se
 * resuelve cuando el navegador aceptó reproducir el silencio
 * (o inmediatamente si no fue posible). Pensado para llamarlo
 * justo antes de `speechSynthesis.speak()`.
 */
export function warmupOutput(): Promise<void> {
  const a = getWarmupAudio();
  // Re-aplicamos el sink actual por si cambió.
  const sa = a as unknown as { setSinkId?: (id: string) => Promise<void> };
  if (typeof sa.setSinkId === "function" && warmupSinkId !== null) {
    try {
      void sa.setSinkId(warmupSinkId);
    } catch {
      /* no-op */
    }
  }
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(finish).catch(finish);
      } else {
        // Navegadores sin promesa: resolvemos a los 30 ms igual.
        setTimeout(finish, 30);
      }
    } catch {
      finish();
    }
    // Red de seguridad por si `play()` no dispara nada.
    setTimeout(finish, 120);
  });
}
