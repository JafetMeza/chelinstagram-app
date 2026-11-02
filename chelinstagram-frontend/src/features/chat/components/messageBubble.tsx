import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faExclamationCircle, faReply } from '@fortawesome/free-solid-svg-icons';
import { Message } from "@/types/schema";
import { groupReactions } from "../lib/reactions";

export type LocalMessage = Message & { tempId?: string; failed?: boolean; };

const LONG_PRESS_MS = 450;
const DOUBLE_TAP_MS = 300;
const MOVE_TOLERANCE_PX = 10;
// Deslizar a la derecha: el movimiento visual es ligero (SWIPE_VISUAL_MAX_PX); la réplica se activa por distancia real (SWIPE_REPLY_PX)
const SWIPE_REPLY_PX = 48;
const SWIPE_VISUAL_MAX_PX = 8;

interface MessageBubbleProps {
    message: LocalMessage;
    isMine: boolean;
    currentUserId?: string;
    showSeen: boolean;
    isSelected: boolean;
    onOpenActions: (message: LocalMessage) => void;
    onDoubleTap: (message: LocalMessage) => void;
    onReply: (message: LocalMessage) => void;
}

const MessageBubble = ({ message, isMine, currentUserId, showSeen, isSelected, onOpenActions, onDoubleTap, onReply }: MessageBubbleProps) => {
    const [pressing, setPressing] = useState(false);
    const [swipeX, setSwipeX] = useState(0);
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressStart = useRef({ x: 0, y: 0 });
    const longPressed = useRef(false);
    const swiping = useRef(false);
    const swipeDistance = useRef(0);
    const lastTap = useRef(0);

    const isDeleted = !!message.deletedAt;
    // Mensajes pendientes, fallidos o eliminados no tienen acciones
    const isInteractive = !isDeleted && !message.tempId && !message.failed;
    const reactions = groupReactions(message.reactions, currentUserId);
    const createdAt = message.createdAt || new Date().toISOString();

    const clearPress = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = null;
        setPressing(false);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isInteractive) return;
        longPressed.current = false;
        swiping.current = false;
        pressStart.current = { x: e.clientX, y: e.clientY };
        clearPress();
        setPressing(true);
        pressTimer.current = setTimeout(() => {
            longPressed.current = true;
            navigator.vibrate?.(10);
            onOpenActions(message);
        }, LONG_PRESS_MS);
    };

    const cancelPress = () => {
        swipeDistance.current = 0;
        clearPress();
        swiping.current = false;
        setSwipeX(0);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const dx = e.clientX - pressStart.current.x;
        const dy = e.clientY - pressStart.current.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Movimiento vertical: es un scroll del chat, no un gesto de la burbuja
        if (!swiping.current && absY > MOVE_TOLERANCE_PX && absY > absX) {
            cancelPress();
            return;
        }
        // Arrastre horizontal hacia la derecha: gesto de réplica
        if (!swiping.current && dx > MOVE_TOLERANCE_PX && absX > absY && isInteractive) {
            swiping.current = true;
            clearPress();
        }
        if (swiping.current) {
            swipeDistance.current = Math.max(dx, 0);
            setSwipeX(Math.min(swipeDistance.current, SWIPE_VISUAL_MAX_PX));
            return;
        }
        if (absX > MOVE_TOLERANCE_PX || absY > MOVE_TOLERANCE_PX) clearPress();
    };

    const handlePointerUp = () => {
        clearPress();
        if (swiping.current) {
            const shouldReply = swipeDistance.current >= SWIPE_REPLY_PX;
            swipeDistance.current = 0;
            swiping.current = false;
            setSwipeX(0);
            if (shouldReply) {
                navigator.vibrate?.(10);
                onReply(message);
            }
            return;
        }
        if (!isInteractive || longPressed.current) return;

        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_MS) {
            lastTap.current = 0;
            onDoubleTap(message);
        } else {
            lastTap.current = now;
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isInteractive) onOpenActions(message);
    };

    return (
        <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={cancelPress}
                onPointerLeave={cancelPress}
                onContextMenu={handleContextMenu}
                style={{ transform: `translateX(${swipeX}px)`, touchAction: 'pan-y' }}
                className={`relative max-w-[75%] px-4 py-2 rounded-2xl select-none [-webkit-touch-callout:none] transition-transform ${swipeX === 0 ? 'duration-200' : 'duration-0'} ${isDeleted
                    ? 'bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    : isMine
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-bl-sm'
                    }`}
            >
                {/* Indicador de réplica: aparece a la izquierda conforme se desliza */}
                {swipeX > 0 && (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 -left-4 text-zinc-400"
                        style={{ opacity: Math.min(swipeX / SWIPE_VISUAL_MAX_PX, 1) }}
                    >
                        <FontAwesomeIcon icon={faReply} />
                    </span>
                )}

                {/* Capa de selección: aparece al mantener presionado y se queda mientras el menú está abierto */}
                <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 rounded-2xl bg-black/10 dark:bg-white/15 transition-opacity duration-150 ${pressing || isSelected ? 'opacity-100' : 'opacity-0'}`}
                />

                {message.replyTo && !isDeleted && (
                    <div className={`mb-1 rounded-lg border-l-4 px-2 py-1 text-xs ${isMine ? 'bg-white/15 border-white/70' : 'bg-black/5 dark:bg-white/10 border-blue-500'}`}>
                        <p className="font-bold truncate">
                            {message.replyTo.senderId === currentUserId ? 'Tú' : (message.replyTo.sender?.displayName || message.replyTo.sender?.username || '')}
                        </p>
                        <p className="truncate opacity-80">
                            {message.replyTo.deletedAt ? 'Mensaje eliminado' : message.replyTo.content}
                        </p>
                    </div>
                )}

                {isDeleted ? (
                    <p className="text-sm italic flex items-center gap-2">
                        <FontAwesomeIcon icon={faBan} className="text-xs" />
                        Mensaje eliminado
                    </p>
                ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                )}

                <div className="flex items-center justify-end gap-1 mt-1 float-right ml-3 opacity-60">
                    {message.editedAt && !isDeleted && (
                        <span className="text-[10px] italic">editado</span>
                    )}
                    <span className="text-[10px]">
                        {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.failed && (
                        <FontAwesomeIcon icon={faExclamationCircle} className="text-red-300 text-[10px]" title="Error al enviar" />
                    )}
                </div>
            </div>

            {reactions.length > 0 && (
                <button
                    type="button"
                    onClick={() => isInteractive && onOpenActions(message)}
                    className={`-mt-2 ${isMine ? 'mr-2' : 'ml-2'} relative z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-900 border dark:border-zinc-700 shadow-sm text-xs`}
                >
                    {reactions.map(r => (
                        <span key={r.type} className={r.mine ? 'drop-shadow' : 'opacity-90'}>{r.emoji}</span>
                    ))}
                    {(message.reactions?.length ?? 0) > 1 && (
                        <span className="text-[10px] text-zinc-500 ml-0.5">{message.reactions?.length}</span>
                    )}
                </button>
            )}

            {showSeen && (
                <span className="text-[10px] text-zinc-400 mt-1 mr-1">Visto</span>
            )}
        </div>
    );
};

export default MessageBubble;
