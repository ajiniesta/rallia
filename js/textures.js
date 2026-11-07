// js/textures.js
// Generación de texturas procedurales tileables y sprites de alta calidad + carga de imágenes generadas

export class AssetManager {
    constructor() {
        this.patterns = {};
        this.canvases = {};
        this.images = {};
        this.ready = false;
    }

    async init(mainCtx) {
        // 1. Generar texturas tileables para cada etapa (pista, arcén, exterior)
        this.createTerrainTextures(mainCtx);

        // 2. Generar sprites procedurales de respaldo y de alta nitidez (coche, árboles, rocas, etc.)
        this.createProceduralSprites();

        // 3. Intentar cargar también los sprites PNG de assets/ (y eliminar su fondo blanco automáticamente)
        await Promise.all([
            this.loadExternalImage('car_png', 'assets/car_rally.png', true),
            this.loadExternalImage('props_png', 'assets/props_sheet.png', true)
        ]);

        this.ready = true;
    }

    loadExternalImage(key, src, removeWhiteBg = true) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (removeWhiteBg) {
                    try {
                        const c = document.createElement('canvas');
                        c.width = img.width;
                        c.height = img.height;
                        const ctx = c.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const imgData = ctx.getImageData(0, 0, c.width, c.height);
                        const d = imgData.data;
                        for (let i = 0; i < d.length; i += 4) {
                            const r = d[i], g = d[i + 1], b = d[i + 2];
                            // Quitar fondo blanco o casi blanco de las esquinas/exterior
                            if (r > 240 && g > 240 && b > 240) {
                                d[i + 3] = 0;
                            } else if (r > 225 && g > 225 && b > 225) {
                                d[i + 3] = Math.round(((245 - Math.max(r, g, b)) / 20) * 255);
                            }
                        }
                        ctx.putImageData(imgData, 0, 0);
                        this.images[key] = c;
                    } catch (e) {
                        this.images[key] = img;
                    }
                } else {
                    this.images[key] = img;
                }
                resolve(true);
            };
            img.onerror = () => {
                resolve(false);
            };
            img.src = src;
        });
    }

    createNoiseCanvas(size, baseColor, speckles) {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, size, size);

        // Semilla pseudoaleatoria determinista para textura uniforme
        let seed = 1337;
        const rand = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        for (const sp of speckles) {
            ctx.fillStyle = sp.color;
            for (let i = 0; i < sp.count; i++) {
                const x = rand() * size;
                const y = rand() * size;
                const w = sp.minSize + rand() * (sp.maxSize - sp.minSize);
                const h = sp.round ? w : (sp.minSize + rand() * (sp.maxSize - sp.minSize));

                // Dibujar con wrap-around para que sea 100% tileable
                for (let ox = -size; ox <= size; ox += size) {
                    for (let oy = -size; oy <= size; oy += size) {
                        if (x + ox + w < 0 || x + ox - w > size || y + oy + h < 0 || y + oy - h > size) continue;
                        if (sp.round) {
                            ctx.beginPath();
                            ctx.arc(x + ox, y + oy, w * 0.5, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            ctx.fillRect(x + ox, y + oy, w, h);
                        }
                    }
                }
            }
        }
        return c;
    }

    createTerrainTextures(mainCtx) {
        // --- ETAPA 1: BOSQUE DE FINLANDIA (Hierba nórdica + Tierra/Grava) ---
        const grassCanvas = this.createNoiseCanvas(256, '#2d5a27', [
            { color: '#254c20', count: 550, minSize: 3, maxSize: 12, round: true },
            { color: '#376b30', count: 500, minSize: 2, maxSize: 9, round: true },
            { color: '#427c3a', count: 220, minSize: 2, maxSize: 5, round: false },
            { color: '#1e3f1a', count: 180, minSize: 4, maxSize: 10, round: true }
        ]);

        const dirtRoadCanvas = this.createNoiseCanvas(256, '#9c6b3b', [
            { color: '#87582c', count: 700, minSize: 2, maxSize: 10, round: true },
            { color: '#b07d4b', count: 550, minSize: 2, maxSize: 8, round: true },
            { color: '#6e4520', count: 280, minSize: 2, maxSize: 5, round: true },
            { color: '#c49363', count: 200, minSize: 1, maxSize: 4, round: true }
        ]);

        // --- ETAPA 2: DESFILADERO ALPINO (Nieve/Roca + Asfalto helado) ---
        const snowCanvas = this.createNoiseCanvas(256, '#dce7ef', [
            { color: '#c9d8e4', count: 450, minSize: 4, maxSize: 16, round: true },
            { color: '#eef5fa', count: 450, minSize: 3, maxSize: 12, round: true },
            { color: '#b2c5d4', count: 180, minSize: 2, maxSize: 7, round: true }
        ]);

        const tarmacCanvas = this.createNoiseCanvas(256, '#394149', [
            { color: '#2e353b', count: 800, minSize: 2, maxSize: 7, round: true },
            { color: '#47515a', count: 600, minSize: 1, maxSize: 5, round: true },
            { color: '#5c6975', count: 180, minSize: 1, maxSize: 3, round: true }
        ]);

        // --- ETAPA 3: CAÑÓN DEL DESIERTO (Arena rojiza + Barro/Arcilla compacta) ---
        const desertCanvas = this.createNoiseCanvas(256, '#c8874b', [
            { color: '#b5743a', count: 550, minSize: 4, maxSize: 14, round: true },
            { color: '#d99a5e', count: 450, minSize: 3, maxSize: 10, round: true },
            { color: '#9c5c27', count: 240, minSize: 2, maxSize: 6, round: true }
        ]);

        const canyonRoadCanvas = this.createNoiseCanvas(256, '#7a4928', [
            { color: '#683b1e', count: 650, minSize: 3, maxSize: 9, round: true },
            { color: '#8f5934', count: 500, minSize: 2, maxSize: 7, round: true },
            { color: '#522c13', count: 250, minSize: 2, maxSize: 5, round: true }
        ]);

        // Textura de cuadros de salida/meta
        const checkerCanvas = document.createElement('canvas');
        checkerCanvas.width = 64;
        checkerCanvas.height = 64;
        const cCtx = checkerCanvas.getContext('2d');
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                cCtx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#18181b';
                cCtx.fillRect(x * 16, y * 16, 16, 16);
            }
        }

        this.canvases = {
            grass: grassCanvas,
            dirtRoad: dirtRoadCanvas,
            snow: snowCanvas,
            tarmac: tarmacCanvas,
            desert: desertCanvas,
            canyonRoad: canyonRoadCanvas,
            checker: checkerCanvas
        };

        if (mainCtx) {
            for (const [k, c] of Object.entries(this.canvases)) {
                this.patterns[k] = mainCtx.createPattern(c, 'repeat');
            }
        }
    }

    createProceduralSprites() {
        // 1. Sprite de coche de Rally de alta resolución (mirando hacia la DERECHA: ángulo 0)
        const carC = document.createElement('canvas');
        carC.width = 128;
        carC.height = 76;
        const ctx = carC.getContext('2d');

        ctx.save();
        ctx.translate(64, 38);

        // Sombra suave bajo el chasis
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        this.roundRect(ctx, -46, -24, 92, 50, 12);
        ctx.fill();

        // Ruedas (4 neumáticos sobresaliendo ligeramente de los pasos de rueda)
        ctx.fillStyle = '#141416';
        this.roundRect(ctx, -35, -26, 20, 8, 3); ctx.fill(); // Trasera izq
        this.roundRect(ctx, -35, 18, 20, 8, 3);  ctx.fill(); // Trasera der
        this.roundRect(ctx, 16, -26, 20, 8, 3);  ctx.fill(); // Delantera izq
        this.roundRect(ctx, 16, 18, 20, 8, 3);   ctx.fill(); // Delantera der

        // Carrocería principal (Blanco competición WRC)
        const bodyGrad = ctx.createLinearGradient(-44, -22, 44, 22);
        bodyGrad.addColorStop(0, '#f1f5f9');
        bodyGrad.addColorStop(0.5, '#ffffff');
        bodyGrad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = bodyGrad;
        this.roundRect(ctx, -44, -22, 88, 44, 11);
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        // Decoración / Livery Rally (Bandas rojas y azul marino tipo WRC)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-40, -21);
        ctx.lineTo(15, -21);
        ctx.lineTo(36, -9);
        ctx.lineTo(-40, -12);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-40, 21);
        ctx.lineTo(15, 21);
        ctx.lineTo(36, 9);
        ctx.lineTo(-40, 12);
        ctx.closePath();
        ctx.fill();

        // Franja central deportiva azul
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-40, -5, 82, 10);

        // Capó delantero con rejillas de ventilación
        ctx.fillStyle = '#1e293b';
        this.roundRect(ctx, 20, -11, 8, 6, 2); ctx.fill();
        this.roundRect(ctx, 20, 5, 8, 6, 2);  ctx.fill();

        // Parabrisas delantero y luneta trasera
        const glassGrad = ctx.createLinearGradient(-15, -16, 18, 16);
        glassGrad.addColorStop(0, '#0f172a');
        glassGrad.addColorStop(0.5, '#1e3a5f');
        glassGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = glassGrad;

        // Parabrisas delantero (derecha)
        ctx.beginPath();
        ctx.moveTo(4, -15);
        ctx.lineTo(18, -12);
        ctx.lineTo(18, 12);
        ctx.lineTo(4, 15);
        ctx.closePath();
        ctx.fill();

        // Luneta trasera
        ctx.beginPath();
        ctx.moveTo(-28, -13);
        ctx.lineTo(-17, -15);
        ctx.lineTo(-17, 15);
        ctx.lineTo(-28, 13);
        ctx.closePath();
        ctx.fill();

        // Techo con dorsal y toma de aire (roof scoop)
        ctx.fillStyle = '#ffffff';
        this.roundRect(ctx, -17, -14, 22, 28, 4);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Dorsal "1" en el techo
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-12, -9, 12, 18);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('1', -6, 0);

        // Toma de aire en el techo
        ctx.fillStyle = '#ef4444';
        this.roundRect(ctx, -1, -4, 6, 8, 2);
        ctx.fill();

        // Alerón trasero WRC (izquierda)
        ctx.fillStyle = '#0f172a';
        this.roundRect(ctx, -45, -21, 9, 42, 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-44, -19, 6, 38);

        // Batería de 4 faros suplementarios de rally en el morro (derecha)
        ctx.fillStyle = '#fef08a';
        for (const yOff of [-12, -5, 5, 12]) {
            ctx.beginPath();
            ctx.arc(43, yOff, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
        this.canvases.carSprite = carC;

        // 2. Árboles y adornos exteriores pre-renderizados
        this.canvases.pineTree = this.createPineTreeSprite('#1e4620', '#2d6a30', '#3b853f', false);
        this.canvases.snowPineTree = this.createPineTreeSprite('#1f3b34', '#2e554c', '#e2eff7', true);
        this.canvases.desertBush = this.createBushSprite();
        this.canvases.rockGray = this.createRockSprite('#64748b', '#94a3b8', '#334155');
        this.canvases.rockRed = this.createRockSprite('#9a4826', '#c2643b', '#5e2912');
        this.canvases.tireBarrier = this.createTireBarrierSprite();
    }

    createPineTreeSprite(darkColor, midColor, topColor, hasSnow) {
        const c = document.createElement('canvas');
        c.width = 120;
        c.height = 120;
        const ctx = c.getContext('2d');
        const cx = 60, cy = 60;

        // Sombra proyectada
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.beginPath();
        ctx.arc(cx + 8, cy + 8, 42, 0, Math.PI * 2);
        ctx.fill();

        const drawStarLayer = (radius, points, color, rotOffset) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const r = i % 2 === 0 ? radius : radius * 0.62;
                const a = (i * Math.PI) / points + rotOffset;
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        };

        drawStarLayer(46, 11, darkColor, 0);
        drawStarLayer(35, 10, midColor, 0.3);
        drawStarLayer(23, 9, topColor, 0.6);

        if (hasSnow) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        return c;
    }

    createBushSprite() {
        const c = document.createElement('canvas');
        c.width = 96;
        c.height = 96;
        const ctx = c.getContext('2d');
        const cx = 48, cy = 48;

        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.arc(cx + 5, cy + 5, 28, 0, Math.PI * 2);
        ctx.fill();

        const blobs = [
            { x: -10, y: -6, r: 18, c: '#4d6b2c' },
            { x: 10, y: -4, r: 17, c: '#5c7e36' },
            { x: -4, y: 10, r: 17, c: '#3f5922' },
            { x: 8, y: 9, r: 15, c: '#6e9442' },
            { x: 0, y: 0, r: 16, c: '#7ca34d' }
        ];
        for (const b of blobs) {
            ctx.fillStyle = b.c;
            ctx.beginPath();
            ctx.arc(cx + b.x, cy + b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }
        return c;
    }

    createRockSprite(baseCol, highCol, shadowCol) {
        const c = document.createElement('canvas');
        c.width = 96;
        c.height = 96;
        const ctx = c.getContext('2d');
        const cx = 48, cy = 48;

        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.beginPath();
        ctx.arc(cx + 6, cy + 6, 30, 0, Math.PI * 2);
        ctx.fill();

        const pts = [
            [-28, -10], [-14, -29], [12, -27], [29, -12],
            [26, 15], [9, 28], [-16, 25], [-30, 10]
        ];
        ctx.fillStyle = baseCol;
        ctx.beginPath();
        pts.forEach(([px, py], i) => {
            if (i === 0) ctx.moveTo(cx + px, cy + py);
            else ctx.lineTo(cx + px, cy + py);
        });
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = shadowCol;
        ctx.stroke();

        // Faceta superior iluminada
        ctx.fillStyle = highCol;
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 12);
        ctx.lineTo(cx - 5, cy - 22);
        ctx.lineTo(cx + 15, cy - 16);
        ctx.lineTo(cx + 8, cy + 4);
        ctx.lineTo(cx - 10, cy + 6);
        ctx.closePath();
        ctx.fill();

        return c;
    }

    createTireBarrierSprite() {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d');
        const cx = 32, cy = 32;

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(cx + 3, cy + 3, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 19, 0, Math.PI * 2);
        ctx.fill();

        // Sectores blancos tipo barrera de rally
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, 19, i * Math.PI * 0.5, i * Math.PI * 0.5 + 0.4);
            ctx.closePath();
            ctx.fill();
        }

        // Hueco interior del neumático
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();

        return c;
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
