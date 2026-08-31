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

/** Silencia o reactiva todos los sonidos de feedback. */
export function setSfxMuted(value: boolean) {
  muted = value;
}

/**
 * Garantiza un AudioContext activo. Se crea dentro del gesto del
 * usuario para cumplir la política de autoplay y se comparte con
 * el analizador de la forma de onda del micrófono.
 */
export function ensureAudio(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
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
