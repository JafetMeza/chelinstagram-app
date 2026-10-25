import { useId } from 'react';

// Óvalo vertical con crestas de huella dactilar.
// - variant "icon": monocromo con currentColor (botones).
// - variant "marker": relleno con degradado, es el "dedo" dentro del lienzo.

const VIEW_W = 100;
const VIEW_H = 135; // misma proporción que FINGER_RATIO
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;

// Crestas tipo "loop": arcos concéntricos alrededor de un núcleo, abiertos hacia abajo
// como una huella real. Con pathLength=100 una <ellipse> empieza en las 3 en punto y
// avanza en sentido horario, así que la parte de abajo está en 25.
const RIDGES = Array.from({ length: 9 }, (_, i) => {
    const rx = 4 + i * 5.6;
    const gap = 10 + i * 2.5;                      // abertura inferior, crece hacia afuera
    const gapCenter = 25 + (i % 2 === 0 ? 3 : -4); // ligeramente asimétrica
    // Los anillos impares tienen además un pequeño corte para que no parezcan una diana
    const dash = i % 2 === 1 && i > 1
        ? `${(100 - gap) * 0.55} 4 ${(100 - gap) * 0.45 - 4} ${gap}`
        : `${100 - gap} ${gap}`;
    return {
        rx,
        ry: rx * 1.32,
        cy: CY + 8 - i * 0.9,
        dash,
        offset: -(gapCenter + gap / 2),
    };
});

interface FingerprintOvalProps {
    variant?: 'icon' | 'marker';
    /** Colores del degradado para el marker: [centro, borde] */
    colors?: [string, string];
    className?: string;
    style?: React.CSSProperties;
    title?: string;
}

const FingerprintOval = ({ variant = 'icon', colors = ['#7dd3fc', '#2563eb'], className, style, title }: FingerprintOvalProps) => {
    const id = useId();
    const clipId = `${id}-clip`;
    const gradientId = `${id}-gradient`;
    const isIcon = variant === 'icon';

    return (
        <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className={className}
            style={style}
            role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : true}
            aria-label={title}
        >
            {title && <title>{title}</title>}
            <defs>
                <clipPath id={clipId}>
                    <ellipse cx={CX} cy={CY} rx={VIEW_W / 2 - 3} ry={VIEW_H / 2 - 3} />
                </clipPath>
                {!isIcon && (
                    <radialGradient id={gradientId} cx="45%" cy="40%" r="70%">
                        <stop offset="0%" stopColor={colors[0]} />
                        <stop offset="100%" stopColor={colors[1]} />
                    </radialGradient>
                )}
            </defs>

            <ellipse
                cx={CX}
                cy={CY}
                rx={VIEW_W / 2 - 3}
                ry={VIEW_H / 2 - 3}
                fill={isIcon ? 'none' : `url(#${gradientId})`}
                fillOpacity={isIcon ? undefined : 0.85}
                stroke={isIcon ? 'currentColor' : 'rgba(255,255,255,0.9)'}
                strokeWidth={isIcon ? 7 : 3}
            />

            <g clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round"
                stroke={isIcon ? 'currentColor' : 'rgba(255,255,255,0.7)'}
                strokeWidth={isIcon ? 5 : 2.6}
            >
                {RIDGES.filter((_, i) => !isIcon || i % 2 === 0).map((ridge, i) => (
                    <ellipse
                        key={i}
                        cx={CX}
                        cy={ridge.cy}
                        rx={ridge.rx}
                        ry={ridge.ry}
                        pathLength={100}
                        strokeDasharray={ridge.dash}
                        strokeDashoffset={ridge.offset}
                    />
                ))}
            </g>
        </svg>
    );
};

export default FingerprintOval;
