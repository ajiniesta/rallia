// js/tracks.js
// Definición de las 3 etapas de Rally (tanto en modo Tramo Punto A -> B como en modo Circuito de 3 vueltas)
// Geometría Catmull-Rom, detección de salida de pista, checkpoints y generación de adornos exteriores.

export const STAGE_CONFIGS = [
    {
        id: 'stage1',
        number: 1,
        name: 'Bosque de Finlandia',
        subtitle: 'Tierra rápida, gravilla y pinos nórdicos',
        surfaceLabel: 'Tierra / Grava',
        terrainPattern: 'grass',
        roadPattern: 'dirtRoad',
        shoulderColor: '#784e27',
        borderLineColor: 'rgba(255, 255, 255, 0.35)',
        kerbColorA: '#ef4444',
        kerbColorB: '#f8fafc',
        dustColor: 'rgba(184, 134, 85, 0.55)',
        offTrackDustColor: 'rgba(65, 110, 48, 0.55)',
        trackWidth: 185,
        grip: 0.94,
        propTypes: ['pine', 'pine', 'pine', 'rockGray', 'bush'],
        // Puntos de control para Tramo Punto A -> Punto B (Recorrido largo abierto)
        pointToPointWaypoints: [
            { x: -1900, y: 1500 },
            { x: -1350, y: 1450 },
            { x: -750,  y: 1100 },
            { x: -950,  y: 450  },
            { x: -350,  y: 50   },
            { x: 350,   y: 380  },
            { x: 950,   y: -120 },
            { x: 550,   y: -780 },
            { x: -200,  y: -950 },
            { x: -50,   y: -1550 },
            { x: 750,   y: -1650 },
            { x: 1450,  y: -1150 },
            { x: 1850,  y: -1550 },
            { x: 2350,  y: -1450 }
        ],
        // Puntos de control para Circuito Cerrado
        circuitWaypoints: [
            { x: -1100, y: 1050 },
            { x: -200,  y: 1180 },
            { x: 850,   y: 950  },
            { x: 1350,  y: 250  },
            { x: 950,   y: -450 },
            { x: 1300,  y: -1100 },
            { x: 450,   y: -1350 },
            { x: -350,  y: -800 },
            { x: -1050, y: -1150 },
            { x: -1500, y: -400 },
            { x: -1000, y: 250  },
            { x: -1450, y: 700  }
        ]
    },
    {
        id: 'stage2',
        number: 2,
        name: 'Desfiladero Alpino',
        subtitle: 'Horquillas técnicas de montaña sobre asfalto frío y nieve',
        surfaceLabel: 'Asfalto / Nieve',
        terrainPattern: 'snow',
        roadPattern: 'tarmac',
        shoulderColor: '#94a3b8',
        borderLineColor: 'rgba(250, 204, 21, 0.65)',
        kerbColorA: '#0284c7',
        kerbColorB: '#ffffff',
        dustColor: 'rgba(203, 213, 225, 0.5)',
        offTrackDustColor: 'rgba(241, 245, 249, 0.75)',
        trackWidth: 170,
        grip: 0.90,
        propTypes: ['snowPine', 'snowPine', 'rockGray', 'rockGray'],
        pointToPointWaypoints: [
            { x: -2100, y: -1550 },
            { x: -1400, y: -1500 },
            { x: -750,  y: -1050 },
            { x: -1450, y: -450  },
            { x: -650,  y: 150   },
            { x: 250,   y: -350  },
            { x: 850,   y: 200   },
            { x: -150,  y: 800   },
            { x: 350,   y: 1450  },
            { x: 1250,  y: 1150  },
            { x: 1550,  y: 350   },
            { x: 2150,  y: 750   },
            { x: 2450,  y: 1550  }
        ],
        circuitWaypoints: [
            { x: -1200, y: -950 },
            { x: -150,  y: -1250 },
            { x: 950,   y: -950  },
            { x: 1350,  y: -200  },
            { x: 450,   y: 150   },
            { x: 1250,  y: 750   },
            { x: 750,   y: 1350  },
            { x: -350,  y: 1100  },
            { x: -650,  y: 350   },
            { x: -1400, y: 650   },
            { x: -1550, y: -250  }
        ]
    },
    {
        id: 'stage3',
        number: 3,
        name: 'Cañón del Desierto',
        subtitle: 'Tramo sinuoso entre rocas rojizas, arena y arcilla',
        surfaceLabel: 'Arcilla / Arena',
        terrainPattern: 'desert',
        roadPattern: 'canyonRoad',
        shoulderColor: '#9a5528',
        borderLineColor: 'rgba(254, 215, 170, 0.4)',
        kerbColorA: '#ea580c',
        kerbColorB: '#fef3c7',
        dustColor: 'rgba(217, 119, 6, 0.55)',
        offTrackDustColor: 'rgba(202, 138, 4, 0.65)',
        trackWidth: 180,
        grip: 0.92,
        propTypes: ['rockRed', 'rockRed', 'bush', 'bush', 'rockGray'],
        pointToPointWaypoints: [
            { x: -2200, y: 100   },
            { x: -1550, y: 200   },
            { x: -1100, y: 950   },
            { x: -350,  y: 1350  },
            { x: 250,   y: 650   },
            { x: -300,  y: -150  },
            { x: 200,   y: -950  },
            { x: 950,   y: -1250 },
            { x: 1450,  y: -450  },
            { x: 950,   y: 350   },
            { x: 1550,  y: 1150  },
            { x: 2250,  y: 850   },
            { x: 2650,  y: 150   }
        ],
        circuitWaypoints: [
            { x: -1350, y: 0     },
            { x: -950,  y: 950   },
            { x: 100,   y: 1250  },
            { x: 950,   y: 850   },
            { x: 550,   y: 100   },
            { x: 1350,  y: -350  },
            { x: 1050,  y: -1150 },
            { x: 50,    y: -1250 },
            { x: -450,  y: -550  },
            { x: -1200, y: -900  }
        ]
    }
];

export class Track {
    /**
     * @param {Object} config Configuración de la etapa de STAGE_CONFIGS
     * @param {'point_to_point' | 'circuit'} mode Modo de carrera
     */
    constructor(config, mode = 'point_to_point') {
        this.config = config;
        this.mode = mode; // 'point_to_point' | 'circuit'
        this.isClosed = mode === 'circuit';
        this.totalLaps = this.isClosed ? 3 : 1;
        this.trackWidth = config.trackWidth;
        this.halfWidth = config.trackWidth * 0.5;

        const rawPoints = this.isClosed
            ? config.circuitWaypoints
            : config.pointToPointWaypoints;

        // Generar polilínea suave mediante spline Catmull-Rom
        this.points = this.generateSpline(rawPoints, this.isClosed, 22);

        // Calcular tangentes, normales y distancias acumuladas
        this.computeTrackMetrics();

        // Generar checkpoints intermedios y líneas de Salida / Meta
        this.checkpoints = this.generateCheckpoints();

        // Generar árboles, rocas y barreras exteriores
        this.props = this.generateEnvironmentProps();
    }

    generateSpline(waypoints, closed, subdivisions = 20) {
        const result = [];
        const n = waypoints.length;

        const getPt = (idx) => {
            if (closed) {
                return waypoints[(idx + n) % n];
            }
            return waypoints[Math.max(0, Math.min(n - 1, idx))];
        };

        const totalSegments = closed ? n : n - 1;
        for (let i = 0; i < totalSegments; i++) {
            const p0 = getPt(i - 1);
            const p1 = getPt(i);
            const p2 = getPt(i + 1);
            const p3 = getPt(i + 2);

            for (let s = 0; s < subdivisions; s++) {
                const t = s / subdivisions;
                const t2 = t * t;
                const t3 = t2 * t;

                const x = 0.5 * (
                    (2 * p1.x) +
                    (-p0.x + p2.x) * t +
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
                );
                const y = 0.5 * (
                    (2 * p1.y) +
                    (-p0.y + p2.y) * t +
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
                );
                result.push({ x, y });
            }
        }

        if (!closed) {
            const last = waypoints[n - 1];
            result.push({ x: last.x, y: last.y });
        }

        return result;
    }

    computeTrackMetrics() {
        this.cumulativeLengths = [0];
        this.normals = [];
        this.angles = [];

        let totalLen = 0;
        const n = this.points.length;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        for (let i = 0; i < n; i++) {
            const curr = this.points[i];
            const next = this.isClosed
                ? this.points[(i + 1) % n]
                : this.points[Math.min(n - 1, i + 1)];
            const prev = this.isClosed
                ? this.points[(i - 1 + n) % n]
                : this.points[Math.max(0, i - 1)];

            if (i > 0) {
                const segLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
                totalLen += segLen;
                this.cumulativeLengths.push(totalLen);
            }

            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.hypot(dx, dy) || 1;
            const angle = Math.atan2(dy, dx);
            this.angles.push(angle);
            this.normals.push({ x: -dy / len, y: dx / len });

            if (curr.x < minX) minX = curr.x;
            if (curr.x > maxX) maxX = curr.x;
            if (curr.y < minY) minY = curr.y;
            if (curr.y > maxY) maxY = curr.y;
        }

        this.totalLength = totalLen;
        this.bounds = {
            minX: minX - 650,
            maxX: maxX + 650,
            minY: minY - 650,
            maxY: maxY + 650
        };
    }

    generateCheckpoints() {
        const checkpoints = [];
        const n = this.points.length;

        if (!this.isClosed) {
            // Modo Tramo Punto A -> Punto B:
            // Salida cerca del índice 6, 5 checkpoints intermedios y Meta cerca del final (n - 6)
            const startIndex = 6;
            const finishIndex = n - 7;
            const numSectors = 5;

            this.startPose = {
                x: this.points[startIndex].x,
                y: this.points[startIndex].y,
                angle: this.angles[startIndex],
                index: startIndex
            };

            for (let s = 1; s <= numSectors; s++) {
                const ratio = s / numSectors;
                const idx = Math.floor(startIndex + ratio * (finishIndex - startIndex));
                const pt = this.points[idx];
                const norm = this.normals[idx];
                const isFinish = s === numSectors;

                checkpoints.push({
                    id: s - 1,
                    index: idx,
                    x: pt.x,
                    y: pt.y,
                    nx: norm.x,
                    ny: norm.y,
                    angle: this.angles[idx],
                    width: this.trackWidth * 1.25,
                    isFinish,
                    label: isFinish ? 'META' : `CP ${s}`
                });
            }
        } else {
            // Modo Circuito Cerrado (3 vueltas)
            const startIndex = 0;
            this.startPose = {
                x: this.points[startIndex].x,
                y: this.points[startIndex].y,
                angle: this.angles[startIndex],
                index: startIndex
            };

            const numCheckpoints = 4;
            for (let s = 1; s <= numCheckpoints; s++) {
                const idx = Math.floor((s / numCheckpoints) * n) % n;
                const pt = this.points[idx];
                const norm = this.normals[idx];
                const isStartFinish = idx === 0;

                checkpoints.push({
                    id: s - 1,
                    index: idx,
                    x: pt.x,
                    y: pt.y,
                    nx: norm.x,
                    ny: norm.y,
                    angle: this.angles[idx],
                    width: this.trackWidth * 1.25,
                    isFinish: isStartFinish,
                    label: isStartFinish ? 'META' : `CP ${s}`
                });
            }
        }

        return checkpoints;
    }

    /**
     * Calcula la distancia mínima del punto (x, y) al centro de la pista.
     * Devuelve { distance, isOnTrack, closestPoint, closestIndex, tangentAngle, progressRatio }
     */
    getTrackSurfaceInfo(x, y) {
        let minDistSq = Infinity;
        let closestX = this.points[0].x;
        let closestY = this.points[0].y;
        let closestIndex = 0;

        const n = this.points.length;
        const segCount = this.isClosed ? n : n - 1;

        for (let i = 0; i < segCount; i++) {
            const a = this.points[i];
            const b = this.points[(i + 1) % n];

            const abx = b.x - a.x;
            const aby = b.y - a.y;
            const apx = x - a.x;
            const apy = y - a.y;

            const abLenSq = abx * abx + aby * aby;
            let t = abLenSq > 0 ? (apx * abx + apy * aby) / abLenSq : 0;
            t = Math.max(0, Math.min(1, t));

            const projX = a.x + t * abx;
            const projY = a.y + t * aby;
            const dx = x - projX;
            const dy = y - projY;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestX = projX;
                closestY = projY;
                closestIndex = i;
            }
        }

        const distance = Math.sqrt(minDistSq);
        // El coche está en pista si su centro está dentro del semiancho de la calzada
        const isOnTrack = distance <= this.halfWidth;
        const progressRatio = Math.min(1, Math.max(0, this.cumulativeLengths[closestIndex] / (this.totalLength || 1)));

        return {
            distance,
            isOnTrack,
            closestPoint: { x: closestX, y: closestY },
            closestIndex,
            tangentAngle: this.angles[closestIndex],
            progressRatio
        };
    }

    generateEnvironmentProps() {
        const props = [];
        let seed = this.config.number * 98765 + (this.isClosed ? 555 : 111);
        const rand = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        // 1. Barreras de neumáticos en curvas pronunciadas
        const n = this.points.length;
        for (let i = 10; i < n - 10; i += 8) {
            const a1 = this.angles[i - 4];
            const a2 = this.angles[i + 4];
            let diff = a2 - a1;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            if (Math.abs(diff) > 0.36) {
                const sign = diff > 0 ? -1 : 1; // Exterior de la curva
                const pt = this.points[i];
                const norm = this.normals[i];
                const dist = this.halfWidth + 36;
                const tx = pt.x + norm.x * dist * sign;
                const ty = pt.y + norm.y * dist * sign;

                const info = this.getTrackSurfaceInfo(tx, ty);
                if (info.distance > this.halfWidth + 24) {
                    props.push({
                        type: 'tireBarrier',
                        x: tx,
                        y: ty,
                        radius: 17,
                        scale: 0.9,
                        rotation: rand() * Math.PI * 2,
                        collidable: true
                    });
                }
            }
        }

        // 2. Árboles y rocas junto a los márgenes del tramo y en el bosque/entorno exterior
        const { minX, maxX, minY, maxY } = this.bounds;
        const propTypes = this.config.propTypes;
        const targetCount = 340;

        for (let i = 0; i < targetCount; i++) {
            let px, py;
            if (i < 190) {
                // Cerca de los márgenes de la pista para dar sensación de velocidad de rally
                const idx = Math.floor(rand() * this.points.length);
                const pt = this.points[idx];
                const norm = this.normals[idx];
                const side = rand() < 0.5 ? -1 : 1;
                const offset = this.halfWidth + 85 + rand() * 380;
                px = pt.x + norm.x * offset * side + (rand() - 0.5) * 80;
                py = pt.y + norm.y * offset * side + (rand() - 0.5) * 80;
            } else {
                // Distribuidos en el mapa general
                px = minX + rand() * (maxX - minX);
                py = minY + rand() * (maxY - minY);
            }

            const info = this.getTrackSurfaceInfo(px, py);
            // Dejar margen libre alrededor de la pista para que el jugador pueda salirse sin chocar inmediatamente
            const minSafeDist = this.halfWidth + 68;
            if (info.distance < minSafeDist) continue;

            // Evitar solapamiento excesivo con otros árboles
            let tooClose = false;
            for (let j = 0; j < props.length; j++) {
                const other = props[j];
                if (Math.hypot(px - other.x, py - other.y) < 58) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            const type = propTypes[Math.floor(rand() * propTypes.length)];
            const scale = 0.8 + rand() * 0.45;
            const baseRadius = type === 'bush' ? 18 : 26;

            props.push({
                type,
                x: px,
                y: py,
                radius: baseRadius * scale,
                scale,
                rotation: rand() * Math.PI * 2,
                collidable: type !== 'bush'
            });
        }

        return props;
    }
}
