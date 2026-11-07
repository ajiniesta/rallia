// js/audio.js
// Sintetizador de audio WebAudio para motor, derrape, cuenta atrás y checkpoints

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.engineOsc = null;
        this.engineGain = null;
        this.skidGain = null;
        this.offTrackGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            // Motor (oscilador sawtooth filtrado)
            this.engineOsc = this.ctx.createOscillator();
            this.engineSubOsc = this.ctx.createOscillator();
            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineGain = this.ctx.createGain();

            this.engineOsc.type = 'sawtooth';
            this.engineSubOsc.type = 'triangle';
            this.engineOsc.frequency.value = 55;
            this.engineSubOsc.frequency.value = 27.5;

            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.value = 260;

            this.engineGain.gain.value = 0.0;

            this.engineOsc.connect(this.engineFilter);
            this.engineSubOsc.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
            this.engineSubOsc.start();

            // Ruido blanco para derrape / grava y fuera de pista
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            // Canal de derrape
            this.skidSource = this.ctx.createBufferSource();
            this.skidSource.buffer = noiseBuffer;
            this.skidSource.loop = true;

            this.skidFilter = this.ctx.createBiquadFilter();
            this.skidFilter.type = 'bandpass';
            this.skidFilter.frequency.value = 950;
            this.skidFilter.Q.value = 1.6;

            this.skidGain = this.ctx.createGain();
            this.skidGain.gain.value = 0.0;

            this.skidSource.connect(this.skidFilter);
            this.skidFilter.connect(this.skidGain);
            this.skidGain.connect(this.ctx.destination);
            this.skidSource.start();

            // Canal de grava / fuera de pista
            this.offTrackSource = this.ctx.createBufferSource();
            this.offTrackSource.buffer = noiseBuffer;
            this.offTrackSource.loop = true;

            this.offTrackFilter = this.ctx.createBiquadFilter();
            this.offTrackFilter.type = 'lowpass';
            this.offTrackFilter.frequency.value = 320;

            this.offTrackGain = this.ctx.createGain();
            this.offTrackGain.gain.value = 0.0;

            this.offTrackSource.connect(this.offTrackFilter);
            this.offTrackFilter.connect(this.offTrackGain);
            this.offTrackGain.connect(this.ctx.destination);
            this.offTrackSource.start();

            this.initialized = true;
        } catch (err) {
            console.warn('WebAudio no disponible:', err);
        }
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.muted && this.initialized) {
            this.stopContinuousSounds();
        }
    }

    stopContinuousSounds() {
        if (!this.initialized || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.engineGain.gain.setTargetAtTime(0, now, 0.05);
        this.skidGain.gain.setTargetAtTime(0, now, 0.05);
        this.offTrackGain.gain.setTargetAtTime(0, now, 0.05);
    }

    updateCarSound(speedRatio, driftIntensity, isOffTrack, isThrottle, isRacing) {
        if (!this.initialized || this.muted || !this.ctx) return;
        if (!isRacing) {
            this.stopContinuousSounds();
            return;
        }

        const now = this.ctx.currentTime;
        const absRatio = Math.min(1.2, Math.abs(speedRatio));

        // Simulación de marchas (4 marchas virtuales)
        const gearProgress = (absRatio * 3.4) % 1;
        const baseFreq = 52 + absRatio * 115 + gearProgress * 38 + (isThrottle ? 14 : 0);

        this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.04);
        this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
        this.engineFilter.frequency.setTargetAtTime(220 + absRatio * 550, now, 0.05);

        const targetEngineVol = 0.045 + (isThrottle ? 0.035 : 0.01) + absRatio * 0.025;
        this.engineGain.gain.setTargetAtTime(targetEngineVol, now, 0.05);

        // Sonido de derrape
        const skidVol = Math.min(0.08, driftIntensity * 0.075 * Math.min(1, absRatio * 2));
        this.skidGain.gain.setTargetAtTime(skidVol, now, 0.04);

        // Sonido de vibración fuera de pista
        const offVol = isOffTrack && absRatio > 0.05 ? Math.min(0.11, absRatio * 0.12) : 0;
        this.offTrackGain.gain.setTargetAtTime(offVol, now, 0.04);
    }

    playCountdownBeep(isFinalGo = false) {
        this.init();
        if (!this.initialized || this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isFinalGo ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(isFinalGo ? 880 : 440, now);
        if (isFinalGo) {
            osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18);
        }

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinalGo ? 0.45 : 0.25));

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isFinalGo ? 0.46 : 0.26));
    }

    playCheckpoint() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.08);

        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
    }

    playFinish() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        const now = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.09);
            gain.gain.setValueAtTime(0.14, now + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.09);
            osc.stop(now + idx * 0.09 + 0.36);
        });
    }

    playCollision() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}
