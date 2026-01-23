import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid"; // Import DeleteApi
import { GetConversationsApi, GetFollowingApi, StartConversationApi, DeleteConversationApi } from "@/service/api.service";
import { Conversation, SearchUser, Participant } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTrash } from '@fortawesome/free-solid-svg-icons';
import BridgeWidget from "../components/bridgeWidget";
import ChatSkeleton from "../components/chatSkeleton";
import { getAvatarSrc } from "@/helpers/imageUtils";

const ChatList = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { user: currentUser } = useAppSelector(state => state.authData);
    const { ok, data, apiMethod, loading } = useAppSelector(state => state.apiData);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [following, setFollowing] = useState<SearchUser[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // MODAL STATE
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(GetApi([], GetConversationsApi));
        if (currentUser?.username) {
            dispatch(GetApi([currentUser.username], GetFollowingApi));
        }
    }, [dispatch, currentUser]);

    useEffect(() => {
        if (ok) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (apiMethod === GetConversationsApi.name) setConversations(data as Conversation[]);
            if (apiMethod === GetFollowingApi.name) setFollowing(data as SearchUser[]);

            if (apiMethod === StartConversationApi.name) {
                const newChat = data as Conversation;
                const partnerUser = newChat.participants?.find(p => p.user?.id !== currentUser?.id)?.user;
                navigate(`/chat/${newChat.id}`, { state: { partner: partnerUser } });
            }

            // After successful delete, refresh the list
            if (apiMethod === DeleteConversationApi.name) {
                dispatch(GetApi([], GetConversationsApi));
                setShowDeleteModal(false);
                setSelectedConvId(null);
            }
        }
    }, [ok, data, apiMethod, currentUser?.id, navigate, dispatch]);

    const handleStartChat = (recipientId: string) => {
        dispatch(PostApi([recipientId], StartConversationApi));
    };

    const openDeleteConfirm = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevents navigating to the chat
        setSelectedConvId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (selectedConvId) {
            dispatch(PostApi([selectedConvId], DeleteConversationApi));
        }
    };

    const getPartner = (participants?: Participant[]) => {
        const partnerEntry = participants?.find(p => p.user?.username !== currentUser?.username);
        return partnerEntry?.user;
    };

    const filteredFollowing = following.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white relative">
            <BridgeWidget />

            {/* SEARCH */}
            <div className="p-2 pt-4">
                <div className="relative group">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs" />
                    <input
                        type="text"
                        placeholder="Search your following..."
                        className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg py-2 pl-9 pr-4 text-xs outline-none focus:ring-1 ring-zinc-300 dark:ring-zinc-600 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* CHAT LIST */}
            <div className="flex-1 overflow-y-auto px-1">
                {loading && conversations.length === 0 ? (
                    <div className="mt-2"><ChatSkeleton /><ChatSkeleton /></div>
                ) : searchQuery.length > 0 ? (
                    <div className="mt-2">
                        <span className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">New Message</span>
                        {filteredFollowing.map(user => (
                            <div key={user.id} onClick={() => handleStartChat(user.id ?? "")} className="flex items-center gap-3 p-3 active:bg-zinc-100 dark:active:bg-zinc-900 rounded-xl mt-1 cursor-pointer">
                                <img src={getAvatarSrc(user.avatarUrl)} className="w-11 h-11 rounded-full object-cover border dark:border-zinc-800" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm leading-none">@{user.username}</span>
                                    <span className="text-[11px] text-zinc-500 mt-1">{user.displayName}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-2">
                        {conversations.map(chat => {
                            const partner = getPartner(chat.participants);
                            const lastMsg = chat.messages?.[chat.messages.length - 1];
                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => navigate(`/chat/${chat.id}`, { state: { partner } })}
                                    className="group flex items-center gap-3 p-3 active:bg-zinc-100 dark:active:bg-zinc-900 transition-all rounded-xl cursor-pointer relative"
                                >
                                    <div className="relative shrink-0">
                                        <img src={getAvatarSrc(partner?.avatarUrl)} className="w-14 h-14 rounded-full object-cover border-2 border-transparent" />
                                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-black rounded-full" />
                                    </div>
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <span className="font-bold text-sm truncate">{partner?.displayName || partner?.username}</span>
                                            <span className="text-[10px] text-zinc-400">
                                                {lastMsg?.createdAt ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-500 truncate leading-relaxed">
                                            {lastMsg?.content || "Tap to start chatting..."}
                                        </p>
                                    </div>
                                    {/* DELETE BUTTON (Visible on hover or long-press context) */}
                                    <button
                                        onClick={(e) => openDeleteConfirm(e, chat.id ?? "")}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-red-500 transition-all"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <h3 className="text-lg font-bold mb-2">Delete Chat?</h3>
                            <p className="text-sm text-zinc-500">This will permanently remove all messages for both participants.</p>
                        </div>
                        <div className="flex border-t dark:border-zinc-800">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-l dark:border-zinc-800"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatList;