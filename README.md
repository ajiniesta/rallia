# 🏁 WRC Top-Down Rally Championship

Juego de carreras arcade de rally con visión cenital (*top-down*) diseñado para jugarse directamente en cualquier navegador web moderno, desarrollado con tecnologías web estándar (**HTML5 Canvas**, **JavaScript ES6+**, **CSS3** y **Web Audio API**) sin dependencias pesadas ni frameworks externos.

---

## 🚀 Cómo Levantar el Proyecto

Dado que el juego utiliza módulos estándar de JavaScript (`type="module"`), se recomienda ejecutarlo a través de un servidor HTTP local para evitar restricciones de seguridad del navegador (*CORS* con el protocolo `file://`).

### Opción 1: Con Python (Recomendada)
Si tienes Python instalado, ejecuta en la terminal desde la carpeta del proyecto:

```bash
# Python 3
python3 -m http.server 8080
```
Luego abre en tu navegador web:
👉 **[http://localhost:8080](http://localhost:8080)**

---

### Opción 2: Con Node.js
Si dispones de Node.js instalado, puedes usar `npx` con cualquier servidor estático rápido:

```bash
npx serve .
# o también:
npx http-server -p 8080
```
Luego abre la dirección indicada en la terminal (ejemplo: **http://localhost:8080**).

---

### Opción 3: Con la extensión Live Server (VS Code)
Si usas Visual Studio Code:
1. Haz clic derecho sobre el archivo `index.html`.
2. Selecciona **"Open with Live Server"**.

---

## 🎮 Controles del Juego

| Tecla | Acción |
| :--- | :--- |
| **`W`** o **`↑` (Flecha Arriba)** | Acelerar |
| **`S`** o **`↓` (Flecha Abajo)** | Frenar / Marcha atrás |
| **`A`** o **`←` (Flecha Izquierda)** | Girar a la izquierda |
| **`D`** o **`→` (Flecha Derecha)** | Girar a la derecha |
| **`ESPACIO`** | **Freno de mano** (permite derrapar en curvas y horquillas) |
| **`R`** | **Reposicionar el coche en pista** (si te atascas entre árboles o rocas) |
| **`ESC`** | Volver al menú principal de selección de etapas |

---

## 🏆 Mecánicas y Características

### 1. Etapas Disponibles
El juego incluye **3 etapas temáticas** con geometrías y superficies distintas:
- **Etapa 1: Bosque de Finlandia** 🌲 (Tierra y grava rápida, rodeada de densos pinos nórdicos).
- **Etapa 2: Desfiladero Alpino** ❄️ (Asfalto frío y nieve, horquillas técnicas y rocas de montaña).
- **Etapa 3: Cañón del Desierto** 🏜️ (Arcilla compacta, arena rojiza y curvas de radio variable).

### 2. Formatos de Carrera Seleccionables
Desde el menú principal puedes elegir entre dos modos de competición para cada etapa:
- **🚩 Tramo Rally (Punto A → Punto B)**: Recorrido abierto de rally clásico desde la línea de salida hasta la meta final, con arcos de control horario (*checkpoints*).
- **🔄 Circuito Cerrado (3 Vueltas)**: Trazado en bucle continuo donde deberás completar 3 vueltas cronometradas.

### 3. Regla de Fuera de Pista (Penalización del 60%)
- **Dentro de la pista**: Dispones del **100%** de la potencia y velocidad máxima del vehículo (hasta 200 km/h en el velocímetro).
- **Fuera de la pista**: Si te sales del asfalto o del camino hacia la hierba, nieve o arena, el vehículo desacelerará automáticamente y su velocidad quedará limitada a un **máximo estricto del 60%** de la velocidad punta (~120 km/h). El HUD y la pantalla mostrarán una alerta visual mientras estés fuera del trazado.

### 4. Cronometraje y Guardado de Récords
- Cada etapa comienza con una **cuenta atrás animada con semáforo (`3, 2, 1, ¡YA!`)** y avisos sonoros.
- El cronómetro registra tus tiempos con precisión de milisegundos (`mm:ss.ms`).
- Los mejores tiempos se guardan automáticamente en tu navegador a través de `localStorage` de forma independiente para cada etapa y modo.
- Puedes reiniciar o borrar tus tiempos en cualquier momento con el botón **"Borrar Tiempos"** del menú principal.

### 5. Cámara Cenital y Minimapa
- La cámara cenital sigue al vehículo de forma fluida con anticipación (*look-ahead* hacia donde se orienta la inercia).
- La esquina inferior derecha cuenta con un **minimapa en tiempo real** que muestra el recorrido completo, los checkpoints intermedios, la línea de meta y la ubicación y dirección exacta de tu coche.

---

## 🛠️ Estructura del Código

```text
├── index.html        # Estructura del juego, lienzos Canvas y superposiciones (Menú, HUD, Modales)
├── css/
│   └── style.css     # Estilos visuales estilo competición WRC
├── js/
│   ├── game.js       # Bucle principal, máquina de estados y HUD
│   ├── car.js        # Física de rally, derrapes, partículas y límite del 60% fuera de pista
│   ├── tracks.js     # Splines de las 3 etapas, checkpoints y obstáculos
│   ├── renderer.js   # Renderizado en Canvas, cámara dinámica y minimapa
│   ├── textures.js   # Generación de texturas tileables y manejo de sprites
│   ├── audio.js      # Efectos de sonido y motor sintetizados con Web Audio API
│   └── storage.js    # Guardado de récords en localStorage
├── assets/           # Sprites e imágenes del coche y adornos exteriores
├── AGENTS.md         # Documentación técnica avanzada para desarrolladores y agentes de IA
└── README.md         # Este archivo de guía e instrucciones
```
