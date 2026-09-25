import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi } from "@/redux/middleware/httpMethod.mid";
import { GetMessagesApi } from "@/service/api.service";
import { Message } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faPaperPlane, faInfoCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { getAvatarSrc } from "@/helpers/imageUtils";
import { ROUTES } from "@/routes";
import { useSocket } from '@/components/context/socketContext';
import { formatChatDate } from "../lib/chatHelper";

type LocalMessage = Message & { tempId?: string; failed?: boolean; };

const ChatRoom = () => {
    const { conversationId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const scrollRef = useRef<HTMLDivElement>(null);

    const [partner, setPartner] = useState(location.state?.partner ?? null);

    const { user: currentUser } = useAppSelector(state => state.authData);
    const { ok, data, apiMethod } = useAppSelector(state => state.apiData);

    const { socket, onlineUsers } = useSocket();

    const [messages, setMessages] = useState<LocalMessage[]>([]);

    // 🟢 FIX 1: Unificamos el estado del input en uno solo
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isPartnerOnline = partner?.id ? onlineUsers.includes(partner.id) : false;

    // --- TYPING INDICATOR ---
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const partnerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

            if (!partner) {
                // 🟢 FIX 2: Uso seguro de optional chaining para currentUser
                const otherMessage = fetchedMessages.find(m => m.senderId !== currentUser?.id);
                if (otherMessage?.sender) {
                    const onSetPartner = () => {
                        setPartner(otherMessage.sender);
                    };
                    onSetPartner();
                }
            }
        }
    }, [ok, data, apiMethod, currentUser?.id, partner]);

    useEffect(() => {
        if (!socket || !conversationId) return;

        const handleReceiveMessage = (incomingMessage: LocalMessage) => {
            if (incomingMessage.conversationId === conversationId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === incomingMessage.id)) return prev;
                    return [...prev, incomingMessage];
                });
            }
        };

        const handleMessageSent = (savedMessage: LocalMessage) => {
            if (savedMessage.conversationId === conversationId) {
                setMessages(prev => prev.map(msg =>
                    msg.tempId && msg.tempId === savedMessage.tempId
                        ? savedMessage
                        : msg
                ));
            }
        };

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

        const handleUserTyping = (payload: { conversationId: string; userId: string; }) => {
            if (payload.conversationId !== conversationId || payload.userId !== partner?.id) return;
            setIsPartnerTyping(true);
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

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('message_sent', handleMessageSent);
            socket.off('message_error', handleMessageError);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stop_typing', handleUserStopTyping);
            if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
        };
    }, [socket, conversationId, partner?.id]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleTyping = (val: string) => {
        if (!socket || !partner?.id || !conversationId) return;

        // 🟢 NUEVO: Si el usuario borra todo el texto, apagamos el "escribiendo..." de inmediato
        if (val.trim() === '') {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            socket.emit('stop_typing', { conversationId, receiverId: partner.id });
            return;
        }

        // 🟢 Restaurado: Emitimos que estamos escribiendo
        socket.emit('typing', { conversationId, receiverId: partner.id });

        // Mantenemos el debounce de 1.5 segundos para no saturar el servidor
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { conversationId, receiverId: partner.id });
        }, 1500);
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setText(val);

        // 🟢 Restaurado: Llamamos a handleTyping pasándole el valor actual
        handleTyping(val);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleSend = () => {
        if (!text.trim() || !socket || !partner?.id || !conversationId) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('stop_typing', { conversationId, receiverId: partner.id });

        const contentCopy = text;

        // Limpiamos el input y restauramos el tamaño
        setText("");
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        socket.emit('send_message', {
            receiverId: partner.id,
            conversationId: conversationId,
            content: contentCopy,
            tempId,
        });

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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
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
                            alt="avatar"
                        />
                        <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight leading-none">
                                {partner?.displayName || partner?.username}
                            </span>
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
                {messages.map((msg, index) => {
                    // 1. Fecha del mensaje actual
                    const safeDateString = msg?.createdAt || new Date().toISOString();
                    const msgDate = new Date(safeDateString).toDateString();

                    // 2. Comparamos con el mensaje anterior en el arreglo
                    let showDateHeader = false;
                    if (index === 0) {
                        // El primer mensaje siempre muestra fecha
                        showDateHeader = true;
                    } else {
                        // Verificamos la fecha del mensaje anterior
                        const prevMsg = messages[index - 1];
                        const prevSafeDate = prevMsg?.createdAt || new Date().toISOString();
                        const prevMsgDate = new Date(prevSafeDate).toDateString();

                        showDateHeader = msgDate !== prevMsgDate;
                    }

                    const isMine = msg.senderId === currentUser?.id;

                    return (
                        <React.Fragment key={msg.id || msg.tempId}>
                            {showDateHeader && (
                                <div className="flex justify-center my-3">
                                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[11px] font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                                        {formatChatDate(safeDateString)}
                                    </span>
                                </div>
                            )}

                            <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`relative max-w-[75%] px-4 py-2 rounded-2xl ${isMine
                                    ? 'bg-blue-500 text-white rounded-br-sm'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-bl-sm'
                                    }`}>

                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                                    <div className="flex items-center justify-end gap-1 mt-1 float-right ml-3 opacity-60">
                                        <span className="text-[10px]">
                                            {new Date(safeDateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.failed && (
                                            <FontAwesomeIcon icon={faExclamationCircle} className="text-red-300 text-[10px]" title="Error al enviar" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={scrollRef} className="h-2" />
            </div>

            <div className="shrink-0 p-3 pb-20 lg:pb-4 border-t dark:border-zinc-800 bg-white dark:bg-black">
                <div className="flex items-end gap-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl px-4 py-2 border dark:border-zinc-800">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Message..."
                        rows={1}
                        className="flex-1 max-h-32 resize-none overflow-y-auto bg-transparent text-black dark:text-white py-1 outline-none text-sm"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!text.trim()}
                        className="text-blue-500 font-bold text-sm mb-1 disabled:opacity-30 transition-opacity"
                    >
                        <FontAwesomeIcon icon={faPaperPlane} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;