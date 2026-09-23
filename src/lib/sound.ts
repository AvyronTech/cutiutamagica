/**
 * Micro-sunete pentru storefront, sintetizate în Web Audio.
 *
 * Nu se descarcă niciun fișier audio. Timbrul imită o lamelă de oțel lovită
 * de pinul unei cutiuțe muzicale: fundamentala plus parțialele inarmonice
 * 2.76 · 5.40 · 8.93, cu atac scurt și decădere exponențială.
 *
 * Reguli:
 * - sunetul e oprit implicit și pornește doar la cererea explicită a vizitatorului;
 * - AudioContext se creează abia la primul sunet cerut după un gest (politica de autoplay);
 * - preferința se păstrează în localStorage;
 * - totul e sigur la SSR: fără acces la window în afara funcțiilor apelate din browser.
 */

const STORAGE_KEY = "cm_sound";
const PARTIALS: ReadonlyArray<readonly [ratio: number, amp: number, decay: number]> = [
  [1, 1, 1.6],
  [2.76, 0.42, 0.8],
  [5.4, 0.19, 0.42],
  [8.93, 0.09, 0.24],
];

type Listener = (enabled: boolean) => void;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled: boolean | null = null;
let lastPluckAt = 0;
let productAudioPlaying = false;
export function setProductAudioPlaying(value: boolean) {
  productAudioPlaying = value;
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.32, ctx.currentTime, 0.03);
}
const listeners = new Set<Listener>();

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function isSoundEnabled(): boolean {
  if (enabled === null) enabled = readStored();
  return enabled;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    // Private mode or blocked storage: the preference simply won't persist.
  }
  if (next) void ensureContext();
  listeners.forEach((listener) => listener(next));
}

export function subscribeSound(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function ensureContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx;
}

function midiToHz(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** O lamelă ciupită. `when` e relativ la acum, în secunde. */
function pluck(ac: AudioContext, out: AudioNode, midi: number, when = 0, velocity = 1) {
  const t = ac.currentTime + 0.004 + when;
  const f = midiToHz(midi);
  const voice = ac.createGain();
  voice.gain.value = Math.max(0.05, Math.min(1, velocity));
  voice.connect(out);

  for (const [ratio, amp, decay] of PARTIALS) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    // Un dezacord de câteva miimi face ca două lamele să nu sune identic.
    osc.frequency.value = f * ratio * (1 + (Math.random() - 0.5) * 0.003);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp * 0.28, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g);
    g.connect(voice);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

function noiseBurst(
  ac: AudioContext,
  out: AudioNode,
  {
    samples,
    shape,
    filter,
    freq,
    gain,
  }: {
    samples: number;
    shape: number;
    filter: BiquadFilterType;
    freq: number;
    gain: number;
  },
) {
  const buffer = ac.createBuffer(1, samples, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++)
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples, shape);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const f = ac.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start();
}

async function play(render: (ac: AudioContext, out: AudioNode) => void) {
  if (!isSoundEnabled() || productAudioPlaying) return;
  const ac = await ensureContext();
  if (!ac || !master) return;
  render(ac, master);
}

/* ─────────────────────────────  Sunetele  ───────────────────────────── */

/** Adăugare în coș: două lamele urcătoare, ca o manivelă care prinde. */
export function playChime() {
  void play((ac, out) => {
    pluck(ac, out, 88, 0, 0.9); // E6
    pluck(ac, out, 95, 0.09, 0.8); // B6
  });
}

/** Favorit: o sclipire scurtă, trei note în arpegiu. */
export function playSparkle() {
  void play((ac, out) => {
    pluck(ac, out, 91, 0, 0.55); // G6
    pluck(ac, out, 95, 0.055, 0.5); // B6
    pluck(ac, out, 98, 0.11, 0.45); // D7
  });
}

/** Notificare: un singur clopoțel moale. */
export function playNotify() {
  void play((ac, out) => pluck(ac, out, 84, 0, 0.7)); // C6
}

/** Pragul atins: arpegiu major complet, pentru momentele care merită sărbătorite. */
export function playUnlock() {
  void play((ac, out) => {
    [84, 88, 91, 96].forEach((midi, i) => pluck(ac, out, midi, i * 0.075, 0.7 - i * 0.06));
  });
}

/** Clicul discret al unui cadru la rotirea 360. Limitat, ca să nu se suprapună. */
export function playTick() {
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - lastPluckAt < 45) return;
  lastPluckAt = now;
  void play((ac, out) =>
    noiseBurst(ac, out, { samples: 220, shape: 9, filter: "highpass", freq: 2600, gain: 0.05 }),
  );
}

/** Lemn care se așază: pentru deschideri și confirmări. */
export function playWood() {
  void play((ac, out) => {
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(64, t + 0.13);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.28);
  });
}
