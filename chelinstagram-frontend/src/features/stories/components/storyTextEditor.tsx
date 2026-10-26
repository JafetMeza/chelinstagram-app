import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faFont, faTrash, faMinus, faPlus, faBold, faItalic, faUnderline } from '@fortawesome/free-solid-svg-icons';
import TextOverlayLayer from './textOverlayLayer';
import { OVERLAY_TEXT_CLASS, getOverlayPositionStyle, getOverlayTextStyle } from '../lib/overlayStyle';
import StoryMediaPreview from './storyMediaPreview';
import {
    TextOverlay, MediaCrop, STORY_FONTS, TEXT_COLORS,
    MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_FONT_SIZE, MAX_TEXT_OVERLAYS, MAX_TEXT_LENGTH,
} from '../lib/types';

const createOverlayId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `ov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const DRAG_THRESHOLD_PX = 6;
const PLACEHOLDER = 'Type something';

interface StoryTextEditorProps {
    previewUrl: string;
    mediaType: 'image' | 'video';
    crop?: MediaCrop | null;
    initialOverlays: TextOverlay[];
    onConfirm: (overlays: TextOverlay[]) => void;
    onCancel: () => void;
}

const StoryTextEditor = ({ previewUrl, mediaType, crop, initialOverlays, onConfirm, onCancel }: StoryTextEditorProps) => {
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
    const activeOverlay = overlays.find((o) => o.id === activeId) ?? null;

    const updateOverlay = (id: string, patch: Partial<TextOverlay>) => {
        setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    };

    const removeOverlay = (id: string) => {
        setOverlays((prev) => prev.filter((o) => o.id !== id));
        if (selectedId === id) setSelectedId(null);
        if (editingId === id) setEditingId(null);
    };

    const addText = () => {
        if (overlays.length >= MAX_TEXT_OVERLAYS) return;
        const id = createOverlayId();
        setOverlays((prev) => [
            ...prev,
            {
                id, text: '', x: 50, y: 50, color: '#ffffff', fontSize: DEFAULT_FONT_SIZE, align: 'center',
                font: 'classic', bold: true, italic: false, underline: false,
            },
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
        const rect = container.getBoundingClientRect();
        // Mitad del tamaño del texto en %: el centro se limita para que la caja no se salga del lienzo
        const textRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const halfW = Math.min(50, (textRect.width / rect.width) * 50);
        const halfH = Math.min(50, (textRect.height / rect.height) * 50);
        dragState.current = {
            id,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startX: overlay.x,
            startY: overlay.y,
            rect,
            moved: false,
        };

        const handleMove = (moveEvent: PointerEvent) => {
            const drag = dragState.current;
            if (!drag) return;
            const dx = moveEvent.clientX - drag.startClientX;
            const dy = moveEvent.clientY - drag.startClientY;
            if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) drag.moved = true;

            updateOverlay(drag.id, {
                x: Math.min(100 - halfW, Math.max(halfW, drag.startX + (dx / drag.rect.width) * 100)),
                y: Math.min(100 - halfH, Math.max(halfH, drag.startY + (dy / drag.rect.height) * 100)),
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
        onConfirm(overlays.filter((o) => o.text.trim()));
    };

    // Los botones de estilo no deben robarle el foco al textarea (cerraría la edición)
    const keepFocus = (e: React.MouseEvent) => e.preventDefault();

    const toggleButtonClass = (active: boolean) =>
        `w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${active ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`;

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
                    className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden bg-black touch-none @container"
                >
                    <StoryMediaPreview src={previewUrl} mediaType={mediaType} crop={crop} />

                    <TextOverlayLayer
                        overlays={overlays.filter((o) => o.id !== editingId)}
                        selectedId={selectedId}
                        onPointerDownOverlay={handleOverlayPointerDown}
                    />

                    {editingOverlay && (
                        // Misma caja que el texto final: el "espejo" invisible fija el tamaño y el
                        // textarea lo cubre, así las líneas se cortan exactamente igual al publicar.
                        <div
                            className={`absolute ${OVERLAY_TEXT_CLASS}`}
                            style={{ ...getOverlayPositionStyle(editingOverlay), ...getOverlayTextStyle(editingOverlay) }}
                        >
                            <div aria-hidden className="invisible">
                                {(editingOverlay.text || PLACEHOLDER) + '​'}
                            </div>
                            <textarea
                                autoFocus
                                value={editingOverlay.text}
                                maxLength={MAX_TEXT_LENGTH}
                                onChange={(e) => updateOverlay(editingOverlay.id, { text: e.target.value })}
                                onFocus={(e) => e.currentTarget.select()}
                                onBlur={commitEditing}
                                placeholder={PLACEHOLDER}
                                className="absolute inset-0 w-full h-full p-0 m-0 border-0 bg-transparent outline-none resize-none overflow-hidden whitespace-pre-wrap break-words placeholder-white/50"
                                style={{ ...getOverlayTextStyle(editingOverlay), lineHeight: 'inherit', caretColor: editingOverlay.color }}
                            />
                        </div>
                    )}
                </div>

                {!editingId && overlays.length < MAX_TEXT_OVERLAYS && (
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

            {activeId && activeOverlay && (
                <div className="p-4 flex flex-col gap-3 border-t border-zinc-800">
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="radiogroup" aria-label="Font">
                        {STORY_FONTS.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                role="radio"
                                aria-checked={activeOverlay.font === f.id}
                                onMouseDown={keepFocus}
                                onClick={() => updateOverlay(activeId, { font: f.id })}
                                className={`shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl border transition-colors ${activeOverlay.font === f.id ? 'border-white bg-white/10 text-white' : 'border-zinc-700 text-zinc-300'}`}
                            >
                                <span className="text-lg leading-none" style={{ fontFamily: f.family }}>Aa</span>
                                <span className="text-[10px] mt-1">{f.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 px-2">
                        <button type="button" aria-label="Bold" aria-pressed={activeOverlay.bold} onMouseDown={keepFocus}
                            onClick={() => updateOverlay(activeId, { bold: !activeOverlay.bold })} className={toggleButtonClass(activeOverlay.bold)}>
                            <FontAwesomeIcon icon={faBold} />
                        </button>
                        <button type="button" aria-label="Italic" aria-pressed={activeOverlay.italic} onMouseDown={keepFocus}
                            onClick={() => updateOverlay(activeId, { italic: !activeOverlay.italic })} className={toggleButtonClass(activeOverlay.italic)}>
                            <FontAwesomeIcon icon={faItalic} />
                        </button>
                        <button type="button" aria-label="Underline" aria-pressed={activeOverlay.underline} onMouseDown={keepFocus}
                            onClick={() => updateOverlay(activeId, { underline: !activeOverlay.underline })} className={toggleButtonClass(activeOverlay.underline)}>
                            <FontAwesomeIcon icon={faUnderline} />
                        </button>

                        <FontAwesomeIcon icon={faMinus} className="text-zinc-500 text-xs ml-2" />
                        <input
                            type="range"
                            min={MIN_FONT_SIZE}
                            max={MAX_FONT_SIZE}
                            step={0.5}
                            value={activeOverlay.fontSize}
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
                                onMouseDown={keepFocus}
                                onClick={() => updateOverlay(activeId, { color: c })}
                                className={`w-7 h-7 rounded-full border-2 transition-transform ${activeOverlay.color === c ? 'border-blue-400 scale-110' : 'border-white/30'}`}
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
