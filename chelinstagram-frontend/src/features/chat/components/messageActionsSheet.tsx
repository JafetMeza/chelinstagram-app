import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { REACTIONS, ReactionType } from "../lib/reactions";
import { LocalMessage } from "./messageBubble";

interface MessageActionsSheetProps {
    message: LocalMessage;
    isMine: boolean;
    currentUserId?: string;
    onReact: (type: ReactionType) => void;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
}

// Hoja de acciones de un mensaje: barra de reacciones + copiar/editar/eliminar
const MessageActionsSheet = ({ message, isMine, currentUserId, onReact, onEdit, onDelete, onClose }: MessageActionsSheetProps) => {
    const myReaction = message.reactions?.find(r => r.userId === currentUserId)?.type;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content ?? '');
        } catch (error) {
            console.error('No se pudo copiar el mensaje:', error);
        }
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-100 flex items-end lg:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm m-3 flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Reacciones */}
                <div className={`flex gap-1 self-center max-w-full overflow-x-auto bg-white dark:bg-zinc-900 rounded-full px-3 py-2 shadow-2xl border dark:border-zinc-800`}>
                    {REACTIONS.map(r => (
                        <button
                            key={r.type}
                            type="button"
                            title={r.label}
                            onClick={() => onReact(r.type)}
                            className={`text-2xl w-11 h-11 flex items-center justify-center rounded-full transition-transform active:scale-125 hover:scale-110 ${myReaction === r.type ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}
                        >
                            {r.emoji}
                        </button>
                    ))}
                </div>

                {/* Vista previa del mensaje */}
                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${isMine ? 'self-end bg-blue-500 text-white' : 'self-start bg-white dark:bg-zinc-800 text-black dark:text-white'}`}>
                    {message.content}
                </div>

                {/* Acciones */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border dark:border-zinc-800 text-black dark:text-white">
                    <button type="button" onClick={handleCopy} className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        Copiar
                        <FontAwesomeIcon icon={faCopy} className="text-zinc-400" />
                    </button>
                    {isMine && (
                        <>
                            <button type="button" onClick={onEdit} className="w-full flex items-center justify-between px-4 py-3 text-sm border-t dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                Editar
                                <FontAwesomeIcon icon={faPen} className="text-zinc-400" />
                            </button>
                            <button type="button" onClick={onDelete} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-red-500 border-t dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20">
                                Eliminar
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageActionsSheet;
