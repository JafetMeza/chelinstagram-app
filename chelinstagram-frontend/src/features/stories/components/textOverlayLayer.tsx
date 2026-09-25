import { TextOverlay } from '../lib/types';

interface TextOverlayLayerProps {
    overlays: TextOverlay[];
    selectedId?: string | null;
    onPointerDownOverlay?: (id: string, e: React.PointerEvent) => void;
}

const TextOverlayLayer = ({ overlays, selectedId, onPointerDownOverlay }: TextOverlayLayerProps) => {
    const interactive = !!onPointerDownOverlay;

    return (
        <div className="absolute inset-0 pointer-events-none">
            {overlays.map((o) => (
                <div
                    key={o.id}
                    onPointerDown={interactive ? (e) => onPointerDownOverlay!(o.id, e) : undefined}
                    className={`absolute whitespace-pre-wrap break-words max-w-[85%] font-bold leading-tight
                        ${interactive ? 'pointer-events-auto cursor-grab active:cursor-grabbing touch-none' : ''}
                        ${selectedId === o.id ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent rounded-sm' : ''}`}
                    style={{
                        left: `${o.x}%`,
                        top: `${o.y}%`,
                        transform: 'translate(-50%, -50%)',
                        color: o.color,
                        fontSize: `${o.fontSize}cqw`,
                        textAlign: o.align,
                        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    }}
                >
                    {o.text}
                </div>
            ))}
        </div>
    );
};

export default TextOverlayLayer;