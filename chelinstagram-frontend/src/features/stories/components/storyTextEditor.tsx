import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faFont, faTrash, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import TextOverlayLayer from './textOverlayLayer';
import { TextOverlay, TEXT_COLORS, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_FONT_SIZE } from '../lib/types';

const createOverlayId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `ov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const DRAG_THRESHOLD_PX = 6;

interface StoryTextEditorProps {
    previewUrl: string;
    mediaType: 'image' | 'video';
    initialOverlays: TextOverlay[];
    onConfirm: (overlays: TextOverlay[]) => void;
    onCancel: () => void;
}

const StoryTextEditor = ({ previewUrl, mediaType, initialOverlays, onConfirm, onCancel }: StoryTextEditorProps) => {
    const [overlays, setOverlays] = useState<TextOverlay[]>(initialOverlays);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragState = useRef<{
        id: string;
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
        rect: DOMRect;
        moved: boolean;
    } | null>(null);

    const editingOverlay = overlays.find((o) => o.id === editingId) ?? null;
    const activeId = editingId ?? selectedId;

    const editingRef = useRef<HTMLTextAreaElement>(null);

    // 🟢 Autosize: without this, rows={1} kept the box pinned to one line's
    // height and any wrapped/oversized text got clipped by the textarea's
    // own overflow, which is what made it "disappear".
    useEffect(() => {
        const el = editingRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [editingOverlay?.text, editingOverlay?.fontSize]);

    const updateOverlay = (id: string, patch: Partial<TextOverlay>) => {
        setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    };

    const removeOverlay = (id: string) => {
        setOverlays((prev) => prev.filter((o) => o.id !== id));
        if (selectedId === id) setSelectedId(null);
        if (editingId === id) setEditingId(null);
    };

    const addText = () => {
        const id = createOverlayId();
        setOverlays((prev) => [
            ...prev,
            { id, text: '', x: 50, y: 50, color: '#ffffff', fontSize: DEFAULT_FONT_SIZE, align: 'center' },
        ]);
        setSelectedId(id);
        setEditingId(id);
    };

    const commitEditing = () => {
        if (!editingId) return;
        const overlay = overlays.find((o) => o.id === editingId);
        if (overlay && !overlay.text.trim()) {
            removeOverlay(editingId);
        } else {
            setEditingId(null);
        }
    };

    const handleOverlayPointerDown = (id: string, e: React.PointerEvent) => {
        if (editingId) return; // don't start a drag while typing
        const container = containerRef.current;
        const overlay = overlays.find((o) => o.id === id);
        if (!container || !overlay) return;

        setSelectedId(id);
        dragState.current = {
            id,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startX: overlay.x,
            startY: overlay.y,
            rect: container.getBoundingClientRect(),
            moved: false,
        };

        const handleMove = (moveEvent: PointerEvent) => {
            const drag = dragState.current;
            if (!drag) return;
            const dx = moveEvent.clientX - drag.startClientX;
            const dy = moveEvent.clientY - drag.startClientY;
            if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) drag.moved = true;

            updateOverlay(drag.id, {
                x: Math.min(95, Math.max(5, drag.startX + (dx / drag.rect.width) * 100)),
                y: Math.min(95, Math.max(5, drag.startY + (dy / drag.rect.height) * 100)),
            });
        };

        const handleUp = () => {
            const drag = dragState.current;
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            if (drag && !drag.moved) setEditingId(drag.id); // tap (no drag) -> edit
            dragState.current = null;
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
    };

    const handleBackgroundPointerDown = (e: React.PointerEvent) => {
        if (e.target !== e.currentTarget) return; // ignore bubbled taps from overlays
        if (editingId) return commitEditing();
        if (selectedId) setSelectedId(null);
    };

    const handleDone = () => {
        if (editingId) {
            const overlay = overlays.find((o) => o.id === editingId);
            if (overlay && !overlay.text.trim()) {
                onConfirm(overlays.filter((o) => o.id !== editingId));
                return;
            }
        }
        onConfirm(overlays.filter((o) => o.text.trim()));
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center p-4 border-b border-zinc-800 text-white">
                <button onClick={onCancel}>
                    <FontAwesomeIcon icon={faXmark} className="text-xl" />
                </button>
                <h1 className="flex-1 text-center font-bold">Add Text</h1>
                <button onClick={handleDone} className="text-sm font-bold text-blue-400">
                    Done
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 overflow-hidden">
                <div
                    ref={containerRef}
                    onPointerDown={handleBackgroundPointerDown}
                    className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden bg-zinc-900 touch-none @container"
                >
                    {mediaType === 'video' ? (
                        <video src={previewUrl} className="w-full h-full object-cover pointer-events-none" muted playsInline autoPlay loop />
                    ) : (
                        <img src={previewUrl} className="w-full h-full object-cover pointer-events-none" alt="Story preview" />
                    )}

                    <TextOverlayLayer
                        overlays={overlays.filter((o) => o.id !== editingId)}
                        selectedId={selectedId}
                        onPointerDownOverlay={handleOverlayPointerDown}
                    />

                    {editingOverlay && (
                        <div
                            className="absolute max-w-[85%]"
                            style={{ left: `${editingOverlay.x}%`, top: `${editingOverlay.y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                            <textarea
                                ref={editingRef}
                                autoFocus
                                value={editingOverlay.text}
                                onChange={(e) => updateOverlay(editingOverlay.id, { text: e.target.value })}
                                onFocus={(e) => e.currentTarget.select()}
                                onBlur={commitEditing}
                                rows={1}
                                placeholder="Type something"
                                className="block bg-transparent outline-none border-none resize-none overflow-hidden font-bold text-center placeholder-white/50"
                                style={{
                                    color: editingOverlay.color,
                                    fontSize: `${editingOverlay.fontSize}cqw`,
                                    lineHeight: 1.2,
                                    textAlign: editingOverlay.align,
                                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                                    width: '60vw',
                                    maxWidth: '340px',
                                }}
                            />
                        </div>
                    )}
                </div>

                {!editingId && (
                    <button
                        type="button"
                        onClick={addText}
                        className="flex items-center gap-2 bg-zinc-800 text-white text-sm font-semibold px-4 py-2 rounded-full active:scale-95 transition-transform"
                    >
                        <FontAwesomeIcon icon={faFont} />
                        Add text
                    </button>
                )}
            </div>

            {activeId && (
                <div className="p-4 flex flex-col gap-3 border-t border-zinc-800">
                    <div className="flex items-center gap-3 px-2">
                        <FontAwesomeIcon icon={faMinus} className="text-zinc-500 text-xs" />
                        <input
                            type="range"
                            min={MIN_FONT_SIZE}
                            max={MAX_FONT_SIZE}
                            step={0.5}
                            value={overlays.find((o) => o.id === activeId)?.fontSize ?? DEFAULT_FONT_SIZE}
                            onChange={(e) => updateOverlay(activeId, { fontSize: parseFloat(e.target.value) })}
                            className="flex-1 accent-blue-500"
                            aria-label="Text size"
                        />
                        <FontAwesomeIcon icon={faPlus} className="text-zinc-500 text-xs" />
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        {TEXT_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => updateOverlay(activeId, { color: c })}
                                className={`w-7 h-7 rounded-full border-2 transition-transform ${overlays.find((o) => o.id === activeId)?.color === c ? 'border-blue-400 scale-110' : 'border-white/30'
                                    }`}
                                style={{ backgroundColor: c }}
                                aria-label={`Color ${c}`}
                            />
                        ))}
                    </div>

                    {selectedId && !editingId && (
                        <button
                            type="button"
                            onClick={() => removeOverlay(selectedId)}
                            className="self-center flex items-center gap-2 text-red-400 text-sm font-semibold"
                        >
                            <FontAwesomeIcon icon={faTrash} />
                            Remove text
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default StoryTextEditor;