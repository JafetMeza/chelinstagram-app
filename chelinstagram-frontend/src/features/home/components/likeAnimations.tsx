import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartReg } from '@fortawesome/free-regular-svg-icons';

// Animaciones del like (CSS puro en index.css: solo transform/opacity, fluido en celular).
// prefers-reduced-motion las reduce a un fundido simple.

const PARTICLE_COLORS = ['#ef4444', '#f43f5e', '#ec4899', '#fb923c', '#facc15'];

export interface HeartBurstData {
    id: number;
    x: number;
    y: number;
}

// Corazón grande del doble tap + explosión de corazoncitos alrededor del dedo
export const DoubleTapHeart = ({ x, y, id }: HeartBurstData) => {
    // Pseudoaleatorio estable por burst (no cambia entre renders)
    const particles = Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2 + (id % 7) * 0.3;
        const distance = 70 + ((id * (i + 3)) % 40);
        return {
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance,
            color: PARTICLE_COLORS[(i + id) % PARTICLE_COLORS.length],
            size: i % 3 === 0 ? 20 : 13,
            delay: (i % 4) * 25,
        };
    });

    return (
        <div className="absolute z-10 pointer-events-none" style={{ left: x, top: y }}>
            {particles.map((p, i) => (
                <FontAwesomeIcon
                    key={i}
                    icon={faHeartSolid}
                    className="like-particle absolute"
                    style={{
                        color: p.color,
                        fontSize: `${p.size}px`,
                        left: `${-p.size / 2}px`,
                        top: `${-p.size / 2}px`,
                        animationDelay: `${120 + p.delay}ms`,
                        ['--dx' as string]: `${p.dx}px`,
                        ['--dy' as string]: `${p.dy}px`,
                    }}
                />
            ))}
            <div className="like-heart-pop absolute -translate-x-1/2 -translate-y-1/2">
                <FontAwesomeIcon icon={faHeartSolid} className="text-8xl text-white drop-shadow-[0_6px_20px_rgba(239,68,68,0.55)]" />
            </div>
        </div>
    );
};

interface LikeButtonProps {
    isLiked: boolean;
    // Cambian cada vez que hay que reproducir la animación (like / quitar like)
    likeKey: number;
    unlikeKey: number;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const LikeButton = ({ isLiked, likeKey, unlikeKey, onClick }: LikeButtonProps) => {
    const animationClass = isLiked
        ? (likeKey > 0 ? 'like-btn-pop' : '')
        : (unlikeKey > 0 ? 'like-btn-unlike' : '');

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={isLiked ? 'Quitar like' : 'Dar like'}
            aria-pressed={isLiked}
            className={`relative ${isLiked ? 'text-red-500' : 'hover:text-gray-500'}`}
        >
            {isLiked && likeKey > 0 && (
                <span key={`ring-${likeKey}`} className="like-btn-ring absolute inset-0 m-auto w-6 h-6 rounded-full border-red-500 pointer-events-none" />
            )}
            {isLiked && likeKey > 0 && (
                <span key={`sparks-${likeKey}`} className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: 6 }, (_, i) => (
                        <span
                            key={i}
                            className="like-spark absolute left-1/2 top-1/2 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full"
                            style={{
                                backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                                ['--angle' as string]: `${i * 60}deg`,
                            }}
                        />
                    ))}
                </span>
            )}
            <span key={isLiked ? `on-${likeKey}` : `off-${unlikeKey}`} className={`inline-block ${animationClass}`}>
                <FontAwesomeIcon icon={isLiked ? faHeartSolid : faHeartReg} />
            </span>
        </button>
    );
};

// Contador que gira como odómetro al cambiar (sube al dar like, baja al quitarlo)
export const AnimatedLikeCount = ({ count, direction }: { count: number; direction: 'up' | 'down' | null; }) => (
    <span className="inline-flex overflow-hidden align-bottom">
        <span key={count} className={`inline-block ${direction === 'up' ? 'like-count-up' : direction === 'down' ? 'like-count-down' : ''}`}>
            {count}
        </span>
    </span>
);
