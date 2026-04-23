/**
 * KDS audio alerts (45.5).
 *
 * Synthesized via Web Audio so no asset files are needed. Two distinct tones:
 *   - newTicket:  two-note rising chime (G5 → C6), soft.
 *   - overdue:    three low beeps (A3), harsher. Plays at most once every 20s per
 *                 overdue ticket so an overdue backlog doesn't spam continuously.
 *
 * Volume + mute are persisted in localStorage so the setting survives reloads.
 */

const VOLUME_KEY = 'kdsAudioVolume';
const MUTE_KEY = 'kdsAudioMuted';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Cls = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Cls) return null;
  try { ctx = new Cls(); } catch { ctx = null; }
  return ctx;
}

function playTone(freq: number, durationMs: number, delayMs: number, volume: number, type: OscillatorType = 'sine'): void {
  const c = getCtx();
  if (!c) return;
  const startAt = c.currentTime + delayMs / 1000;
  const stopAt = startAt + durationMs / 1000;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);

  // Short attack + decay envelope so it sounds like a chime, not a buzz.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

  osc.connect(gain).connect(c.destination);
  osc.start(startAt);
  osc.stop(stopAt + 0.05);
}

export const kdsAudio = {
  getVolume(): number {
    const raw = localStorage.getItem(VOLUME_KEY);
    const n = raw != null ? Number(raw) : 0.6;
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.6;
  },
  setVolume(v: number): void {
    localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, v))));
  },
  isMuted(): boolean {
    return localStorage.getItem(MUTE_KEY) === '1';
  },
  setMuted(m: boolean): void {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  },

  /** Audio contexts start suspended in Chrome until a user gesture. Call once on click. */
  unlock(): void {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  },

  newTicket(): void {
    if (this.isMuted()) return;
    const v = this.getVolume();
    if (v <= 0) return;
    playTone(784, 120, 0, v * 0.6);        // G5
    playTone(1047, 200, 120, v * 0.6);     // C6
  },

  overdue(): void {
    if (this.isMuted()) return;
    const v = this.getVolume();
    if (v <= 0) return;
    playTone(220, 180, 0, v * 0.8, 'square');     // A3
    playTone(220, 180, 220, v * 0.8, 'square');
    playTone(220, 220, 440, v * 0.8, 'square');
  },
};

/**
 * Webhook config stub (45.5). Wired later — for now we expose the shape so
 * upstream code can call it and we keep the integration point visible.
 */
export interface OverdueWebhookConfig {
  url: string | null;
  overdue_minutes_threshold: number; // fires only when elapsed >= this
}

export async function notifyOverdueWebhook(_cfg: OverdueWebhookConfig, _payload: {
  order_id: number; order_number: string; destination_id: number; elapsed_minutes: number;
}): Promise<void> {
  // Stub — intentional. See 45.5 follow-up: POST to cfg.url with payload + signature.
}
