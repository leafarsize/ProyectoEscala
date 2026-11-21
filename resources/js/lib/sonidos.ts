/**
 * Efectos de sonido sintetizados mediante la Web Audio API.
 * No requiere descargar archivos de audio externos y funciona instantáneamente.
 */

let audioContext: AudioContext | null = null;

function obtenerAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;

    if (!AudioContextClass) {
        return null;
    }

    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
        void audioContext.resume();
    }

    return audioContext;
}

/**
 * Sonido agradable de éxito (acorde ascendente suave).
 */
export function reproducirSonidoExito(): void {
    try {
        const ctx = obtenerAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        // Dos notas armónicas ascendentes: C5 (523 Hz) y G5 (784 Hz)
        const notas = [
            { freq: 523.25, time: now, duracion: 0.12 },
            { freq: 783.99, time: now + 0.08, duracion: 0.22 },
        ];

        notas.forEach(({ freq, time, duracion }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            // Curva suave de volumen
            gain.gain.setValueAtTime(0.001, time);
            gain.gain.exponentialRampToValueAtTime(0.2, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duracion);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(time);
            osc.stop(time + duracion);
        });
    } catch {
        // Silenciar en caso de restricciones de reproducción del navegador
    }
}

/**
 * Sonido sutil de fallo o error (dos tonos descendentes).
 */
export function reproducirSonidoFallo(): void {
    try {
        const ctx = obtenerAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        // Dos notas descendentes: 330 Hz (E4) y 220 Hz (A3)
        const notas = [
            { freq: 330, time: now, duracion: 0.12 },
            { freq: 220, time: now + 0.09, duracion: 0.18 },
        ];

        notas.forEach(({ freq, time, duracion }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.001, time);
            gain.gain.exponentialRampToValueAtTime(0.22, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duracion);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(time);
            osc.stop(time + duracion);
        });
    } catch {
        // Silenciar en caso de restricciones de reproducción del navegador
    }
}
