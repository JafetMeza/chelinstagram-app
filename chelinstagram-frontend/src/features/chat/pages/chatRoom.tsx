import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import { GetMessagesApi, SendMessageApi } from "@/service/api.service";
import { Message, SendMessageRequest } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faPaperPlane, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { getAvatarSrc } from "@/helpers/imageUtils";

const ChatRoom = () => {
    const { conversationId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Get the partner from the router state
    const partner = location.state?.partner;

    const { user: currentUser } = useAppSelector(state => state.authData);
    const { ok, data, apiMethod } = useAppSelector(state => state.apiData);

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");

    // 1. Fetch the specific conversation
    useEffect(() => {
        if (conversationId) {
            dispatch(GetApi([conversationId], GetMessagesApi));
        }
    }, [dispatch, conversationId]);

    // 2. Handle Data & Auto-scroll
    useEffect(() => {
        if (ok && apiMethod === GetMessagesApi.name) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMessages(data as Message[]);
        }
        if (ok && apiMethod === SendMessageApi.name) {
            // Re-fetch or manually push to list to show sent message
            dispatch(GetApi([conversationId ?? ""], GetMessagesApi));
            setNewMessage("");
        }
    }, [ok, data, apiMethod, dispatch, conversationId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (!newMessage.trim()) return;
        const messageRequest: SendMessageRequest = {
            conversationId: conversationId ?? "",
            content: newMessage,
        };
        dispatch(PostApi([messageRequest], SendMessageApi));
    };

    return (
        /* h-full ensures it takes up the entire space of the Outlet container */
        <div className="fixed top-14 lg:top-0 bottom-0 left-0 right-0 lg:left-20 xl:left-64 flex flex-col bg-white dark:bg-black text-black dark:text-white z-20 overflow-hidden">
            {/* 1. Header: shrink-0 keeps it at the top */}
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
                        <span className="font-bold text-sm tracking-tight">{partner?.displayName || partner?.username}</span>
                    </div>
                </div>
                <FontAwesomeIcon icon={faInfoCircle} className="text-xl text-zinc-400" />
            </div>

            {/* 2. Messages Area: flex-1 takes all available middle space */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages?.map((msg: Message) => {
                    const isMe = msg.senderId === currentUser?.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${isMe
                                ? 'bg-blue-500 text-white rounded-br-none shadow-sm'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-bl-none shadow-sm'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} className="h-2" />
            </div>

            {/* 3. Input Bar: shrink-0 pins it to the bottom of the screen */}
            {/* On mobile, we add pb-20 to stay above the Mobile Navigation bar */}
            <div className="shrink-0 p-3 pb-20 lg:pb-4 border-t dark:border-zinc-800 bg-white dark:bg-black">
                <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2 border dark:border-zinc-800">
                    <input
                        type="text"
                        placeholder="Message..."
                        className="flex-1 bg-transparent outline-none text-sm py-1"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
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