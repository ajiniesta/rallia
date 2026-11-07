// js/storage.js
// Gestión de récords de tiempo por etapa y modo en localStorage

const STORAGE_KEY = 'rally_topdown_records_v1';

export class StorageManager {
    constructor() {
        this.records = this.loadAll();
    }

    loadAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return this.getDefaultRecords();
            const parsed = JSON.parse(raw);
            return { ...this.getDefaultRecords(), ...parsed };
        } catch (err) {
            console.warn('No se pudo leer localStorage:', err);
            return this.getDefaultRecords();
        }
    }

    getDefaultRecords() {
        return {
            stage1_point_to_point: null,
            stage1_circuit: null,
            stage2_point_to_point: null,
            stage2_circuit: null,
            stage3_point_to_point: null,
            stage3_circuit: null,
            history: []
        };
    }

    getKey(stageId, mode) {
        return `${stageId}_${mode}`;
    }

    getBestTime(stageId, mode) {
        const key = this.getKey(stageId, mode);
        return this.records[key] ?? null;
    }

    /**
     * Guarda un nuevo tiempo y devuelve { isNewRecord, previousBest, bestTime }
     */
    saveTime(stageId, mode, timeMs) {
        const key = this.getKey(stageId, mode);
        const previousBest = this.records[key];
        let isNewRecord = false;

        if (previousBest === null || previousBest === undefined || timeMs < previousBest) {
            this.records[key] = timeMs;
            isNewRecord = true;
        }

        // Guardar también en historial reciente (máximo 20 entradas)
        if (!Array.isArray(this.records.history)) {
            this.records.history = [];
        }
        this.records.history.unshift({
            stageId,
            mode,
            timeMs,
            date: new Date().toISOString(),
            isNewRecord
        });
        if (this.records.history.length > 20) {
            this.records.history.length = 20;
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
        } catch (err) {
            console.warn('No se pudo guardar en localStorage:', err);
        }

        return {
            isNewRecord,
            previousBest,
            bestTime: this.records[key]
        };
    }

    clearAll() {
        this.records = this.getDefaultRecords();
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            console.warn('Error limpiando localStorage:', err);
        }
    }

    static formatTime(ms) {
        if (ms === null || ms === undefined || !isFinite(ms)) {
            return '--:--.---';
        }
        const totalMs = Math.max(0, Math.round(ms));
        const minutes = Math.floor(totalMs / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const millis = totalMs % 1000;
        const mStr = String(minutes).padStart(2, '0');
        const sStr = String(seconds).padStart(2, '0');
        const msStr = String(millis).padStart(3, '0');
        return `${mStr}:${sStr}.${msStr}`;
    }
}
