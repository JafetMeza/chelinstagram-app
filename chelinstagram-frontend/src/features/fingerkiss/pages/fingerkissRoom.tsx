import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faVolumeHigh, faVolumeXmark, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { useAppSelector } from "@/redux/hooks";
import { useSocket } from '@/components/context/socketContext';
import { GetConversationsApi } from "@/service/api.service";
import { ResponseStatus } from "@/service/helpers/serviceConstants";
import { getAvatarSrc } from "@/helpers/imageUtils";
import { User } from "@/types/schema";
import FingerprintOval from "../components/fingerprintOval";
import {
    BOARD_ASPECT,
    FINGER_RATIO,
    FINGER_RX,
    HEARTS_THRESHOLD,
    PERFECT_THRESHOLD,
    TouchPoint,
    clamp01,
    computeEffectiveness,
    lerpPoint,
} from "../lib/fingerkiss";
import { hapticCelebrate, hapticPulse, hapticStop, supportsVibration, unlockAudio } from "../lib/haptics";

const TOUCH_SEND_MS = 33;        // ~30 Hz hacia el servidor
const PARTNER_SMOOTHING = 0.35;  // 0..1, cuánto se acerca por frame a la última posición recibida
const HAPTIC_INTERVAL_MS = 180;
const HEART_SPAWN_MS = 220;
const PERFECT_HOLD_MS = 600;
const CELEBRATION_COOLDOWN_MS = 3000;

type FloatingHeart = { id: number; x: number; y: number; dx: number; size: number; };
type PartnerUser = Partial<User> | null;

const samePoint = (a: TouchPoint | null, b: TouchPoint | null) =>
    a === b || (!!a && !!b && Math.abs(a.x - b.x) < 0.0005 && Math.abs(a.y - b.y) < 0.0005);

const FingerkissRoom = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { socket, onlineUsers } = useSocket();
    const { user: currentUser } = useAppSelector(state => state.authData);

    const [partner, setPartner] = useState<PartnerUser>(location.state?.partner ?? null);
    const shouldInvite = !!location.state?.invite;

    // --- LIENZO ---
    const wrapperRef = useRef<HTMLDivElement>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });

    // --- SALA ---
    const [isPeerPresent, setIsPeerPresent] = useState(false);
    const [wasDeclined, setWasDeclined] = useState(false);
    const invitedRef = useRef(false);

    // --- TOQUES ---
    const [myTouch, setMyTouch] = useState<TouchPoint | null>(null);
    const [partnerTouch, setPartnerTouch] = useState<TouchPoint | null>(null);
    const myTouchRef = useRef<TouchPoint | null>(null);
    const partnerTargetRef = useRef<TouchPoint | null>(null);
    const partnerDisplayRef = useRef<TouchPoint | null>(null);
    const activePointerRef = useRef<number | null>(null);
    const lastSentRef = useRef(0);
    const pendingSendRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- FEEDBACK ---
    const [effectiveness, setEffectiveness] = useState(0);
    const [best, setBest] = useState(0);
    const [hearts, setHearts] = useState<FloatingHeart[]>([]);
    const [isCelebrating, setIsCelebrating] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(!supportsVibration);
    const soundRef = useRef(isSoundOn);
    const bestRef = useRef(0);
    const heartIdRef = useRef(0);
    const lastHapticRef = useRef(0);
    const isVibratingRef = useRef(false);
    const lastHeartRef = useRef(0);
    const perfectSinceRef = useRef<number | null>(null);
    const lastCelebrationRef = useRef(0);
    const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isPartnerOnline = partner?.id ? onlineUsers.includes(partner.id) : false;
    const partnerName = partner?.displayName || partner?.username || 'Tu persona';

    useEffect(() => {
        soundRef.current = isSoundOn;
    }, [isSoundOn]);

    // Si llegamos por URL directa o push, buscamos al partner en la conversación
    useEffect(() => {
        if (partner || !conversationId) return;
        let cancelled = false;
        GetConversationsApi().then(result => {
            if (cancelled || result.status !== ResponseStatus.OK) return;
            const conversation = result.data?.find(c => c.id === conversationId);
            const partnerUser = conversation?.participants?.find(p => p.userId !== currentUser?.id)?.user;
            if (partnerUser) setPartner(partnerUser);
        });
        return () => { cancelled = true; };
    }, [partner, conversationId, currentUser?.id]);

    // Tamaño del lienzo: el mayor rectángulo 9:16 que cabe en el espacio disponible
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            const boardWidth = Math.min(width, height / BOARD_ASPECT);
            setBoardSize({ width: boardWidth, height: boardWidth * BOARD_ASPECT });
        });
        observer.observe(wrapper);
        return () => observer.disconnect();
    }, []);

    // Sala por socket
    useEffect(() => {
        if (!socket || !conversationId) return;

        const isThisRoom = (payload: { conversationId?: string; }) => payload?.conversationId === conversationId;
        const join = () => socket.emit('fingerkiss_join', { conversationId });

        const clearPartner = () => {
            partnerTargetRef.current = null;
        };

        const handleState = (payload: { conversationId: string; peers: string[]; }) => {
            if (isThisRoom(payload)) setIsPeerPresent(payload.peers.length > 0);
        };
        const handlePeerJoined = (payload: { conversationId: string; userId: string; }) => {
            if (!isThisRoom(payload)) return;
            setIsPeerPresent(true);
            setWasDeclined(false);
        };
        const handlePeerLeft = (payload: { conversationId: string; userId: string; }) => {
            if (!isThisRoom(payload)) return;
            setIsPeerPresent(false);
            clearPartner();
        };
        const handleTouch = (payload: { conversationId: string; userId: string; x: number; y: number; }) => {
            if (!isThisRoom(payload) || payload.userId === currentUser?.id) return;
            partnerTargetRef.current = { x: payload.x, y: payload.y };
        };
        const handleRelease = (payload: { conversationId: string; userId: string; }) => {
            if (isThisRoom(payload) && payload.userId !== currentUser?.id) clearPartner();
        };
        const handleResponse = (payload: { conversationId: string; accepted: boolean; }) => {
            if (isThisRoom(payload) && !payload.accepted) setWasDeclined(true);
        };

        socket.on('fingerkiss_state', handleState);
        socket.on('fingerkiss_peer_joined', handlePeerJoined);
        socket.on('fingerkiss_peer_left', handlePeerLeft);
        socket.on('fingerkiss_touch', handleTouch);
        socket.on('fingerkiss_release', handleRelease);
        socket.on('fingerkiss_response', handleResponse);
        // Al reconectar (por ejemplo, tras refrescar el token) volvemos a entrar
        socket.on('connect', join);
        join();

        return () => {
            socket.emit('fingerkiss_leave', { conversationId });
            socket.off('fingerkiss_state', handleState);
            socket.off('fingerkiss_peer_joined', handlePeerJoined);
            socket.off('fingerkiss_peer_left', handlePeerLeft);
            socket.off('fingerkiss_touch', handleTouch);
            socket.off('fingerkiss_release', handleRelease);
            socket.off('fingerkiss_response', handleResponse);
            socket.off('connect', join);
        };
    }, [socket, conversationId, currentUser?.id]);

    const sendInvite = useCallback(() => {
        if (!socket || !conversationId) return;
        socket.emit('fingerkiss_invite', { conversationId });
        setWasDeclined(false);
    }, [socket, conversationId]);

    // Invitación automática al entrar desde el chat (una sola vez)
    useEffect(() => {
        if (!shouldInvite || !socket || !conversationId || invitedRef.current) return;
        invitedRef.current = true;
        socket.emit('fingerkiss_invite', { conversationId });
    }, [shouldInvite, socket, conversationId]);

    const spawnHearts = useCallback((center: TouchPoint, count: number) => {
        const created = Array.from({ length: count }, () => ({
            id: ++heartIdRef.current,
            x: center.x,
            y: center.y,
            dx: (Math.random() - 0.5) * (count > 1 ? 220 : 80),
            size: 18 + Math.random() * (count > 1 ? 26 : 14),
        }));
        setHearts(prev => [...prev.slice(-40), ...created]);
    }, []);

    // Loop por frame: suaviza al otro, calcula la efectividad y dispara vibración/corazones
    useEffect(() => {
        let frame = 0;

        const tick = () => {
            const now = performance.now();

            const target = partnerTargetRef.current;
            const previous = partnerDisplayRef.current;
            const display = target ? (previous ? lerpPoint(previous, target, PARTNER_SMOOTHING) : target) : null;
            partnerDisplayRef.current = display;
            setPartnerTouch(prev => samePoint(prev, display) ? prev : display);

            const mine = myTouchRef.current;
            const eff = computeEffectiveness(mine, display);
            const rounded = Math.round(eff * 100) / 100;
            setEffectiveness(prev => prev === rounded ? prev : rounded);

            if (eff > bestRef.current) {
                bestRef.current = eff;
                setBest(Math.round(eff * 100));
            }

            // Vibración: cualquier contacto vibra, más fuerte mientras más se tocan
            if (eff > 0) {
                if (now - lastHapticRef.current >= HAPTIC_INTERVAL_MS) {
                    hapticPulse(eff, HAPTIC_INTERVAL_MS, soundRef.current);
                    lastHapticRef.current = now;
                    isVibratingRef.current = true;
                }
            } else if (isVibratingRef.current) {
                hapticStop();
                isVibratingRef.current = false;
            }

            if (mine && display) {
                const center = { x: (mine.x + display.x) / 2, y: (mine.y + display.y) / 2 };

                if (eff >= HEARTS_THRESHOLD && now - lastHeartRef.current >= HEART_SPAWN_MS) {
                    lastHeartRef.current = now;
                    spawnHearts(center, 1);
                }

                // 100 %: hay que sostenerlo un momento para celebrar
                if (eff >= PERFECT_THRESHOLD) {
                    if (perfectSinceRef.current === null) perfectSinceRef.current = now;
                    const held = now - perfectSinceRef.current >= PERFECT_HOLD_MS;
                    if (held && now - lastCelebrationRef.current >= CELEBRATION_COOLDOWN_MS) {
                        lastCelebrationRef.current = now;
                        hapticCelebrate(soundRef.current);
                        spawnHearts(center, 14);
                        setIsCelebrating(true);
                        if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
                        celebrationTimeoutRef.current = setTimeout(() => setIsCelebrating(false), 1800);
                    }
                } else {
                    perfectSinceRef.current = null;
                }
            } else {
                perfectSinceRef.current = null;
            }

            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(frame);
            hapticStop();
            if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
            if (pendingSendRef.current) clearTimeout(pendingSendRef.current);
        };
    }, [spawnHearts]);

    // Envío con throttle (y un envío final para no perder la última posición)
    const sendTouch = () => {
        if (!socket || !conversationId) return;
        const elapsed = performance.now() - lastSentRef.current;

        const emitLatest = () => {
            pendingSendRef.current = null;
            const point = myTouchRef.current;
            if (!point) return;
            lastSentRef.current = performance.now();
            socket.emit('fingerkiss_touch', { conversationId, x: point.x, y: point.y });
        };

        if (elapsed >= TOUCH_SEND_MS) {
            emitLatest();
        } else if (!pendingSendRef.current) {
            pendingSendRef.current = setTimeout(emitLatest, TOUCH_SEND_MS - elapsed);
        }
    };

    const toBoardPoint = (e: React.PointerEvent): TouchPoint | null => {
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) return null;
        return {
            x: clamp01((e.clientX - rect.left) / rect.width),
            y: clamp01((e.clientY - rect.top) / rect.height),
        };
    };

    const updateMyTouch = (point: TouchPoint | null) => {
        myTouchRef.current = point;
        setMyTouch(point);
        if (point) sendTouch();
    };

    // Un solo dedo: el primer pointer manda, los demás se ignoran
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (activePointerRef.current !== null) return;
        activePointerRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        unlockAudio();
        updateMyTouch(toBoardPoint(e));
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerId !== activePointerRef.current) return;
        updateMyTouch(toBoardPoint(e));
    };

    const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerId !== activePointerRef.current) return;
        activePointerRef.current = null;
        updateMyTouch(null);
        hapticStop();
        socket?.emit('fingerkiss_release', { conversationId });
    };

    const removeHeart = (id: number) => setHearts(prev => prev.filter(h => h.id !== id));

    const percent = Math.round(effectiveness * 100);
    const markerWidth = 2 * FINGER_RX * boardSize.width;
    const markerHeight = markerWidth * FINGER_RATIO;

    const renderMarker = (point: TouchPoint, colors: [string, string], label: string) => (
        <div
            className="absolute pointer-events-none transition-transform duration-150"
            style={{
                left: point.x * boardSize.width,
                top: point.y * boardSize.height,
                width: markerWidth,
                height: markerHeight,
                transform: `translate(-50%, -50%) scale(${1 + effectiveness * 0.08})`,
                filter: `drop-shadow(0 0 ${6 + effectiveness * 18}px ${colors[1]})`,
            }}
        >
            <FingerprintOval variant="marker" colors={colors} className="w-full h-full" title={label} />
        </div>
    );

    return (
        <div className="fixed inset-0 z-60 flex flex-col bg-zinc-950 text-white select-none overscroll-none [-webkit-touch-callout:none]">
            {/* HEADER */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
                <button onClick={() => navigate(-1)} className="p-2 active:opacity-50" aria-label="Salir">
                    <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    <img src={getAvatarSrc(partner?.avatarUrl)} className="w-8 h-8 rounded-full object-cover border border-zinc-700" alt="avatar" />
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm truncate flex items-center gap-1.5">
                            <FingerprintOval className="w-3.5 h-[18px] text-pink-400" />
                            Fingerkiss
                        </span>
                        <span className={`text-[11px] truncate ${isPeerPresent ? 'text-green-400' : 'text-zinc-400'}`}>
                            {isPeerPresent ? `${partnerName} está aquí` : isPartnerOnline ? `${partnerName} está en línea` : `${partnerName} no está en línea`}
                        </span>
                    </div>
                </div>
                {!supportsVibration ? (
                    <button
                        onClick={() => setIsSoundOn(prev => !prev)}
                        className="p-2 text-zinc-300 active:opacity-50"
                        aria-label={isSoundOn ? 'Silenciar' : 'Activar sonido'}
                    >
                        <FontAwesomeIcon icon={isSoundOn ? faVolumeHigh : faVolumeXmark} />
                    </button>
                ) : <div className="w-9" />}
            </div>

            {/* BARRA DE EFECTIVIDAD */}
            <div className="shrink-0 px-5 pb-3">
                <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Efectividad</span>
                    <span className="text-xs text-zinc-500">Récord {best}%</span>
                </div>
                <div className="relative h-3 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-pink-500 via-rose-500 to-red-500 transition-[width] duration-150 ease-out"
                        style={{ width: `${percent}%` }}
                    />
                    {/* Marca del 80 % (corazones) */}
                    <div className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${HEARTS_THRESHOLD * 100}%` }} />
                </div>
                <div className="text-center mt-2 text-3xl font-black tabular-nums">
                    {percent}%{percent >= HEARTS_THRESHOLD * 100 && ' ❤️'}
                </div>
            </div>

            {/* LIENZO */}
            <div ref={wrapperRef} className="flex-1 min-h-0 flex items-center justify-center px-4 pb-4">
                <div
                    ref={boardRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                    onContextMenu={(e) => e.preventDefault()}
                    className="relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-radial from-zinc-800 to-zinc-950 touch-none"
                    style={{
                        width: boardSize.width,
                        height: boardSize.height,
                        // El brillo del lienzo también es el feedback en celulares sin vibración
                        boxShadow: `0 0 ${effectiveness * 60}px ${effectiveness * 12}px rgba(244, 63, 94, ${0.15 + effectiveness * 0.5})`,
                    }}
                >
                    {!myTouch && !partnerTouch && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-500 pointer-events-none px-6 text-center">
                            <FingerprintOval className="w-14 h-[76px] text-zinc-600 animate-pulse" />
                            <p className="text-sm">
                                {isPeerPresent ? `Pon tu dedo en la pantalla y busca el de ${partnerName}` : 'Pon tu dedo en la pantalla'}
                            </p>
                        </div>
                    )}

                    {partnerTouch && renderMarker(partnerTouch, ['#f9a8d4', '#db2777'], `Dedo de ${partnerName}`)}
                    {myTouch && renderMarker(myTouch, ['#7dd3fc', '#2563eb'], 'Tu dedo')}

                    {hearts.map(heart => (
                        <span
                            key={heart.id}
                            onAnimationEnd={() => removeHeart(heart.id)}
                            className="absolute pointer-events-none fingerkiss-heart"
                            style={{
                                left: heart.x * boardSize.width,
                                top: heart.y * boardSize.height,
                                fontSize: heart.size,
                                '--fk-dx': `${heart.dx}px`,
                            } as React.CSSProperties}
                        >
                            ❤️
                        </span>
                    ))}

                    {isCelebrating && (
                        <div className="absolute inset-x-0 top-1/4 flex justify-center pointer-events-none">
                            <span className="px-4 py-2 rounded-full bg-black/60 backdrop-blur text-lg font-black animate-in zoom-in fade-in duration-300">
                                💋 ¡Fingerkiss perfecto!
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ESTADO */}
            <div className="shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-zinc-400 space-y-2">
                {!isPeerPresent && (
                    <div className="flex items-center justify-center gap-3">
                        <span>{wasDeclined ? `${partnerName} no puede ahora 💔` : `Esperando a ${partnerName}...`}</span>
                        <button onClick={sendInvite} className="flex items-center gap-1.5 text-pink-400 font-bold active:opacity-50">
                            <FontAwesomeIcon icon={faPaperPlane} />
                            Invitar
                        </button>
                    </div>
                )}
                {!supportsVibration && (
                    <p className="text-[11px] text-zinc-500">Tu celular no permite vibrar desde el navegador; usaremos sonido y brillo.</p>
                )}
            </div>
        </div>
    );
};

export default FingerkissRoom;
