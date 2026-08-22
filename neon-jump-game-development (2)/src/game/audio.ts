// ── Neon Jump · sound synth (Web Audio, exact original frequencies) ─

let ac: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}
export function getMuted() {
  return muted;
}

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ac) {
    try {
      ac = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ac.state === "suspended") void ac.resume();
  return ac;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.12,
  slideTo?: number,
  delay = 0
) {
  if (muted) return;
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  ensure() {
    ctx();
  },
  jump() {
    tone(340, 0.14, "triangle", 0.1, 620);
  },
  spring() {
    tone(240, 0.28, "square", 0.08, 980);
    tone(480, 0.2, "sine", 0.08, 1240, 0.03);
  },
  coin() {
    tone(880, 0.09, "sine", 0.09);
    tone(1320, 0.14, "sine", 0.08, undefined, 0.06);
  },
  shoot() {
    tone(720, 0.1, "sawtooth", 0.06, 220);
  },
  hit() {
    tone(200, 0.3, "sawtooth", 0.14, 60);
  },
  enemyDie() {
    tone(520, 0.16, "square", 0.08, 120);
  },
  power() {
    tone(520, 0.1, "sine", 0.09);
    tone(660, 0.1, "sine", 0.09, undefined, 0.08);
    tone(880, 0.18, "sine", 0.1, undefined, 0.16);
  },
  milestone() {
    tone(660, 0.12, "triangle", 0.1);
    tone(880, 0.12, "triangle", 0.1, undefined, 0.1);
    tone(1100, 0.22, "triangle", 0.11, undefined, 0.2);
  },
  gameOver() {
    tone(420, 0.22, "sawtooth", 0.1, 300);
    tone(300, 0.24, "sawtooth", 0.1, 200, 0.2);
    tone(200, 0.42, "sawtooth", 0.12, 90, 0.42);
  },
  click() {
    tone(600, 0.06, "sine", 0.06);
  },
};
