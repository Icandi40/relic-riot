export class GameAudio {
  private context: AudioContext | null = null;
  enabled = false;
  unlock() {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
  }
  play(kind: string) {
    if (!this.enabled) return;
    this.unlock();
    const ctx = this.context!;
    const notes: Record<string, number[]> = {
      pulse: [110, 65],
      pickup: [440, 660, 880],
      score: [523, 659, 784, 1046],
      steal: [330, 220],
      start: [440, 660],
      finish: [523, 659, 784, 1046, 1318],
      click: [550],
    };
    const melody = notes[kind] ?? notes.click;
    melody.forEach((frequency, i) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain(),
        at = ctx.currentTime + i * 0.065;
      osc.type = kind === "pulse" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(frequency, at);
      if (kind === "pulse")
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, at + 0.18);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.045, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.26);
    });
  }
  dispose() {
    void this.context?.close();
  }
}
