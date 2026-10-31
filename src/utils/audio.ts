let context: AudioContext | undefined;
let noise: AudioBuffer | undefined;
const last = new Map<string, number>();
type Sound = "shoot" | "hit" | "headshot" | "pickup" | "damage" | "reload" | "win" | "empty" | "attack" | "step" | "groan" | "roar" | "door";
/** Original synthesized audio. Shared noise buffer and spatial stereo cues. */
export function sound(kind: Sound, volume: number, pan = 0) {
  if (!volume) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const ctx = context, now = ctx.currentTime;
    if (now - (last.get(kind) ?? -1) < 0.05) return;
    last.set(kind, now);
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const duration = kind === "groan" || kind === "roar" ? 0.95 : kind === "reload" ? 0.55 : kind === "door" ? 0.35 : 0.18;
    const gain = ctx.createGain(), stereo = ctx.createStereoPanner(), filter = ctx.createBiquadFilter();
    stereo.pan.value = Math.max(-1, Math.min(1, pan));
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume * (kind === "shoot" ? 0.5 : 0.2), now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(kind === "shoot" ? 3800 : kind === "step" ? 340 : 1300, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);
    filter.connect(gain); gain.connect(stereo); stereo.connect(ctx.destination);
    const osc = ctx.createOscillator();
    const frequencies: Record<Sound, number> = {shoot: 95, hit: 180, headshot: 510, pickup: 700, damage: 60, reload: 310, win: 880, empty: 110, attack: 52, step: 68, groan: 47, roar: 28, door: 95};
    osc.type = ["pickup", "win", "headshot"].includes(kind) ? "sine" : "triangle";
    osc.frequency.setValueAtTime(frequencies[kind], now);
    osc.frequency.exponentialRampToValueAtTime(frequencies[kind] * 0.45, now + duration);
    const source = ctx.createBufferSource(); source.buffer = noise;
    const noiseGain = ctx.createGain(); noiseGain.gain.value = ["shoot", "step", "reload", "hit", "headshot"].includes(kind) ? 0.65 : 0.12;
    source.connect(noiseGain); noiseGain.connect(filter); osc.connect(filter);
    osc.start(now); source.start(now); osc.stop(now + duration); source.stop(now + duration);
    osc.onended = () => { osc.disconnect(); source.disconnect(); noiseGain.disconnect(); filter.disconnect(); gain.disconnect(); stereo.disconnect(); };
  } catch { /* Audio is optional when autoplay is blocked. */ }
}
