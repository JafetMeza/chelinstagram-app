// Lienzo compartido: misma relación de aspecto en todos los celulares para que
// un punto normalizado (0..1) caiga en el mismo lugar relativo en ambas pantallas.
export const BOARD_ASPECT = 16 / 9; // alto / ancho

// Yema de un dedo: óvalo vertical. El ancho es una fracción del ancho del lienzo
// (~0.09 en un celular de ~70 mm de ancho ≈ 12-13 mm de yema).
export const FINGER_RX = 0.09;
export const FINGER_RATIO = 1.35; // alto / ancho del óvalo

export const HEARTS_THRESHOLD = 0.8;
export const PERFECT_THRESHOLD = 0.98;

export type TouchPoint = { x: number; y: number; };

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// Área de intersección de dos círculos de radio r separados d, como fracción del área de uno
const circleOverlapRatio = (d: number, r: number) => {
    if (d >= 2 * r) return 0;
    if (d <= 0) return 1;
    const area = 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d);
    return area / (Math.PI * r * r);
};

/**
 * Efectividad del toque (0..1) = área compartida entre los dos óvalos / área de un óvalo.
 * Dos elipses iguales y alineadas se vuelven círculos al escalar el eje Y por rx/ry,
 * y ese escalado conserva la proporción de áreas, así que el cálculo es exacto.
 */
export const computeEffectiveness = (a?: TouchPoint | null, b?: TouchPoint | null) => {
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = ((a.y - b.y) * BOARD_ASPECT) / FINGER_RATIO; // a unidades de ancho y luego a "círculo"
    return circleOverlapRatio(Math.hypot(dx, dy), FINGER_RX);
};

// Interpolación para suavizar la posición del otro (compensa la latencia de red)
export const lerpPoint = (from: TouchPoint, to: TouchPoint, t: number): TouchPoint => ({
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
});
