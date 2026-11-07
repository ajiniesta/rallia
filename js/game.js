// js/game.js
// Bucle principal del juego, máquina de estados (MENU, COUNTDOWN, RACING, FINISHED), controles y HUD

import { STAGE_CONFIGS, Track } from './tracks.js';
import { Car, OFF_TRACK_MAX_SPEED_RATIO } from './car.js';
import { AssetManager } from './textures.js';
import { Renderer } from './renderer.js';
import { StorageManager } from './storage.js';
import { SoundManager } from './audio.js';

export class RallyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.minimapCanvas = document.getElementById('minimapCanvas');

        this.assets = new AssetManager();
        this.storage = new StorageManager();
        this.audio = new SoundManager();
        this.renderer = new Renderer(this.canvas, this.minimapCanvas, this.assets);

        this.state = 'MENU'; // 'MENU' | 'COUNTDOWN' | 'RACING' | 'FINISHED'
        this.selectedStageId = 'stage1';
        this.selectedMode = 'point_to_point'; // Por defecto Punto A -> Punto B

        this.track = null;
        this.car = new Car();

        // Progreso de la etapa
        this.activeCheckpointIndex = 0;
        this.currentLap = 1;
        this.elapsedMs = 0;
        this.countdownValue = 3;
        this.countdownTimer = 0;
        this.goBannerTimer = 0;
        this.splitBannerTimer = 0;

        this.input = {
            up: false,
            down: false,
            left: false,
            right: false,
            handbrake: false
        };

        this.lastFrameTime = performance.now();
    }

    async init() {
        this.renderer.resize();
        await this.assets.init(this.renderer.ctx);

        // Cargar pista de fondo inicial para vista previa en el menú
        this.loadStage(this.selectedStageId, this.selectedMode, false);

        this.bindEvents();
        this.renderMenuCards();
        this.updateBestTimesUI();

        // Exponer instancia para depuración y pruebas
        window.rallyGame = this;

        requestAnimationFrame((ts) => this.loop(ts));
    }

    bindEvents() {
        window.addEventListener('resize', () => this.renderer.resize());

        // Teclado
        window.addEventListener('keydown', (e) => {
            const code = e.code;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
                e.preventDefault();
            }
            if (code === 'ArrowUp' || code === 'KeyW') this.input.up = true;
            if (code === 'ArrowDown' || code === 'KeyS') this.input.down = true;
            if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = true;
            if (code === 'ArrowRight' || code === 'KeyD') this.input.right = true;
            if (code === 'Space') this.input.handbrake = true;

            if (code === 'KeyR' && this.state === 'RACING') {
                this.recoverCarToTrack();
            }
            if (code === 'Escape' && (this.state === 'RACING' || this.state === 'COUNTDOWN')) {
                this.returnToMenu();
            }
        });

        window.addEventListener('keyup', (e) => {
            const code = e.code;
            if (code === 'ArrowUp' || code === 'KeyW') this.input.up = false;
            if (code === 'ArrowDown' || code === 'KeyS') this.input.down = false;
            if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = false;
            if (code === 'ArrowRight' || code === 'KeyD') this.input.right = false;
            if (code === 'Space') this.input.handbrake = false;
        });

        // Selector de Modo (Tramo Punto A->B vs Circuito 3 Vueltas)
        document.querySelectorAll('.mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.selectedMode = btn.dataset.mode;
                document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadStage(this.selectedStageId, this.selectedMode, false);
                this.renderMenuCards();
                this.updateBestTimesUI();
            });
        });

        // Botón limpiar récords
        const clearBtn = document.getElementById('clearRecordsBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.storage.clearAll();
                this.renderMenuCards();
                this.updateBestTimesUI();
            });
        }

        // Botón de silenciar sonido
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                this.audio.setMuted(!this.audio.muted);
                muteBtn.textContent = this.audio.muted ? '🔇 Sonido: OFF' : '🔊 Sonido: ON';
            });
        }

        // Botones del HUD y pantalla final
        document.getElementById('hudRestartBtn')?.addEventListener('click', () => {
            this.startStage(this.selectedStageId, this.selectedMode);
        });
        document.getElementById('hudMenuBtn')?.addEventListener('click', () => {
            this.returnToMenu();
        });
        document.getElementById('retryStageBtn')?.addEventListener('click', () => {
            this.startStage(this.selectedStageId, this.selectedMode);
        });
        document.getElementById('nextStageBtn')?.addEventListener('click', () => {
            const idx = STAGE_CONFIGS.findIndex((s) => s.id === this.selectedStageId);
            const nextCfg = STAGE_CONFIGS[(idx + 1) % STAGE_CONFIGS.length];
            this.startStage(nextCfg.id, this.selectedMode);
        });
        document.getElementById('backToMenuBtn')?.addEventListener('click', () => {
            this.returnToMenu();
        });
    }

    renderMenuCards() {
        const container = document.getElementById('stageCardsContainer');
        if (!container) return;
        container.innerHTML = '';

        STAGE_CONFIGS.forEach((stage) => {
            const bestMs = this.storage.getBestTime(stage.id, this.selectedMode);
            const bestFormatted = StorageManager.formatTime(bestMs);
            const isSelected = stage.id === this.selectedStageId;

            const card = document.createElement('div');
            card.className = `stage-card ${isSelected ? 'selected' : ''}`;
            card.dataset.stageId = stage.id;

            card.innerHTML = `
                <div class="stage-card-header">
                    <span class="stage-badge">ETAPA ${stage.number}</span>
                    <span class="surface-tag">${stage.surfaceLabel}</span>
                </div>
                <h3>${stage.name}</h3>
                <p class="stage-desc">${stage.subtitle}</p>
                <div class="stage-record-box">
                    <span class="record-label">🏆 Mejor Tiempo (${this.selectedMode === 'point_to_point' ? 'Tramo A→B' : 'Circuito'}):</span>
                    <strong class="record-value" id="record-${stage.id}">${bestFormatted}</strong>
                </div>
                <button class="play-stage-btn" data-stage="${stage.id}">
                    🏁 CORRER ETAPA ${stage.number}
                </button>
            `;

            card.addEventListener('click', (e) => {
                this.selectedStageId = stage.id;
                document.querySelectorAll('.stage-card').forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');
                this.loadStage(this.selectedStageId, this.selectedMode, false);

                if (e.target.classList.contains('play-stage-btn')) {
                    this.startStage(stage.id, this.selectedMode);
                }
            });

            container.appendChild(card);
        });
    }

    updateBestTimesUI() {
        STAGE_CONFIGS.forEach((stage) => {
            const el = document.getElementById(`record-${stage.id}`);
            if (el) {
                const best = this.storage.getBestTime(stage.id, this.selectedMode);
                el.textContent = StorageManager.formatTime(best);
            }
        });
    }

    loadStage(stageId, mode, resetCamera = true) {
        const config = STAGE_CONFIGS.find((s) => s.id === stageId) || STAGE_CONFIGS[0];
        this.selectedStageId = config.id;
        this.selectedMode = mode;

        this.track = new Track(config, mode);
        const start = this.track.startPose;
        this.car.reset(start.x, start.y, start.angle);
        this.renderer.snapCamera(this.car);

        this.activeCheckpointIndex = 0;
        this.currentLap = 1;
        this.elapsedMs = 0;
    }

    startStage(stageId, mode) {
        this.audio.init();
        this.loadStage(stageId, mode, true);

        // Ocultar menú y pantalla final, mostrar HUD y Cuenta Atrás
        document.getElementById('menuOverlay')?.classList.add('hidden');
        document.getElementById('finishOverlay')?.classList.add('hidden');
        document.getElementById('hudOverlay')?.classList.remove('hidden');

        // Actualizar textos del HUD
        document.getElementById('hudStageName').textContent = `ETAPA ${this.track.config.number}: ${this.track.config.name}`;
        document.getElementById('hudModeBadge').textContent = mode === 'point_to_point' ? 'TRAMO PUNTO A → B' : 'CIRCUITO (3 VUELTAS)';

        const bestMs = this.storage.getBestTime(stageId, mode);
        document.getElementById('hudBestTime').textContent = StorageManager.formatTime(bestMs);

        // Iniciar estado de Cuenta Atrás (3, 2, 1, ¡YA!)
        this.state = 'COUNTDOWN';
        this.countdownValue = 3;
        this.countdownTimer = 0.95; // segundos por número
        this.goBannerTimer = 0;

        this.updateCountdownUI('3', 'prep');
        this.audio.playCountdownBeep(false);
        this.updateHUD();
    }

    updateCountdownUI(text, phase) {
        const overlay = document.getElementById('countdownOverlay');
        const numberEl = document.getElementById('countdownNumber');
        const lights = document.querySelectorAll('.rally-light');

        if (!overlay || !numberEl) return;

        if (!text) {
            overlay.classList.add('hidden');
            return;
        }

        overlay.classList.remove('hidden');
        numberEl.textContent = text;
        numberEl.className = `countdown-number ${phase}`;

        lights.forEach((l, idx) => {
            l.classList.remove('red', 'green');
            if (phase === 'go') {
                l.classList.add('green');
            } else {
                const countNum = parseInt(text, 10);
                if (countNum <= 3 - idx) {
                    l.classList.add('red');
                }
            }
        });
    }

    returnToMenu() {
        this.state = 'MENU';
        this.audio.stopContinuousSounds();
        document.getElementById('hudOverlay')?.classList.add('hidden');
        document.getElementById('finishOverlay')?.classList.add('hidden');
        document.getElementById('countdownOverlay')?.classList.add('hidden');
        document.getElementById('menuOverlay')?.classList.remove('hidden');
        this.renderMenuCards();
        this.updateBestTimesUI();
    }

    recoverCarToTrack() {
        const info = this.track.getTrackSurfaceInfo(this.car.x, this.car.y);
        this.car.reset(info.closestPoint.x, info.closestPoint.y, info.tangentAngle);
    }

    loop(timestamp) {
        const dt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastFrameTime) / 1000));
        this.lastFrameTime = timestamp;

        this.update(dt);
        this.renderer.render(this.track, this.car, this.activeCheckpointIndex);

        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(dt) {
        if (this.state === 'MENU') {
            // Vista panorámica suave sobre la etapa seleccionada
            this.renderer.updateCamera(this.car, dt);
            return;
        }

        if (this.state === 'COUNTDOWN') {
            this.countdownTimer -= dt;
            if (this.countdownTimer <= 0) {
                this.countdownValue -= 1;
                if (this.countdownValue > 0) {
                    this.countdownTimer = 0.95;
                    this.updateCountdownUI(String(this.countdownValue), 'prep');
                    this.audio.playCountdownBeep(false);
                } else {
                    // ¡Comienza la etapa!
                    this.state = 'RACING';
                    this.goBannerTimer = 0.85;
                    this.updateCountdownUI('¡YA!', 'go');
                    this.audio.playCountdownBeep(true);
                }
            }
            this.renderer.updateCamera(this.car, dt);
            this.updateHUD();
            return;
        }

        if (this.state === 'RACING') {
            if (this.goBannerTimer > 0) {
                this.goBannerTimer -= dt;
                if (this.goBannerTimer <= 0) {
                    this.updateCountdownUI('', '');
                }
            }

            if (this.splitBannerTimer > 0) {
                this.splitBannerTimer -= dt;
                if (this.splitBannerTimer <= 0) {
                    document.getElementById('checkpointToast')?.classList.add('hidden');
                }
            }

            // Cronómetro de la etapa en milisegundos
            this.elapsedMs += dt * 1000;

            // Determinar si el coche está dentro del circuito o fuera de pista
            const surfaceInfo = this.track.getTrackSurfaceInfo(this.car.x, this.car.y);

            // Actualizar física del coche (aplica la desaceleración y límite del 60% si surfaceInfo.isOnTrack === false)
            this.car.update(
                dt,
                this.input,
                surfaceInfo.isOnTrack,
                this.track.config.grip,
                this.track.config
            );

            // Colisiones con árboles, rocas y neumáticos exteriores
            this.car.resolvePropCollisions(this.track.props, () => {
                this.audio.playCollision();
            });

            // Re-evaluar superficie tras colisiones para mantener coherencia en HUD
            const postSurface = this.track.getTrackSurfaceInfo(this.car.x, this.car.y);
            this.car.isOnTrack = postSurface.isOnTrack;

            // Comprobar paso por Checkpoints y Meta
            this.checkCheckpoints();

            // Actualizar cámara y sonido
            this.renderer.updateCamera(this.car, dt);
            this.audio.updateCarSound(
                this.car.speed / this.car.maxSpeed,
                this.car.driftIntensity,
                !this.car.isOnTrack,
                this.input.up,
                true
            );

            this.updateHUD(postSurface);
            return;
        }

        if (this.state === 'FINISHED') {
            // Frenar el coche suavemente tras cruzar la meta
            const noInput = { up: false, down: true, left: false, right: false, handbrake: false };
            this.car.update(dt, noInput, true, this.track.config.grip, this.track.config);
            this.renderer.updateCamera(this.car, dt);
            this.audio.stopContinuousSounds();
        }
    }

    checkCheckpoints() {
        const cp = this.track.checkpoints[this.activeCheckpointIndex];
        if (!cp) return;

        const dist = Math.hypot(this.car.x - cp.x, this.car.y - cp.y);
        if (dist <= cp.width * 0.72) {
            this.activeCheckpointIndex++;

            if (this.activeCheckpointIndex >= this.track.checkpoints.length) {
                if (this.track.isClosed && this.currentLap < this.track.totalLaps) {
                    // Siguiente vuelta en modo Circuito
                    this.currentLap++;
                    this.activeCheckpointIndex = 0;
                    this.audio.playCheckpoint();
                    this.showCheckpointToast(`VUELTA ${this.currentLap}/${this.track.totalLaps} - ${StorageManager.formatTime(this.elapsedMs)}`);
                } else {
                    // ¡Meta alcanzada! Fin de la etapa
                    this.finishStage();
                }
            } else {
                this.audio.playCheckpoint();
                this.showCheckpointToast(`✓ ${cp.label} — ${StorageManager.formatTime(this.elapsedMs)}`);
            }
        }
    }

    showCheckpointToast(message) {
        const toast = document.getElementById('checkpointToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        this.splitBannerTimer = 1.6;
    }

    finishStage() {
        this.state = 'FINISHED';
        this.audio.playFinish();
        this.updateCountdownUI('', '');

        const finalTimeMs = this.elapsedMs;
        const result = this.storage.saveTime(this.selectedStageId, this.selectedMode, finalTimeMs);

        // Rellenar modal de resultados
        document.getElementById('finishStageTitle').textContent = `ETAPA ${this.track.config.number}: ${this.track.config.name}`;
        document.getElementById('finishModeLabel').textContent =
            this.selectedMode === 'point_to_point' ? 'Modo: Tramo Punto A → B' : 'Modo: Circuito (3 Vueltas)';
        document.getElementById('finishCurrentTime').textContent = StorageManager.formatTime(finalTimeMs);
        document.getElementById('finishBestTime').textContent = StorageManager.formatTime(result.bestTime);

        const badge = document.getElementById('newRecordBadge');
        if (badge) {
            if (result.isNewRecord) {
                badge.textContent = '🏆 ¡NUEVO RÉCORD DE LA ETAPA!';
                badge.className = 'record-status-badge new-record';
            } else {
                const diff = finalTimeMs - result.bestTime;
                badge.textContent = `A +${StorageManager.formatTime(diff)} de tu récord`;
                badge.className = 'record-status-badge';
            }
        }

        document.getElementById('finishOverlay')?.classList.remove('hidden');
        this.updateBestTimesUI();
    }

    updateHUD(surfaceInfo = null) {
        // Tiempo actual
        const timeEl = document.getElementById('hudCurrentTime');
        if (timeEl) timeEl.textContent = StorageManager.formatTime(this.elapsedMs);

        // Velocidad y porcentaje respecto a velocidad máxima
        const speedKmh = this.car.getSpeedKmh();
        const speedPct = this.car.getSpeedPercentage();

        const speedValEl = document.getElementById('hudSpeedValue');
        const speedPctEl = document.getElementById('hudSpeedPct');
        const speedBarEl = document.getElementById('hudSpeedBarFill');

        if (speedValEl) speedValEl.textContent = String(speedKmh);
        if (speedPctEl) speedPctEl.textContent = `${speedPct}%`;
        if (speedBarEl) {
            speedBarEl.style.width = `${speedPct}%`;
            speedBarEl.className = `speed-bar-fill ${this.car.isOnTrack ? 'on-track' : 'off-track'}`;
        }

        // Indicador de estado de pista (En Pista 100% vs Fuera de Pista Máx 60%)
        const surfaceBadge = document.getElementById('hudSurfaceStatus');
        if (surfaceBadge) {
            if (this.car.isOnTrack) {
                surfaceBadge.textContent = '✓ EN PISTA (MÁX 100%)';
                surfaceBadge.className = 'surface-status on-track';
            } else {
                surfaceBadge.textContent = `⚠️ FUERA DE PISTA (LÍMITE ${Math.round(OFF_TRACK_MAX_SPEED_RATIO * 100)}% VEL. MÁX)`;
                surfaceBadge.className = 'surface-status off-track';
            }
        }

        // Progreso de Tramo / Checkpoints o Vueltas
        const progressEl = document.getElementById('hudProgressText');
        if (progressEl && this.track) {
            if (this.track.isClosed) {
                progressEl.textContent = `VUELTA ${this.currentLap} / ${this.track.totalLaps}  •  CP ${this.activeCheckpointIndex}/${this.track.checkpoints.length}`;
            } else {
                const pct = surfaceInfo ? Math.round(surfaceInfo.progressRatio * 100) : 0;
                progressEl.textContent = `PROGRESO TRAMO: ${pct}%  •  CONTROL ${this.activeCheckpointIndex}/${this.track.checkpoints.length}`;
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new RallyGame();
    game.init();
});
