// js/renderer.js
// Renderizado cenital del circuito, texturas, derrape, coche, adornos exteriores y minimapa en esquina

export class Renderer {
    constructor(canvas, minimapCanvas, assets) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.minimapCanvas = minimapCanvas;
        this.minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
        this.assets = assets;

        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.0
        };
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Asegurar que los patrones de textura estén asociados al contexto principal
        if (this.assets && this.assets.canvases) {
            for (const [k, c] of Object.entries(this.assets.canvases)) {
                if (['grass', 'dirtRoad', 'snow', 'tarmac', 'desert', 'canyonRoad', 'checker'].includes(k)) {
                    this.assets.patterns[k] = this.ctx.createPattern(c, 'repeat');
                }
            }
        }
    }

    snapCamera(car) {
        this.camera.x = car.x;
        this.camera.y = car.y;
    }

    updateCamera(car, dt) {
        // Look-ahead suave hacia donde se dirige el coche
        const lookAheadX = car.vx * 0.24;
        const lookAheadY = car.vy * 0.24;
        const targetX = car.x + lookAheadX;
        const targetY = car.y + lookAheadY;

        const lerpFactor = Math.min(1, dt * 7.5);
        this.camera.x += (targetX - this.camera.x) * lerpFactor;
        this.camera.y += (targetY - this.camera.y) * lerpFactor;
    }

    render(track, car, activeCheckpointIndex) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.save();
        ctx.clearRect(0, 0, w, h);

        // Trasladar el mundo según la cámara centrada en el coche
        const camLeft = this.camera.x - w * 0.5;
        const camTop = this.camera.y - h * 0.5;
        ctx.translate(-camLeft, -camTop);

        // 1. Pintar terreno exterior infinito con textura tileable de la etapa
        const terrainPattern = this.assets.patterns[track.config.terrainPattern];
        ctx.fillStyle = terrainPattern || '#2d5a27';
        ctx.fillRect(camLeft - 64, camTop - 64, w + 128, h + 128);

        // 2. Pintar el trazado del circuito/tramo (arcén exterior, pianos y calzada con textura)
        this.drawTrackSurface(ctx, track);

        // 3. Pintar arcos/líneas de Salida, Checkpoints y Meta
        this.drawTrackGates(ctx, track, activeCheckpointIndex);

        // 4. Pintar huellas de derrape y partículas
        this.drawSkidMarksAndParticles(ctx, car);

        // 5. Pintar el coche de Rally (con su sombra, luces y dirección)
        this.drawCar(ctx, car);

        // 6. Pintar adornos exteriores (árboles, rocas, neumáticos) con frustum culling
        this.drawEnvironmentProps(ctx, track.props, camLeft, camTop, w, h);

        ctx.restore();

        // 7. Si el coche está fuera de pista, pintar un sutil viñeteado de advertencia en los bordes de pantalla
        if (!car.isOnTrack) {
            this.drawOffTrackVignette(ctx, w, h);
        }

        // 8. Actualizar el Minimapa en la esquina
        if (this.minimapCtx) {
            this.renderMinimap(track, car, activeCheckpointIndex);
        }
    }

    traceTrackPath(ctx, track) {
        const pts = track.points;
        if (!pts.length) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        if (track.isClosed) {
            ctx.closePath();
        }
    }

    drawTrackSurface(ctx, track) {
        const cfg = track.config;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Capa 1: Sombra/borde de transición con la naturaleza
        this.traceTrackPath(ctx, track);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.lineWidth = track.trackWidth + 36;
        ctx.stroke();

        // Capa 2: Arcén exterior de tierra/grava/nieve compactada
        this.traceTrackPath(ctx, track);
        ctx.strokeStyle = cfg.shoulderColor;
        ctx.lineWidth = track.trackWidth + 24;
        ctx.stroke();

        // Capa 3: Pianos / Bordillos bicolor estilo rally en los bordes de la calzada
        this.traceTrackPath(ctx, track);
        ctx.strokeStyle = cfg.kerbColorA;
        ctx.lineWidth = track.trackWidth + 8;
        ctx.stroke();

        ctx.save();
        ctx.setLineDash([26, 26]);
        this.traceTrackPath(ctx, track);
        ctx.strokeStyle = cfg.kerbColorB;
        ctx.lineWidth = track.trackWidth + 8;
        ctx.stroke();
        ctx.restore();

        // Capa 4: Superficie principal de rodadura con textura tileable (tierra, asfalto o cañón)
        const roadPat = this.assets.patterns[cfg.roadPattern];
        this.traceTrackPath(ctx, track);
        ctx.strokeStyle = roadPat || '#8b5a2b';
        ctx.lineWidth = track.trackWidth;
        ctx.stroke();

        // Capa 5: Rodadas sutiles de neumáticos a lo largo de la trazada ideal
        ctx.save();
        this.traceTrackPath(ctx, track);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = track.trackWidth * 0.52;
        ctx.stroke();

        // Línea discontinua central sutil o marcas de carril
        ctx.setLineDash([32, 42]);
        this.traceTrackPath(ctx, track);
        ctx.strokeStyle = cfg.borderLineColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }

    drawTrackGates(ctx, track, activeCheckpointIndex) {
        // Dibujar línea de Salida en modo Punto A -> Punto B
        if (!track.isClosed) {
            const sIdx = track.startPose.index;
            const sPt = track.points[sIdx];
            const sAngle = track.angles[sIdx];
            this.drawBannerLine(ctx, sPt.x, sPt.y, sAngle, track.trackWidth, 'SALIDA', '#22c55e', false);
        }

        // Dibujar cada checkpoint y la Meta
        track.checkpoints.forEach((cp, index) => {
            const isNext = index === activeCheckpointIndex;
            const isPassed = index < activeCheckpointIndex;

            if (cp.isFinish) {
                this.drawBannerLine(ctx, cp.x, cp.y, cp.angle, track.trackWidth, 'META', '#ef4444', true);
            } else {
                const color = isNext ? '#facc15' : (isPassed ? 'rgba(34, 197, 94, 0.45)' : 'rgba(148, 163, 184, 0.35)');
                this.drawCheckpointGate(ctx, cp, track.trackWidth, color, isNext);
            }
        });
    }

    drawBannerLine(ctx, x, y, angle, width, text, bannerColor, isChecker) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Franja pintada sobre el suelo (perpendicular al avance, es decir, a lo largo del eje Y local)
        const halfW = width * 0.5;
        if (isChecker && this.assets.patterns.checker) {
            ctx.fillStyle = this.assets.patterns.checker;
            ctx.fillRect(-14, -halfW, 28, width);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillRect(-10, -halfW, 20, width);
        }

        // Postes laterales del arco de rally
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, -halfW - 14, 10, 0, Math.PI * 2);
        ctx.arc(0, halfW + 14, 10, 0, Math.PI * 2);
        ctx.fill();

        // Pancarta superior translúcida para ver el coche pasar por debajo
        ctx.fillStyle = bannerColor;
        ctx.globalAlpha = 0.88;
        ctx.fillRect(-13, -halfW - 14, 26, width + 28);

        ctx.globalAlpha = 1;
        ctx.save();
        ctx.rotate(-Math.PI * 0.5);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();

        ctx.restore();
    }

    drawCheckpointGate(ctx, cp, width, color, isNext) {
        ctx.save();
        ctx.translate(cp.x, cp.y);
        ctx.rotate(cp.angle);

        const halfW = width * 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = isNext ? 6 : 3;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.moveTo(0, -halfW);
        ctx.lineTo(0, halfW);
        ctx.stroke();
        ctx.setLineDash([]);

        // Banderines laterales de control horario
        ctx.fillStyle = isNext ? '#facc15' : '#64748b';
        ctx.beginPath();
        ctx.arc(0, -halfW - 10, isNext ? 9 : 6, 0, Math.PI * 2);
        ctx.arc(0, halfW + 10, isNext ? 9 : 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawSkidMarksAndParticles(ctx, car) {
        // Huellas de neumáticos
        for (let i = 0; i < car.skidMarks.length; i++) {
            const s = car.skidMarks[i];
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x1, s.y1, 3.5, 0, Math.PI * 2);
            ctx.arc(s.x2, s.y2, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Partículas de tierra, grava o nieve
        for (let i = 0; i < car.particles.length; i++) {
            const p = car.particles[i];
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawCar(ctx, car) {
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle);

        // Haces de luz de los faros suplementarios de rally
        const beamGrad = ctx.createRadialGradient(30, 0, 5, 130, 0, 145);
        beamGrad.addColorStop(0, 'rgba(254, 249, 195, 0.22)');
        beamGrad.addColorStop(1, 'rgba(254, 249, 195, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(28, -14);
        ctx.lineTo(175, -62);
        ctx.lineTo(175, 62);
        ctx.lineTo(28, 14);
        ctx.closePath();
        ctx.fill();

        // Sombra proyectada del coche
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.roundRect(-34, -17, 70, 38, 9);
        ctx.fill();

        // Usar la textura generada del coche de rally (o el sprite procedural de alta nitidez)
        const carImg = this.assets.images.car_png || this.assets.canvases.carSprite;
        if (carImg) {
            ctx.drawImage(carImg, -36, -21, 72, 42);
        }

        // Luces de freno traseras rojas brillantes cuando frena
        if (car.isBraking || car.isHandbrake) {
            ctx.fillStyle = '#ff1e1e';
            ctx.shadowColor = '#ff1e1e';
            ctx.shadowBlur = 12;
            ctx.fillRect(-36, -15, 4, 7);
            ctx.fillRect(-36, 8, 4, 7);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    drawEnvironmentProps(ctx, props, camLeft, camTop, viewW, viewH) {
        const margin = 120;
        for (let i = 0; i < props.length; i++) {
            const p = props[i];
            if (
                p.x < camLeft - margin ||
                p.x > camLeft + viewW + margin ||
                p.y < camTop - margin ||
                p.y > camTop + viewH + margin
            ) {
                continue;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.scale(p.scale, p.scale);

            let sprite = null;
            if (p.type === 'pine') sprite = this.assets.canvases.pineTree;
            else if (p.type === 'snowPine') sprite = this.assets.canvases.snowPineTree;
            else if (p.type === 'bush') sprite = this.assets.canvases.desertBush;
            else if (p.type === 'rockGray') sprite = this.assets.canvases.rockGray;
            else if (p.type === 'rockRed') sprite = this.assets.canvases.rockRed;
            else if (p.type === 'tireBarrier') sprite = this.assets.canvases.tireBarrier;

            if (sprite) {
                ctx.drawImage(sprite, -sprite.width * 0.5, -sprite.height * 0.5);
            }
            ctx.restore();
        }
    }

    drawOffTrackVignette(ctx, w, h) {
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    renderMinimap(track, car, activeCheckpointIndex) {
        const mCtx = this.minimapCtx;
        const mw = this.minimapCanvas.width;
        const mh = this.minimapCanvas.height;

        mCtx.clearRect(0, 0, mw, mh);

        // Fondo oscuro semitransparente
        mCtx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        mCtx.fillRect(0, 0, mw, mh);

        const b = track.bounds;
        const worldW = b.maxX - b.minX;
        const worldH = b.maxY - b.minY;
        const pad = 16;
        const scale = Math.min((mw - pad * 2) / worldW, (mh - pad * 2) / worldH);

        const offsetX = (mw - worldW * scale) * 0.5 - b.minX * scale;
        const offsetY = (mh - worldH * scale) * 0.5 - b.minY * scale;

        const toMiniX = (wx) => wx * scale + offsetX;
        const toMiniY = (wy) => wy * scale + offsetY;

        // Trazado del mapa en el minimapa
        mCtx.beginPath();
        track.points.forEach((pt, idx) => {
            const mx = toMiniX(pt.x);
            const my = toMiniY(pt.y);
            if (idx === 0) mCtx.moveTo(mx, my);
            else mCtx.lineTo(mx, my);
        });
        if (track.isClosed) mCtx.closePath();

        mCtx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        mCtx.lineWidth = 7;
        mCtx.lineCap = 'round';
        mCtx.lineJoin = 'round';
        mCtx.stroke();

        mCtx.strokeStyle = '#e2e8f0';
        mCtx.lineWidth = 3.5;
        mCtx.stroke();

        // Checkpoints y Meta en el minimapa
        track.checkpoints.forEach((cp, idx) => {
            const cx = toMiniX(cp.x);
            const cy = toMiniY(cp.y);
            mCtx.beginPath();
            mCtx.arc(cx, cy, cp.isFinish ? 5 : 3.5, 0, Math.PI * 2);
            if (cp.isFinish) {
                mCtx.fillStyle = '#ef4444';
            } else if (idx === activeCheckpointIndex) {
                mCtx.fillStyle = '#facc15';
            } else if (idx < activeCheckpointIndex) {
                mCtx.fillStyle = '#22c55e';
            } else {
                mCtx.fillStyle = '#64748b';
            }
            mCtx.fill();
        });

        // Punto de Salida en modo Tramo
        if (!track.isClosed) {
            const sx = toMiniX(track.startPose.x);
            const sy = toMiniY(track.startPose.y);
            mCtx.fillStyle = '#22c55e';
            mCtx.beginPath();
            mCtx.arc(sx, sy, 4.5, 0, Math.PI * 2);
            mCtx.fill();
        }

        // Indicador del coche del jugador con flecha de dirección
        const carMx = toMiniX(car.x);
        const carMy = toMiniY(car.y);

        mCtx.save();
        mCtx.translate(carMx, carMy);
        mCtx.rotate(car.angle);

        mCtx.fillStyle = car.isOnTrack ? '#38bdf8' : '#f97316';
        mCtx.strokeStyle = '#ffffff';
        mCtx.lineWidth = 1.5;
        mCtx.beginPath();
        mCtx.moveTo(7, 0);
        mCtx.lineTo(-5, -5);
        mCtx.lineTo(-3, 0);
        mCtx.lineTo(-5, 5);
        mCtx.closePath();
        mCtx.fill();
        mCtx.stroke();
        mCtx.restore();
    }
}
