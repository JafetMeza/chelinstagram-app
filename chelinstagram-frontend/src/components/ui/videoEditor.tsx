// components/VideoEditor.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';

export interface CropData {
    x: number;
    y: number;
    size: number;
}

interface VideoEditorProps {
    videoSrc: string;
    onTrim: (startTime: number, endTime: number, isMuted: boolean, crop: CropData) => void;
}

const MAX_ZOOM = 3;

type TouchMode = 'pan' | 'pinch' | null;

const getTouchDistance = (touches: React.TouchList) => {
    const [t1, t2] = [touches[0], touches[1]];
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
};

const getTouchMidpoint = (touches: React.TouchList) => {
    const [t1, t2] = [touches[0], touches[1]];
    return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
};

const VideoEditor: React.FC<VideoEditorProps> = ({ videoSrc, onTrim }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const [videoDims, setVideoDims] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [minZoom, setMinZoom] = useState(1);

    const [squareSize, setSquareSize] = useState(0);

    // Mouse drag state
    const dragState = useRef({ dragging: false, startX: 0, startY: 0, startPan: { x: 0, y: 0 } });

    // Touch state (single-finger pan OR two-finger pinch)
    const touchState = useRef<{
        mode: TouchMode;
        startX: number;
        startY: number;
        startPan: { x: number; y: number; };
        startDistance: number;
        startZoom: number;
        startMid: { x: number; y: number; };
    }>({
        mode: null,
        startX: 0,
        startY: 0,
        startPan: { x: 0, y: 0 },
        startDistance: 0,
        startZoom: 1,
        startMid: { x: 0, y: 0 },
    });

    const getContainerSize = () => squareSize;

    const getLayout = useCallback((z: number, p: { x: number; y: number; }) => {
        const { width: vw, height: vh } = videoDims;
        const containerSize = squareSize; // 🟢 CHANGED
        if (!vw || !vh || !containerSize) return null;

        const baseScale = Math.max(containerSize / vw, containerSize / vh);
        const effectiveScale = baseScale * z;
        const displayedW = vw * effectiveScale;
        const displayedH = vh * effectiveScale;
        const left = (containerSize - displayedW) / 2 + p.x;
        const top = (containerSize - displayedH) / 2 + p.y;

        return { vw, vh, containerSize, effectiveScale, displayedW, displayedH, left, top };
    }, [videoDims, squareSize]);

    const clampPan = useCallback((nextPan: { x: number; y: number; }, z: number) => {
        const layout = getLayout(z, { x: 0, y: 0 });
        if (!layout) return { x: 0, y: 0 };
        const maxPanX = Math.max(0, (layout.displayedW - layout.containerSize) / 2);
        const maxPanY = Math.max(0, (layout.displayedH - layout.containerSize) / 2);
        return {
            x: Math.min(maxPanX, Math.max(-maxPanX, nextPan.x)),
            y: Math.min(maxPanY, Math.max(-maxPanY, nextPan.y)),
        };
    }, [getLayout]);

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const vidDuration = videoRef.current.duration;
            setDuration(vidDuration);
            setEndTime(vidDuration);
            setStartTime(0);

            const vw = videoRef.current.videoWidth;
            const vh = videoRef.current.videoHeight;
            setVideoDims({ width: vw, height: vh });

            // 🟢 NEW: the "contain" scale relative to "cover" scale is just the aspect
            // ratio of the shorter side to the longer side — e.g. a 16:9 video needs
            // to shrink to 9/16 (~0.5625) of its cover-scale size to be fully visible.
            const containRatio = vw && vh ? Math.min(vw, vh) / Math.max(vw, vh) : 1;
            setMinZoom(containRatio);
            setZoom(1);              // default stays "cover" — no change in default behavior
            setPan({ x: 0, y: 0 });
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            setCurrentTime(current);
            if (current >= endTime) videoRef.current.currentTime = startTime;
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = parseFloat(e.target.value);
        if (newStart < endTime - 1) {
            setStartTime(newStart);
            if (videoRef.current) {
                videoRef.current.currentTime = newStart;
                setCurrentTime(newStart);
            }
        }
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = parseFloat(e.target.value);
        if (newEnd > startTime + 1) {
            setEndTime(newEnd);
            if (videoRef.current) {
                videoRef.current.currentTime = newEnd - 0.1;
                setCurrentTime(newEnd);
            }
        }
    };

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        setZoom(newZoom);
        setPan(prev => clampPan(prev, newZoom));
    };

    // --- Mouse (pointer) handlers — gated to real mouse input only ---
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        (e.target as Element).setPointerCapture(e.pointerId);
        dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startPan: pan };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse' || !dragState.current.dragging) return;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        const next = { x: dragState.current.startPan.x + dx, y: dragState.current.startPan.y + dy };
        setPan(clampPan(next, zoom));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        dragState.current.dragging = false;
    };

    // --- Touch handlers — single finger pans, two fingers pinch-zoom ---
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            touchState.current = {
                mode: 'pinch',
                startX: 0,
                startY: 0,
                startPan: pan,
                startDistance: getTouchDistance(e.touches),
                startZoom: zoom,
                startMid: getTouchMidpoint(e.touches),
            };
        } else if (e.touches.length === 1) {
            const t = e.touches[0];
            touchState.current = {
                mode: 'pan',
                startX: t.clientX,
                startY: t.clientY,
                startPan: pan,
                startDistance: 0,
                startZoom: zoom,
                startMid: { x: 0, y: 0 },
            };
        }
    };

    // 🟢 Pinch handler now clamps against the dynamic minZoom, not a fixed constant
    const handleTouchMove = (e: React.TouchEvent) => {
        const state = touchState.current;

        if (state.mode === 'pinch' && e.touches.length === 2) {
            const newDistance = getTouchDistance(e.touches);
            const ratio = newDistance / (state.startDistance || newDistance);
            const newZoom = Math.min(MAX_ZOOM, Math.max(minZoom, state.startZoom * ratio));
            setZoom(newZoom);
            setPan(prev => clampPan(prev, newZoom));
        } else if (state.mode === 'pan' && e.touches.length === 1) {
            const t = e.touches[0];
            const dx = t.clientX - state.startX;
            const dy = t.clientY - state.startY;
            const next = { x: state.startPan.x + dx, y: state.startPan.y + dy };
            setPan(clampPan(next, zoom));
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        // If one finger lifts during a pinch, drop back to pan mode with the remaining finger
        if (e.touches.length === 1) {
            const t = e.touches[0];
            touchState.current = {
                mode: 'pan',
                startX: t.clientX,
                startY: t.clientY,
                startPan: pan,
                startDistance: 0,
                startZoom: zoom,
                startMid: { x: 0, y: 0 },
            };
        } else if (e.touches.length === 0) {
            touchState.current.mode = null;
        }
    };

    // 🟢 computeCrop no longer clamps to the video's bounds — x/y can go negative,
    // and size can exceed the video's own width/height. Those out-of-bounds values
    // are exactly what tells the backend "pad here", instead of silently hiding the request.
    const computeCrop = (): CropData => {
        const layout = getLayout(zoom, pan);
        if (!layout) return { x: 0, y: 0, size: 0 };

        const cropX = -layout.left / layout.effectiveScale;
        const cropY = -layout.top / layout.effectiveScale;
        const cropSize = layout.containerSize / layout.effectiveScale;

        return {
            x: Math.round(cropX),
            y: Math.round(cropY),
            size: Math.round(cropSize),
        };
    };

    const handleApply = () => {
        const crop = computeCrop();
        const layout = getLayout(zoom, pan);
        console.log('[VideoEditor DEBUG]', {
            videoDims,
            containerSize: getContainerSize(),
            zoom,
            pan,
            layout,
            computedCrop: crop,
        });
        onTrim(startTime, endTime, isMuted, crop);
    };

    // eslint-disable-next-line react-hooks/refs
    const layout = getLayout(zoom, pan);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const nativeTouchMove = (e: TouchEvent) => {
            if (touchState.current.mode) e.preventDefault();
        };

        el.addEventListener('touchmove', nativeTouchMove, { passive: false });
        return () => el.removeEventListener('touchmove', nativeTouchMove);
    }, []);

    useEffect(() => {
        const stageEl = stageRef.current;
        if (!stageEl) return;

        const updateSize = () => {
            const rect = stageEl.getBoundingClientRect();
            const size = Math.floor(Math.min(rect.width, rect.height));
            setSquareSize(size > 0 ? size : 0);
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(stageEl);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="flex flex-col gap-4 w-full h-full p-4 bg-zinc-900 text-white overflow-y-auto">
            <style>{`
                .dual-range { -webkit-appearance: none; appearance: none; background: transparent; }
                .dual-range::-webkit-slider-thumb {
                    -webkit-appearance: none; pointer-events: auto;
                    width: 14px; height: 52px; background: white; border-radius: 4px;
                    cursor: ew-resize; box-shadow: 0 0 5px rgba(0,0,0,0.8);
                }
                .dual-range::-moz-range-thumb {
                    pointer-events: auto; width: 14px; height: 52px; background: white;
                    border: none; border-radius: 4px; cursor: ew-resize; box-shadow: 0 0 5px rgba(0,0,0,0.8);
                }
            `}</style>

            <h3 className="font-bold text-center">Edit Clip</h3>
            <div ref={stageRef} className="flex-1 min-h-0 flex items-center justify-center">
                <div
                    ref={containerRef}
                    style={{ width: squareSize || undefined, height: squareSize || undefined }}
                    className="relative bg-black rounded-lg overflow-hidden touch-none select-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        className="absolute pointer-events-none"
                        style={layout ? {
                            width: `${layout.displayedW}px`,
                            height: `${layout.displayedH}px`,
                            left: `${layout.left}px`,
                            top: `${layout.top}px`,
                            maxWidth: 'none',
                            maxHeight: 'none',
                        } : {}}
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                        playsInline
                    />

                    <div className="absolute inset-0 pointer-events-none border-2 border-white/70" />

                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={togglePlay}
                        className={`absolute inset-0 m-auto w-16 h-16 bg-black/50 rounded-full flex items-center justify-center transition-opacity z-10 ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}
                    >
                        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="text-2xl" />
                    </button>

                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={toggleMute}
                        className="absolute bottom-4 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm z-10"
                    >
                        <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} className="text-sm" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 px-2">
                <span className="text-xs text-zinc-400">Zoom</span>
                <input
                    type="range" min={minZoom} max={MAX_ZOOM} step={0.01}
                    value={zoom} onChange={handleZoomChange} className="flex-1"
                />
            </div>
            <p className="text-center text-[10px] text-zinc-500 -mt-2">Drag or pinch to reposition/zoom the video</p>

            <div className="flex flex-col gap-2 bg-black/30 p-4 rounded-xl border border-zinc-800">
                <div className="flex justify-between text-xs font-semibold text-zinc-400">
                    <span>{startTime.toFixed(1)}s</span>
                    <span className="text-white">Clip: {(endTime - startTime).toFixed(1)}s</span>
                    <span>{endTime.toFixed(1)}s</span>
                </div>

                <div className="relative h-12 bg-zinc-800 rounded-md flex items-center mx-2">
                    <div
                        className="absolute h-full bg-blue-500/40 border-y-2 border-blue-500 pointer-events-none"
                        style={{
                            left: `${(startTime / duration) * 100}%`,
                            width: `${((endTime - startTime) / duration) * 100}%`
                        }}
                    />
                    {duration > 0 && (
                        <div
                            className="absolute h-full w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.8)] z-30 pointer-events-none"
                            style={{ left: `${(currentTime / duration) * 100}%` }}
                        />
                    )}
                    <input type="range" min={0} max={duration} step={0.1} value={startTime}
                        onChange={handleStartChange} className="absolute w-full h-full pointer-events-none dual-range z-40" />
                    <input type="range" min={0} max={duration} step={0.1} value={endTime}
                        onChange={handleEndChange} className="absolute w-full h-full pointer-events-none dual-range z-40" />
                </div>
                <p className="text-center text-[10px] text-zinc-500 mt-2">Drag the white handles to trim video</p>
            </div>

            <button
                onClick={handleApply}
                className="mt-auto bg-blue-500 text-white font-bold py-3 rounded-lg active:scale-95 transition-transform"
            >
                Done Editing
            </button>
        </div>
    );
};

export default VideoEditor;