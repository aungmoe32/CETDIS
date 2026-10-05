// Web Audio API synthesized sound effects for door scanning and check-in.
// Zero network dependencies, works 100% offline, zero audio file latency.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("cetdis:sound-muted") === "true";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("cetdis:sound-muted", muted ? "true" : "false");
  } catch {
    // Ignore localStorage errors (e.g. in private browsing quota)
  }
}

export function toggleSound(): boolean {
  const next = !isSoundMuted();
  setSoundMuted(next);
  if (!next) {
    // Play a brief confirmation blip when unmuting
    playSuccessSound();
  }
  return next;
}

export function unlockAudioContext(): void {
  getAudioContext();
}

/**
 * High-energy ascending chime (D5 -> A5) for successful check-ins.
 * Accompanied by mobile haptic vibration.
 */
export function playSuccessSound(): void {
  if (isSoundMuted()) return;

  // Haptic feedback for mobile devices
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([60, 40, 80]);
    } catch {
      // Haptics not allowed
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    // Note 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.connect(gainNode);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Note 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.09);
    osc2.connect(gainNode);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.36);
  } catch {
    // Audio playback error swallowed gracefully
  }
}

/**
 * Distinct double warning beep for already scanned tickets.
 */
export function playAlreadyScannedSound(): void {
  if (isSoundMuted()) return;

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch {
      // Haptics not allowed
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Beep 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(440, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // Beep 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(440, now + 0.14);
    gain2.gain.setValueAtTime(0.2, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.28);
  } catch {
    // Audio playback error swallowed gracefully
  }
}

/**
 * Gentle two-tone notification for walk-up student recognition (E5 -> G5).
 */
export function playWalkUpSound(): void {
  if (isSoundMuted()) return;

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(80);
    } catch {
      // Haptics not allowed
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.connect(gainNode);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, now + 0.1); // G5
    osc2.connect(gainNode);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.32);
  } catch {
    // Audio playback error swallowed gracefully
  }
}

/**
 * Low descending rejection sound for invalid or not found tokens.
 */
export function playErrorSound(): void {
  if (isSoundMuted()) return;

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(250);
    } catch {
      // Haptics not allowed
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.3);
    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Audio playback error swallowed gracefully
  }
}
