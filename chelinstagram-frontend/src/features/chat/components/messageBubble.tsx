import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { Message } from "@/types/schema";
import { groupReactions } from "../lib/reactions";

export type LocalMessage = Message & { tempId?: string; failed?: boolean; };

const LONG_PRESS_MS = 450;
const DOUBLE_TAP_MS = 300;
const MOVE_TOLERANCE_PX = 10;

interface MessageBubbleProps {
    message: LocalMessage;
    isMine: boolean;
    currentUserId?: string;
    showSeen: boolean;
    onOpenActions: (message: LocalMessage) => void;
    onDoubleTap: (message: LocalMessage) => void;
}

const MessageBubble = ({ message, isMine, currentUserId, showSeen, onOpenActions, onDoubleTap }: MessageBubbleProps) => {
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressStart = useRef({ x: 0, y: 0 });
    const longPressed = useRef(false);
    const lastTap = useRef(0);

    const isDeleted = !!message.deletedAt;
    // Mensajes pendientes, fallidos o eliminados no tienen acciones
    const isInteractive = !isDeleted && !message.tempId && !message.failed;
    const reactions = groupReactions(message.reactions, currentUserId);
    const createdAt = message.createdAt || new Date().toISOString();

    const clearPress = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = null;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isInteractive) return;
        longPressed.current = false;
        pressStart.current = { x: e.clientX, y: e.clientY };
        clearPress();
        pressTimer.current = setTimeout(() => {
            longPressed.current = true;
            navigator.vibrate?.(10);
            onOpenActions(message);
        }, LONG_PRESS_MS);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const dx = Math.abs(e.clientX - pressStart.current.x);
        const dy = Math.abs(e.clientY - pressStart.current.y);
        if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) clearPress();
    };

    const handlePointerUp = () => {
        clearPress();
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
                onPointerCancel={clearPress}
                onPointerLeave={clearPress}
                onContextMenu={handleContextMenu}
                className={`relative max-w-[75%] px-4 py-2 rounded-2xl select-none [-webkit-touch-callout:none] ${isDeleted
                    ? 'bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    : isMine
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-bl-sm'
                    }`}
            >
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
