import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi } from "@/redux/middleware/httpMethod.mid";
import { GetMessagesApi } from "@/service/api.service";
import { Message } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faPaperPlane, faInfoCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { getAvatarSrc } from "@/helpers/imageUtils";
import { ROUTES } from "@/routes";

// 1. Extraer el onlineUsers global del SocketContext
import { useSocket } from '@/components/context/socketContext';

// Extendemos el tipo local para poder trackear el tempId y el estado "failed"
// sin tocar el schema global (que refleja lo que realmente vive en la BD).
type LocalMessage = Message & { tempId?: string; failed?: boolean; };

const ChatRoom = () => {
    const { conversationId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const scrollRef = useRef<HTMLDivElement>(null);

    // 🟢 FIX (bug 3): si no venimos de ChatList (refresh, link directo), location.state
    // no existe. Derivamos partner del propio historial de mensajes en cuanto llega.
    const [partner, setPartner] = useState(location.state?.partner ?? null);

    const { user: currentUser } = useAppSelector(state => state.authData);
    const { ok, data, apiMethod } = useAppSelector(state => state.apiData);

    // 2. Extraer socket y el arreglo global onlineUsers
    const { socket, onlineUsers } = useSocket();

    const [messages, setMessages] = useState<LocalMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");

    // 3. Validar si la pareja está en línea usando el estado global (¡Adiós bugs de desconexión!)
    const isPartnerOnline = partner?.id ? onlineUsers.includes(partner.id) : false;

    // --- TYPING INDICATOR ---
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // debounce de NUESTRO "stop_typing"
    const partnerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // watchdog por si se pierde el "user_stop_typing"

    // Fetch inicial del historial
    useEffect(() => {
        if (conversationId) {
            dispatch(GetApi([conversationId], GetMessagesApi));
        }
    }, [dispatch, conversationId]);

    // Cargar historial en el estado
    useEffect(() => {
        if (ok && apiMethod === GetMessagesApi.name) {
            const fetchedMessages = data as LocalMessage[];
            const onSetMessages = () => {
                setMessages(fetchedMessages);
            };
            onSetMessages();

            // 🟢 FIX (bug 3): si no teníamos partner (refresh / link directo),
            // lo derivamos del primer mensaje que no sea nuestro.
            if (!partner) {
                const otherMessage = fetchedMessages.find(m => m.senderId !== currentUser?.id);
                if (otherMessage?.sender) {
                    const onSetPartner = () => {
                        setPartner(otherMessage.sender);
                    };
                    onSetPartner();
                }
            }
        }
    }, [ok, data, apiMethod]);

    // 4. LISTENERS EXCLUSIVOS DE MENSAJERÍA
    useEffect(() => {
        if (!socket || !conversationId) return;

        // Recibir un mensaje nuevo en tiempo real
        const handleReceiveMessage = (incomingMessage: LocalMessage) => {
            if (incomingMessage.conversationId === conversationId) {
                setMessages(prev => {
                    // Evitar duplicados si ya existe
                    if (prev.some(m => m.id === incomingMessage.id)) return prev;
                    return [...prev, incomingMessage];
                });
            }
        };

        // Confirmación de que nuestro mensaje se guardó en BD
        // 🟢 FIX (bug 2): matcheamos por tempId (exacto), no por content (ambiguo
        // si mandas el mismo texto dos veces seguidas).
        const handleMessageSent = (savedMessage: LocalMessage) => {
            if (savedMessage.conversationId === conversationId) {
                setMessages(prev => prev.map(msg =>
                    msg.tempId && msg.tempId === savedMessage.tempId
                        ? savedMessage
                        : msg
                ));
            }
        };

        // 🟢 FIX (bug 1): antes este evento se emitía desde el backend pero nadie
        // lo escuchaba. Ahora marcamos el mensaje temp como fallido en vez de
        // dejarlo colgado indefinidamente como si se hubiera enviado.
        const handleMessageError = (payload: { tempId?: string; error: string; }) => {
            console.error("Error al enviar mensaje:", payload.error);
            if (payload.tempId) {
                setMessages(prev => prev.map(msg =>
                    msg.tempId === payload.tempId
                        ? { ...msg, failed: true }
                        : msg
                ));
            }
        };

        // Indicador de "escribiendo..." — solo nos importa si es de esta conversación
        // y de nuestra pareja actual (por si el evento llegara tarde de otro chat).
        const handleUserTyping = (payload: { conversationId: string; userId: string; }) => {
            if (payload.conversationId !== conversationId || payload.userId !== partner?.id) return;

            setIsPartnerTyping(true);

            // Watchdog: si por lo que sea nunca llega "user_stop_typing" (el otro cierra
            // la app, se cae la conexión, etc.), lo apagamos solos después de 3s de silencio.
            if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
            partnerTypingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 3000);
        };

        const handleUserStopTyping = (payload: { conversationId: string; userId: string; }) => {
            if (payload.conversationId !== conversationId || payload.userId !== partner?.id) return;
            if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
            setIsPartnerTyping(false);
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('message_sent', handleMessageSent);
        socket.on('message_error', handleMessageError);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stop_typing', handleUserStopTyping);

        // Limpieza de eventos al salir de la sala
        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('message_sent', handleMessageSent);
            socket.off('message_error', handleMessageError);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stop_typing', handleUserStopTyping);
            if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
        };
    }, [socket, conversationId, partner?.id]);

    // Auto-scroll
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Emitimos "typing" en cada tecla, pero con debounce: si el usuario deja de
    // teclear 1.5s, mandamos "stop_typing" automáticamente. Así no saturamos el
    // socket con un evento por cada letra.
    const handleTyping = (value: string) => {
        setNewMessage(value);

        if (!socket || !partner?.id || !conversationId) return;

        socket.emit('typing', { conversationId, receiverId: partner.id });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { conversationId, receiverId: partner.id });
        }, 1500);
    };

    // 5. ENVIAR MENSAJE POR SOCKET
    const handleSend = () => {
        if (!newMessage.trim() || !socket || !partner?.id || !conversationId) return;

        // Al enviar, cortamos el debounce pendiente y avisamos "stop_typing" ya mismo
        // (si no, el partner seguiría viendo "escribiendo..." hasta que expire el timeout).
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('stop_typing', { conversationId, receiverId: partner.id });

        const contentCopy = newMessage;
        setNewMessage(""); // Limpiamos input de inmediato para mejor UX

        // 🟢 FIX (bug 2): generamos un tempId único, independiente del contenido,
        // para poder reconciliar la confirmación del servidor sin ambigüedad.
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // Emitimos al servidor (incluye tempId para que el backend lo reenvíe en el ack)
        socket.emit('send_message', {
            receiverId: partner.id,
            conversationId: conversationId,
            content: contentCopy,
            tempId,
        });

        // Actualización optimista en UI
        const tempMessage: LocalMessage = {
            id: tempId,
            tempId,
            content: contentCopy,
            conversationId: conversationId,
            senderId: currentUser?.id ?? "",
            createdAt: new Date().toISOString()
        } as LocalMessage;

        setMessages(prev => [...prev, tempMessage]);
    };

    return (
        <div className="fixed top-14 lg:top-0 bottom-0 left-0 right-0 lg:left-20 xl:left-64 flex flex-col bg-white dark:bg-black text-black dark:text-white z-20 overflow-hidden">
            <div className="shrink-0 flex items-center justify-between p-3 border-b dark:border-zinc-800 bg-white dark:bg-black z-30">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1 active:opacity-50">
                        <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
                    </button>
                    <div className="flex items-center gap-2">
                        <img
                            src={getAvatarSrc(partner?.avatarUrl)}
                            className="w-8 h-8 rounded-full object-cover border dark:border-zinc-800"
                        />
                        <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight leading-none">
                                {partner?.displayName || partner?.username}
                            </span>
                            {/* INDICADOR: "escribiendo..." tiene prioridad sobre online/offline */}
                            {isPartnerTyping ? (
                                <span className="text-xs text-blue-500 font-medium mt-1 animate-pulse">
                                    escribiendo...
                                </span>
                            ) : isPartnerOnline ? (
                                <span className="text-xs text-green-500 font-medium flex items-center gap-1 mt-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    En línea
                                </span>
                            ) : (
                                <span className="text-xs text-zinc-400 mt-1">Desconectada</span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => partner?.username && navigate(ROUTES.PROFILE(partner.username))}
                    className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors active:opacity-50"
                    title="View Profile"
                >
                    <FontAwesomeIcon icon={faInfoCircle} className="text-xl" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages?.map((msg: LocalMessage) => {
                    const isMe = msg.senderId === currentUser?.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed flex items-center gap-2 ${isMe
                                ? (msg.failed ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-br-none' : 'bg-blue-500 text-white rounded-br-none shadow-sm')
                                : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-bl-none shadow-sm'
                                }`}>
                                {msg.failed && <FontAwesomeIcon icon={faExclamationCircle} className="text-xs" title="No se pudo enviar" />}
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} className="h-2" />
            </div>

            <div className="shrink-0 p-3 pb-20 lg:pb-4 border-t dark:border-zinc-800 bg-white dark:bg-black">
                <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2 border dark:border-zinc-800">
                    <input
                        type="text"
                        placeholder="Message..."
                        className="flex-1 bg-transparent outline-none text-sm py-1"
                        value={newMessage}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="text-blue-500 font-bold text-sm disabled:opacity-30 transition-opacity"
                    >
                        <FontAwesomeIcon icon={faPaperPlane} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;