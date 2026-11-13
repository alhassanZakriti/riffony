import { getAudioContext } from "./context";

export interface ScheduledEvent {
  /** AudioContext time in seconds. */
  time: number;
  play: (time: number) => { stop: (when?: number) => void } | void;
}

/**
 * Classic lookahead scheduler ("A Tale of Two Clocks"): a coarse JS timer
 * hands events to the sample-accurate audio clock slightly ahead of time, so
 * timing never depends on main-thread jitter.
 */
export class LookaheadScheduler {
  private events: ScheduledEvent[] = [];
  private cursor = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private active: { stop: (when?: number) => void }[] = [];

  constructor(
    private readonly lookahead = 0.12,
    private readonly interval = 25,
  ) {}

  start(events: ScheduledEvent[]) {
    this.stop();
    this.events = [...events].sort((a, b) => a.time - b.time);
    this.cursor = 0;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.interval);
  }

  private tick() {
    const c = getAudioContext();
    const horizon = c.currentTime + this.lookahead;
    while (this.cursor < this.events.length && this.events[this.cursor].time < horizon) {
      const e = this.events[this.cursor++];
      const handle = e.play(Math.max(e.time, c.currentTime));
      if (handle) this.active.push(handle);
    }
    if (this.active.length > 64) this.active.splice(0, this.active.length - 64);
    if (this.cursor >= this.events.length && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const now = getAudioContext().currentTime;
    for (const h of this.active) {
      try {
        h.stop(now);
      } catch {
        // Already stopped.
      }
    }
    this.active = [];
    this.events = [];
    this.cursor = 0;
  }
}
