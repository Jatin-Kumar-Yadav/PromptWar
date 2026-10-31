let context: AudioContext | undefined;
let last = 0;
export function sound(
  kind:
    | "shoot"
    | "hit"
    | "pickup"
    | "damage"
    | "reload"
    | "win"
    | "empty"
    | "attack",
  volume: number,
) {
  if (!volume) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    if (now - last < 0.035) return;
    last = now;
    const osc = context.createOscillator(),
      gain = context.createGain();
    const freq = {
      shoot: 120,
      hit: 220,
      pickup: 700,
      damage: 65,
      reload: 330,
      win: 880,
      empty: 80,
      attack: 45,
    }[kind];
    osc.type = kind === "pickup" || kind === "win" ? "sine" : "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.18);
    gain.gain.setValueAtTime(volume * 0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.22);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {
    /* Audio is optional when browser policy blocks it. */
  }
}
