import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi } from "@/redux/middleware/httpMethod.mid";
import { GetConversationsApi, GetMessagesApi } from "@/service/api.service";
import { Conversation, MessagesPage } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faPaperPlane, faInfoCircle, faPen, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';
import { getAvatarSrc } from "@/helpers/imageUtils";
import { ROUTES } from "@/routes";
import { useSocket } from '@/components/context/socketContext';
import { formatChatDate } from "../lib/chatHelper";
import { ReactionType, toggleReaction } from "../lib/reactions";
import MessageBubble, { LocalMessage } from "../components/messageBubble";
import MessageActionsSheet from "../components/messageActionsSheet";
import FingerprintOval from "@/features/fingerkiss/components/fingerprintOval";

const PAGE_SIZE = 30;
const NEAR_BOTTOM_PX = 120;

const ChatRoom = () => {
    const { conversationId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

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

    // --- PAGINACIÓN ---
    const containerRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const loadingOlderRef = useRef(false);
    const handledDataRef = useRef<unknown>(null);
    const scrollRestoreRef = useRef<{ height: number; top: number; } | null>(null);
    const lastMessageIdRef = useRef<string | undefined>(undefined);
    const isNearBottomRef = useRef(true);

    // --- ACCIONES SOBRE MENSAJES ---
    const [readReceipts, setReadReceipts] = useState(false);
    const [actionTarget, setActionTarget] = useState<LocalMessage | null>(null);
    const [editing, setEditing] = useState<LocalMessage | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<LocalMessage | null>(null);
    // Copia del mensaje antes de un cambio optimista, para revertir si el servidor falla
    const pendingActionsRef = useRef<Record<string, LocalMessage>>({});

    // Fetch inicial: la página más reciente
    useEffect(() => {
        if (conversationId) {
            dispatch(GetApi([conversationId, `limit=${PAGE_SIZE}`], GetMessagesApi));
        }
    }, [dispatch, conversationId]);

    // Cargar historial en el estado
    useEffect(() => {
        if (!ok && apiMethod === GetMessagesApi.name) {
            loadingOlderRef.current = false;
            const onFail = () => setIsLoadingOlder(false);
            onFail();
            return;
        }
        // Cada respuesta se procesa una sola vez aunque cambien otras dependencias
        if (!ok || handledDataRef.current === data) return;

        if (apiMethod === GetMessagesApi.name) {
            handledDataRef.current = data;
            const page = data as MessagesPage;
            const fetchedMessages = (page.data ?? []) as LocalMessage[];
            const isFirstPage = !page.meta?.cursor;

            const onSetMessages = () => {
                if (isFirstPage) {
                    // Conservamos lo que llegó por socket mientras cargaba
                    const fetchedIds = new Set(fetchedMessages.map(m => m.id));
                    setMessages(prev => [...fetchedMessages, ...prev.filter(m => !fetchedIds.has(m.id))]);
                } else {
                    // Mensajes viejos arriba: guardamos el scroll para no saltar
                    const el = containerRef.current;
                    if (el) scrollRestoreRef.current = { height: el.scrollHeight, top: el.scrollTop };
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        return [...fetchedMessages.filter(m => !existingIds.has(m.id)), ...prev];
                    });
                }
                setHasMore(!!page.meta?.hasMore);
                setNextCursor(page.meta?.nextCursor ?? null);
                setReadReceipts(!!page.meta?.readReceipts);
                setIsLoadingOlder(false);
            };
            onSetMessages();
            loadingOlderRef.current = false;

            if (!partner) {
                // 🟢 FIX 2: Uso seguro de optional chaining para currentUser
                const otherMessage = fetchedMessages.find(m => m.senderId !== currentUser?.id);
                if (otherMessage?.sender) {
                    const onSetPartner = () => {
                        setPartner(otherMessage.sender);
                    };
                    onSetPartner();
                } else if (isFirstPage) {
                    // El otro usuario aún no ha escrito (URL directa, recarga o push):
                    // lo obtenemos de los participantes de la conversación
                    dispatch(GetApi([], GetConversationsApi));
                }
            }
        }

        if (apiMethod === GetConversationsApi.name && !partner) {
            handledDataRef.current = data;
            const conversation = (data as Conversation[]).find(c => c.id === conversationId);
            const partnerUser = conversation?.participants?.find(p => p.userId !== currentUser?.id)?.user;
            if (partnerUser) {
                const onSetPartner = () => {
                    setPartner(partnerUser);
                };
                onSetPartner();
            }
        }
    }, [ok, data, apiMethod, currentUser?.id, partner, conversationId, dispatch]);

    // Cargar mensajes anteriores al llegar al tope
    useEffect(() => {
        const root = containerRef.current;
        const target = topSentinelRef.current;
        if (!root || !target || !hasMore || !nextCursor || !conversationId) return;

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !loadingOlderRef.current) {
                loadingOlderRef.current = true;
                setIsLoadingOlder(true);
                dispatch(GetApi([conversationId, `limit=${PAGE_SIZE}&cursor=${nextCursor}`], GetMessagesApi));
            }
        }, { root, rootMargin: '150px 0px 0px 0px' });

        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, nextCursor, conversationId, dispatch]);

    const markRead = useCallback(() => {
        if (socket && conversationId && document.visibilityState === 'visible') {
            socket.emit('mark_read', { conversationId });
        }
    }, [socket, conversationId]);

    // Al volver a la pestaña marcamos como leído lo que llegó mientras tanto
    useEffect(() => {
        document.addEventListener('visibilitychange', markRead);
        return () => document.removeEventListener('visibilitychange', markRead);
    }, [markRead]);

    useEffect(() => {
        if (!socket || !conversationId) return;

        const handleReceiveMessage = (incomingMessage: LocalMessage) => {
            if (incomingMessage.conversationId === conversationId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === incomingMessage.id)) return prev;
                    return [...prev, incomingMessage];
                });
                if (incomingMessage.senderId !== currentUser?.id) markRead();
            }
        };

        const handleMessageSent = (savedMessage: LocalMessage) => {
            if (savedMessage.conversationId === conversationId) {
                setMessages(prev => prev.map(msg =>
                    msg.tempId && msg.tempId === savedMessage.tempId
                        ? { ...savedMessage, tempId: undefined }
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

        // Edición, borrado y reacciones (de cualquier dispositivo)
        const handleMessageUpdated = (updated: LocalMessage) => {
            if (updated.conversationId !== conversationId || !updated.id) return;
            delete pendingActionsRef.current[updated.id];
            setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        };

        const handleActionError = (payload: { messageId?: string; error: string; }) => {
            console.error("Error en acción de mensaje:", payload.error);
            const snapshot = payload.messageId ? pendingActionsRef.current[payload.messageId] : undefined;
            if (snapshot?.id) {
                delete pendingActionsRef.current[snapshot.id];
                setMessages(prev => prev.map(m => m.id === snapshot.id ? snapshot : m));
            }
        };

        const handleMessagesRead = (payload: { conversationId: string; readerId: string; }) => {
            if (payload.conversationId !== conversationId || payload.readerId === currentUser?.id) return;
            setReadReceipts(true);
            setMessages(prev => prev.map(m => m.senderId === currentUser?.id ? { ...m, isRead: true } : m));
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
        socket.on('message_updated', handleMessageUpdated);
        socket.on('message_action_error', handleActionError);
        socket.on('messages_read', handleMessagesRead);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stop_typing', handleUserStopTyping);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('message_sent', handleMessageSent);
            socket.off('message_error', handleMessageError);
            socket.off('message_updated', handleMessageUpdated);
            socket.off('message_action_error', handleActionError);
            socket.off('messages_read', handleMessagesRead);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stop_typing', handleUserStopTyping);
            if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
        };
    }, [socket, conversationId, partner?.id, currentUser?.id, markRead]);

    // Scroll: restaurar al cargar anteriores; ir al fondo solo con mensajes nuevos
    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const lastMessage = messages[messages.length - 1];

        if (scrollRestoreRef.current) {
            el.scrollTop = el.scrollHeight - scrollRestoreRef.current.height + scrollRestoreRef.current.top;
            scrollRestoreRef.current = null;
            lastMessageIdRef.current = lastMessage?.id;
            return;
        }

        if (lastMessage?.id && lastMessage.id !== lastMessageIdRef.current) {
            const isInitial = lastMessageIdRef.current === undefined;
            lastMessageIdRef.current = lastMessage.id;
            // No arrastramos al usuario si está leyendo mensajes viejos
            if (isInitial || isNearBottomRef.current || lastMessage.senderId === currentUser?.id) {
                el.scrollTo({ top: el.scrollHeight, behavior: isInitial ? 'auto' : 'smooth' });
            }
        }
    }, [messages, currentUser?.id]);

    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    };

    const resizeTextarea = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

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

        if (!editing) handleTyping(val);
        resizeTextarea();
    };

    // Cambio optimista; el servidor confirma con `message_updated`
    const applyOptimistic = (target: LocalMessage, changes: Partial<LocalMessage>) => {
        if (!target.id) return;
        const targetId = target.id;
        if (!pendingActionsRef.current[targetId]) pendingActionsRef.current[targetId] = target;
        setMessages(prev => prev.map(m => m.id === targetId ? { ...m, ...changes } : m));
    };

    const handleReact = (target: LocalMessage, type: ReactionType) => {
        if (!socket || !target.id || !currentUser?.id) return;
        applyOptimistic(target, { reactions: toggleReaction(target.reactions, currentUser.id, type) });
        socket.emit('react_message', { messageId: target.id, type });
        setActionTarget(null);
    };

    const startEdit = (target: LocalMessage) => {
        setActionTarget(null);
        setEditing(target);
        setText(target.content ?? '');
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
            resizeTextarea();
        });
    };

    const cancelEdit = () => {
        setEditing(null);
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const confirmDelete = () => {
        if (!socket || !deleteTarget?.id) return;
        applyOptimistic(deleteTarget, { deletedAt: new Date().toISOString(), content: '', reactions: [] });
        socket.emit('delete_message', { messageId: deleteTarget.id });
        if (editing?.id === deleteTarget.id) cancelEdit();
        setDeleteTarget(null);
    };

    const handleSend = () => {
        if (!text.trim() || !socket || !conversationId) return;

        if (editing) {
            if (editing.id && text !== editing.content) {
                applyOptimistic(editing, { content: text, editedAt: new Date().toISOString() });
                socket.emit('edit_message', { messageId: editing.id, content: text });
            }
            cancelEdit();
            textareaRef.current?.focus();
            return;
        }

        if (!partner?.id) return;

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
            createdAt: new Date().toISOString(),
            reactions: []
        };

        setMessages(prev => [...prev, tempMessage]);
        // En móvil mantenemos el teclado abierto
        textareaRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === 'Escape' && editing) {
            e.preventDefault();
            cancelEdit();
        }
    };

    // "Visto" solo debajo de mi último mensaje confirmado
    let lastOwnIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].senderId === currentUser?.id && !messages[i].tempId) {
            lastOwnIndex = i;
            break;
        }
    }

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
                <div className="flex items-center">
                    <button
                        onClick={() => conversationId && navigate(ROUTES.FINGERKISS(conversationId), { state: { partner, invite: true } })}
                        className="p-2 text-pink-500 hover:text-pink-400 transition-colors active:opacity-50"
                        title="Fingerkiss"
                        aria-label="Fingerkiss"
                    >
                        <FingerprintOval className="w-[18px] h-6" />
                    </button>
                    <button
                        onClick={() => partner?.username && navigate(ROUTES.PROFILE(partner.username))}
                        className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors active:opacity-50"
                        title="View Profile"
                    >
                        <FontAwesomeIcon icon={faInfoCircle} className="text-xl" />
                    </button>
                </div>
            </div>

            <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4">
                <div ref={topSentinelRef} className="h-1" />

                {isLoadingOlder && (
                    <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-300 border-t-transparent"></div>
                    </div>
                )}

                {!hasMore && messages.length > 0 && (
                    <p className="text-center text-[11px] text-zinc-400 py-2">Inicio de la conversación</p>
                )}

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

                            <MessageBubble
                                message={msg}
                                isMine={isMine}
                                currentUserId={currentUser?.id}
                                showSeen={readReceipts && index === lastOwnIndex && !!msg.isRead && !msg.deletedAt}
                                onOpenActions={setActionTarget}
                                onDoubleTap={(target) => handleReact(target, 'heart')}
                            />
                        </React.Fragment>
                    );
                })}
                <div className="h-2" />
            </div>

            <div className="shrink-0 p-3 pb-20 lg:pb-4 border-t dark:border-zinc-800 bg-white dark:bg-black">
                {editing && (
                    <div className="flex items-center justify-between px-2 pb-2 text-xs">
                        <span className="flex items-center gap-2 text-blue-500 font-bold min-w-0">
                            <FontAwesomeIcon icon={faPen} />
                            <span className="truncate">Editando: <span className="font-normal text-zinc-500">{editing.content}</span></span>
                        </span>
                        <button type="button" onClick={cancelEdit} className="p-1 text-zinc-400 hover:text-black dark:hover:text-white">
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                )}
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
                        // Evitamos que el botón robe el foco y cierre el teclado en móvil
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        onClick={handleSend}
                        disabled={!text.trim()}
                        className="text-blue-500 font-bold text-sm mb-1 disabled:opacity-30 transition-opacity"
                    >
                        <FontAwesomeIcon icon={editing ? faCheck : faPaperPlane} />
                    </button>
                </div>
            </div>

            {actionTarget && (
                <MessageActionsSheet
                    message={actionTarget}
                    isMine={actionTarget.senderId === currentUser?.id}
                    currentUserId={currentUser?.id}
                    onReact={(type) => handleReact(actionTarget, type)}
                    onEdit={() => startEdit(actionTarget)}
                    onDelete={() => {
                        setDeleteTarget(actionTarget);
                        setActionTarget(null);
                    }}
                    onClose={() => setActionTarget(null)}
                />
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteTarget && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <h3 className="text-lg font-bold mb-2">¿Eliminar mensaje?</h3>
                            <p className="text-sm text-zinc-500">Se eliminará para ambos.</p>
                        </div>
                        <div className="flex border-t dark:border-zinc-800">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-l dark:border-zinc-800"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatRoom;
