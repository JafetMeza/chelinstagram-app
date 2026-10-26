import '../lib/fonts';
import { TextOverlay } from '../lib/types';
import { OVERLAY_TEXT_CLASS, getOverlayPositionStyle, getOverlayTextStyle } from '../lib/overlayStyle';

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
                    className={`absolute ${OVERLAY_TEXT_CLASS}
                        ${interactive ? 'pointer-events-auto cursor-grab active:cursor-grabbing touch-none' : ''}
                        ${selectedId === o.id ? 'outline-2 outline-dashed outline-white/70 outline-offset-4 rounded-sm' : ''}`}
                    style={{ ...getOverlayPositionStyle(o), ...getOverlayTextStyle(o) }}
                >
                    {o.text}
                </div>
            ))}
        </div>
    );
};

export default TextOverlayLayer;
