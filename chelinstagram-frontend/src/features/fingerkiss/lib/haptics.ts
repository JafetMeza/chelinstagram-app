// Vibración con fallback: iOS Safari no implementa la Vibration API,
// así que ahí usamos un "latido" de audio suave (más el brillo visual del lienzo).

export const supportsVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioContext) {
        const Ctx = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext; }).webkitAudioContext;
        if (!Ctx) return null;
        audioContext = new Ctx();
    }
    // Safari crea el contexto suspendido hasta un gesto del usuario
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => { });
    return audioContext;
};

const playThump = (intensity: number, durationMs: number) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const duration = durationMs / 1000;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(70 + intensity * 50, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05 + intensity * 0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
};

/**
 * Un pulso háptico. `intensity` (0..1) controla la duración (y el volumen del fallback).
 * Se llama en un intervalo fijo, así que a mayor intensidad la vibración es casi continua.
 */
export const hapticPulse = (intensity: number, intervalMs: number, soundFallback: boolean) => {
    const duration = Math.round(20 + intensity * (intervalMs - 20));
    if (supportsVibration) {
        navigator.vibrate(duration);
    } else if (soundFallback) {
        playThump(intensity, Math.min(duration, 160));
    }
};

export const hapticCelebrate = (soundFallback: boolean) => {
    if (supportsVibration) {
        navigator.vibrate([120, 60, 120, 60, 300]);
    } else if (soundFallback) {
        [0, 180, 360].forEach(delay => setTimeout(() => playThump(1, 150), delay));
    }
};

export const hapticStop = () => {
    if (supportsVibration) navigator.vibrate(0);
};

// Desbloquea el audio en iOS: debe llamarse dentro de un gesto (pointerdown)
export const unlockAudio = () => {
    if (!supportsVibration) getAudioContext();
};
