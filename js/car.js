// js/car.js
// Física cenital de coche de Rally con derrape, huellas, partículas y penalización del 60% fuera de pista

export const OFF_TRACK_MAX_SPEED_RATIO = 0.60; // Máximo 60% de la velocidad máxima al salirse del circuito

export const CAR_MODELS = [
    {
        id: 'wrc_rally1',
        name: 'Apex WRC Rally1',
        category: 'WRC Híbrido 4WD',
        description: 'Equilibrado y rápido. Gran tracción integral y aceleración contundente.',
        color: '#ef4444',
        accentColor: '#0284c7',
        spriteKey: 'car_png',
        maxSpeed: 560,
        acceleration: 420,
        braking: 650,
        turnRate: 3.2,
        lateralGripMult: 1.0,
        stats: { speed: 85, accel: 88, handling: 82 }
    },
    {
        id: 'classic_stratos',
        name: 'Stratos Turbo 70s',
        category: 'Leyenda RWD Grupo 4',
        description: 'Extremadamente ágil y propenso al derrape. Velocidad punta alta pero exige manos firmes.',
        color: '#10b981',
        accentColor: '#facc15',
        spriteKey: 'car_stratos',
        maxSpeed: 580,
        acceleration: 440,
        braking: 620,
        turnRate: 3.55,
        lateralGripMult: 0.88, // Más derrapador
        stats: { speed: 92, accel: 85, handling: 75 }
    },
    {
        id: 'beast_group_b',
        name: 'Quattro Beast B',
        category: 'Grupo B Evolution',
        description: 'Potencia salvaje y aceleración brutal con tracción sobre todas las superficies.',
        color: '#eab308',
        accentColor: '#1e293b',
        spriteKey: 'car_quattro',
        maxSpeed: 570,
        acceleration: 480,
        braking: 690,
        turnRate: 3.05,
        lateralGripMult: 1.08,
        stats: { speed: 88, accel: 98, handling: 80 }
    },
    {
        id: 'subie_imprez',
        name: 'Blue Boxer WRX',
        category: 'Rally Clásico AWD',
        description: 'Control quirúrgico y máximo agarre en curvas reviradas, ideal para tramos técnicos.',
        color: '#2563eb',
        accentColor: '#facc15',
        spriteKey: 'car_boxer',
        maxSpeed: 545,
        acceleration: 430,
        braking: 670,
        turnRate: 3.4,
        lateralGripMult: 1.12,
        stats: { speed: 80, accel: 86, handling: 94 }
    }
];

export class Car {
    constructor(x = 0, y = 0, angle = 0, modelConfig = CAR_MODELS[0]) {
        this.modelConfig = modelConfig;
        this.reset(x, y, angle);
    }

    applyModel(modelConfig) {
        if (!modelConfig) return;
        this.modelConfig = modelConfig;
        this.maxSpeed = modelConfig.maxSpeed || 560;
        this.maxOffTrackSpeed = this.maxSpeed * OFF_TRACK_MAX_SPEED_RATIO;
        this.acceleration = modelConfig.acceleration || 410;
        this.braking = modelConfig.braking || 640;
        this.turnRate = modelConfig.turnRate || 3.15;
        this.lateralGripMult = modelConfig.lateralGripMult || 1.0;
    }

    reset(x, y, angle) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.angle = angle;

        // Velocidad escalar longitudinal y componentes 2D para derrape
        this.speed = 0;
        this.vx = 0;
        this.vy = 0;

        // Parámetros de rendimiento según el modelo seleccionado
        const m = this.modelConfig || CAR_MODELS[0];
        this.maxSpeed = m.maxSpeed || 560; // px/s en pista (100% -> mostrado como 200 km/h en HUD)
        this.maxOffTrackSpeed = this.maxSpeed * OFF_TRACK_MAX_SPEED_RATIO; // 60% exacto
        this.maxReverseSpeed = -170;

        this.acceleration = m.acceleration || 410;          // px/s²
        this.braking = m.braking || 640;                    // px/s²
        this.turnRate = m.turnRate || 3.15;                 // rad/s
        this.lateralGripMult = m.lateralGripMult || 1.0;

        this.offTrackDeceleration = 540;  // Desaceleración firme al salirse de pista por encima del 60%
        this.rollingResistance = 150;     // Fricción al soltar el acelerador
        this.steerAngle = 0;              // Ángulo visual de las ruedas delanteras

        // Estado de superficie y derrape
        this.isOnTrack = true;
        this.driftIntensity = 0;
        this.isBraking = false;
        this.isHandbrake = false;

        // Dimensiones para colisiones
        this.radius = 22;
        this.length = 64;
        this.width = 34;

        // Efectos visuales: marcas de neumáticos y partículas de tierra/nieve
        this.skidMarks = [];
        this.particles = [];
        this.skidTimer = 0;
    }

    /**
     * Actualiza la física del coche de rally.
     * @param {number} dt Delta time en segundos
     * @param {Object} input Estado de controles { up, down, left, right, handbrake }
     * @param {boolean} isOnTrack Si el coche está dentro del circuito
     * @param {number} surfaceGrip Agarre base de la etapa (0.85 - 1.0)
     * @param {Object} stageConfig Configuración visual de la etapa para partículas
     */
    update(dt, input, isOnTrack, surfaceGrip = 0.92, stageConfig = null) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.isOnTrack = isOnTrack;

        // Límite de velocidad efectivo: 100% en pista, 60% fuera de pista
        const currentMaxSpeed = isOnTrack
            ? this.maxSpeed
            : this.maxSpeed * OFF_TRACK_MAX_SPEED_RATIO;

        this.isBraking = false;
        this.isHandbrake = Boolean(input.handbrake);

        // 1. Aceleración longitudinal y frenado
        if (input.up) {
            if (this.speed < 0) {
                // Frenando desde marcha atrás
                this.speed += this.braking * dt;
                this.isBraking = true;
            } else {
                // Aceleración (ligeramente menor tracción fuera de pista)
                const tractionFactor = isOnTrack ? 1.0 : 0.72;
                this.speed += this.acceleration * tractionFactor * dt;
            }
        } else if (input.down) {
            if (this.speed > 10) {
                this.speed -= this.braking * dt;
                this.isBraking = true;
            } else {
                this.speed -= (this.acceleration * 0.65) * dt;
            }
        } else {
            // Resistencia a la rodadura al soltar pedales
            const drag = isOnTrack ? this.rollingResistance : this.rollingResistance * 1.9;
            if (Math.abs(this.speed) > drag * dt) {
                this.speed -= Math.sign(this.speed) * drag * dt;
            } else {
                this.speed = 0;
            }
        }

        // Freno de mano (reduce velocidad ligeramente y provoca derrape)
        if (this.isHandbrake && Math.abs(this.speed) > 20) {
            this.speed -= Math.sign(this.speed) * 230 * dt;
        }

        // 2. Regla clave: Al salirse del circuito el coche desacelera y va como máximo al 60% de su velocidad máxima
        if (!isOnTrack && this.speed > currentMaxSpeed) {
            this.speed = Math.max(
                currentMaxSpeed,
                this.speed - this.offTrackDeceleration * dt
            );
        } else if (this.speed > currentMaxSpeed) {
            this.speed = currentMaxSpeed;
        }

        const minRev = isOnTrack ? this.maxReverseSpeed : this.maxReverseSpeed * OFF_TRACK_MAX_SPEED_RATIO;
        if (this.speed < minRev) {
            this.speed = minRev;
        }

        // 3. Dirección (Steering)
        let steerInput = 0;
        if (input.left) steerInput -= 1;
        if (input.right) steerInput += 1;

        this.steerAngle = steerInput * 0.42;

        // El coche gira proporcionalmente a su movimiento
        const speedFactor = Math.min(1, Math.abs(this.speed) / 135);
        const dirSign = this.speed >= -5 ? 1 : -1;
        const handbrakeTurnBoost = this.isHandbrake ? 1.28 : 1.0;

        this.angle += steerInput * this.turnRate * speedFactor * dirSign * handbrakeTurnBoost * dt;

        // 4. Vector de velocidad con derrape (interpolación entre dirección del morro y vector de inercia actual)
        const forwardX = Math.cos(this.angle);
        const forwardY = Math.sin(this.angle);

        const targetVx = forwardX * this.speed;
        const targetVy = forwardY * this.speed;

        // Nivel de agarre lateral (menor con freno de mano o fuera de pista)
        let lateralGrip = surfaceGrip * (isOnTrack ? 7.5 : 5.2) * (this.lateralGripMult || 1.0);
        if (this.isHandbrake) lateralGrip *= 0.42;

        const blend = Math.min(1, lateralGrip * dt);
        this.vx = this.vx + (targetVx - this.vx) * blend;
        this.vy = this.vy + (targetVy - this.vy) * blend;

        // Respetar el tope estricto de velocidad también en el módulo del vector 2D
        const actualVelMag = Math.hypot(this.vx, this.vy);
        if (actualVelMag > currentMaxSpeed && actualVelMag > 0.001) {
            const clampedMag = !isOnTrack
                ? Math.max(currentMaxSpeed, Math.min(actualVelMag, Math.abs(this.speed)))
                : currentMaxSpeed;
            this.vx = (this.vx / actualVelMag) * clampedMag;
            this.vy = (this.vy / actualVelMag) * clampedMag;
        }

        // Avanzar posición
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 5. Calcular intensidad de derrape (diferencia entre dirección del chasis y dirección de movimiento)
        const lateralVel = Math.abs(-forwardY * this.vx + forwardX * this.vy);
        this.driftIntensity = Math.min(1, lateralVel / 150 + (this.isHandbrake && Math.abs(this.speed) > 120 ? 0.5 : 0));

        // 6. Emitir huellas de derrape y partículas
        this.updateEffects(dt, stageConfig);
    }

    updateEffects(dt, stageConfig) {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        // Posición de las dos ruedas traseras
        const rearOffset = -22;
        const sideOffset = 13;

        const leftWheelX = this.x + cos * rearOffset - sin * sideOffset;
        const leftWheelY = this.y + sin * rearOffset + cos * sideOffset;
        const rightWheelX = this.x + cos * rearOffset + sin * sideOffset;
        const rightWheelY = this.y + sin * rearOffset - cos * sideOffset;

        this.skidTimer += dt;
        const shouldSkid = (this.driftIntensity > 0.24 || !this.isOnTrack || this.isHandbrake) && Math.abs(this.speed) > 75;

        if (shouldSkid && this.skidTimer >= 0.03) {
            this.skidTimer = 0;
            this.skidMarks.push({
                x1: leftWheelX,
                y1: leftWheelY,
                x2: rightWheelX,
                y2: rightWheelY,
                angle: this.angle,
                alpha: this.isOnTrack ? 0.36 : 0.48,
                color: this.isOnTrack ? 'rgba(30, 25, 20, 0.38)' : 'rgba(45, 32, 18, 0.45)',
                life: 4.5
            });
            if (this.skidMarks.length > 260) {
                this.skidMarks.shift();
            }
        }

        // Emitir partículas de polvo / tierra / nieve
        if (Math.abs(this.speed) > 65 && (this.driftIntensity > 0.15 || !this.isOnTrack || Math.random() < 0.45)) {
            const dustColor = !this.isOnTrack
                ? (stageConfig?.offTrackDustColor || 'rgba(120, 90, 50, 0.55)')
                : (stageConfig?.dustColor || 'rgba(180, 140, 95, 0.5)');

            for (const [wx, wy] of [[leftWheelX, leftWheelY], [rightWheelX, rightWheelY]]) {
                if (Math.random() < (this.isOnTrack ? 0.45 : 0.85)) {
                    this.particles.push({
                        x: wx + (Math.random() - 0.5) * 6,
                        y: wy + (Math.random() - 0.5) * 6,
                        vx: -this.vx * 0.15 + (Math.random() - 0.5) * 35,
                        vy: -this.vy * 0.15 + (Math.random() - 0.5) * 35,
                        size: 5 + Math.random() * 7 + (!this.isOnTrack ? 4 : 0),
                        alpha: 0.65,
                        life: 0.45 + Math.random() * 0.25,
                        maxLife: 0.7,
                        color: dustColor
                    });
                }
            }
        }

        // Actualizar partículas activas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.size += 18 * dt;
            p.life -= dt;
            p.alpha = Math.max(0, (p.life / p.maxLife) * 0.6);
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Desvanecer marcas de neumáticos antiguas
        for (let i = this.skidMarks.length - 1; i >= 0; i--) {
            this.skidMarks[i].life -= dt;
            if (this.skidMarks[i].life <= 0) {
                this.skidMarks.splice(i, 1);
            }
        }
    }

    /**
     * Comprueba y resuelve colisiones contra árboles, rocas y barreras del mapa
     */
    resolvePropCollisions(props, onCollisionCallback) {
        let collided = false;
        for (let i = 0; i < props.length; i++) {
            const prop = props[i];
            if (!prop.collidable) continue;

            const dx = this.x - prop.x;
            const dy = this.y - prop.y;
            const minDist = this.radius + prop.radius * 0.72;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist * minDist && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = minDist - dist;

                // Separar el coche del obstáculo
                this.x += nx * (overlap + 1);
                this.y += ny * (overlap + 1);

                // Reducir velocidad por impacto y rebotar ligeramente
                if (Math.abs(this.speed) > 90) {
                    collided = true;
                }
                this.speed *= 0.45;
                this.vx = nx * 90 + this.vx * 0.35;
                this.vy = ny * 90 + this.vy * 0.35;
            }
        }

        if (collided && onCollisionCallback) {
            onCollisionCallback();
        }
    }

    /**
     * Devuelve la velocidad actual en km/h escalada para el HUD (200 km/h = 100%, 120 km/h = 60% fuera de pista)
     */
    getSpeedKmh() {
        const currentSpeedMag = Math.hypot(this.vx, this.vy);
        const ratio = Math.min(1, currentSpeedMag / this.maxSpeed);
        return Math.round(ratio * 200);
    }

    getSpeedPercentage() {
        const currentSpeedMag = Math.hypot(this.vx, this.vy);
        return Math.min(100, Math.round((currentSpeedMag / this.maxSpeed) * 100));
    }
}
