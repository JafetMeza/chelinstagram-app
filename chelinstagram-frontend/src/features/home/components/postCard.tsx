import { Post, Comment } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartReg, faComment as faCommentReg, faEdit } from '@fortawesome/free-regular-svg-icons';
import { faEllipsisVertical, faHeart as faHeartSolid, faLocationDot, faThumbtack, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { ROUTES } from "@/routes";
import { useNavigate } from "react-router";
import { useRef, useState } from "react";
import { getAvatarSrc } from "@/helpers/imageUtils";

interface PostCardProps {
    post: Post;
    isLiked: boolean;
    onToggleLike: (postId: string) => void;
    comments: Comment[];
    activePostId: string | null;
    onOpenComments: (postId: string) => void;
    onCloseComments: () => void;
    onAddComment: (postId: string, content: string) => void;
    disableProfileClick?: boolean;
    onDelete?: (postId: string) => void;
    onEdit?: (post: Post) => void;
    isOwner?: boolean;
}

const PostCard = ({
    post, isLiked, onToggleLike,
    comments, onAddComment, activePostId, onOpenComments, onCloseComments,
    disableProfileClick = false,
    onDelete, onEdit, isOwner
}: PostCardProps) => {
    const navigate = useNavigate();
    const isShowingComments = activePostId === post.id;

    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [commentText, setCommentText] = useState("");

    const [heartPos, setHeartPos] = useState<{ x: number, y: number; } | null>(null);
    const lastTap = useRef<number>(0);

    const fullImageUrl = getAvatarSrc(post.imageUrl);

    const handleProfileClick = () => {
        if (!disableProfileClick && post.author?.username) {
            navigate(ROUTES.PROFILE(post.author.username));
        }
    };

    const handlePostComment = () => {
        if (!commentText.trim()) return;
        if (post.id) {
            onAddComment(post.id, commentText);
            setCommentText("");
        }
    };

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            if (post.id) {
                // 1. Calculamos las coordenadas relativas al div de la imagen
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                onToggleLike(post.id);

                // 2. Guardamos la posición y disparamos la animación
                setHeartPos({ x, y });
                setTimeout(() => setHeartPos(null), 700);
            }
        }
        lastTap.current = now;
    };

    return (
        <div className="relative w-full bg-white dark:bg-black border-b border-gray-200 dark:border-zinc-800 pb-4 mb-4 overflow-hidden">

            {post.isPinned && (
                <div className="flex items-center gap-2 px-3 pt-2 text-zinc-400">
                    <FontAwesomeIcon icon={faThumbtack} className="text-[10px] -rotate-45" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Pinned Chelfie</span>
                </div>
            )}

            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={handleProfileClick} className="active:opacity-60 transition-opacity shrink-0">
                        <img
                            src={getAvatarSrc(post.author?.avatarUrl)}
                            alt={post.author?.username}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
                        />
                    </button>

                    <div className="flex flex-col min-w-0">
                        <button type="button" onClick={handleProfileClick} className="text-left font-semibold text-sm text-black dark:text-white hover:underline decoration-1 truncate">
                            {post.author?.displayName || post.author?.username}
                        </button>

                        {post.location && (
                            <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                                <span className="text-[11px] truncate">{post.location}</span>
                            </div>
                        )}
                    </div>
                </div>

                {isOwner && (
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="p-2 text-zinc-400 hover:text-black dark:hover:text-white rounded-full transition-all"
                        >
                            <FontAwesomeIcon icon={faEllipsisVertical} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onEdit?.(post);
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faEdit} className="text-blue-500" />
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onDelete?.(post.id ?? "");
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t dark:border-zinc-800"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div
                onClick={handleImageClick}
                className="w-full aspect-square relative bg-gray-100 dark:bg-zinc-900 cursor-pointer select-none"
            >
                <img
                    src={fullImageUrl}
                    alt={post.caption || 'Post Image'}
                    className="w-full h-full object-cover"
                />

                {heartPos && (
                    <div
                        className="absolute z-10 pointer-events-none"
                        style={{
                            left: heartPos.x,
                            top: heartPos.y,
                            // El translate(-50%, -50%) centra el corazón exactamente donde tocó el dedo
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <FontAwesomeIcon
                            icon={faHeartSolid}
                            className="text-7xl drop-shadow-2xl text-red-500 animate-in zoom-in fade-in duration-200"
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between px-1 py-3 text-black dark:text-white w-full">
                <div className="flex gap-4 text-2xl">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.currentTarget.blur();
                            if (post.id) {
                                onToggleLike(post.id);
                            }
                        }}
                        className={`transition-transform active:scale-125 duration-100 ${isLiked ? 'text-red-500' : 'hover:text-gray-500'}`}
                    >
                        <FontAwesomeIcon icon={isLiked ? faHeartSolid : faHeartReg} />
                    </button>

                    {/* 🟢 SOLUCIÓN: Cambiado 'onToggleLike' por 'onOpenComments' */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.currentTarget.blur();
                            if (post.id) {
                                onOpenComments(post.id);
                            }
                        }}
                        className="hover:text-gray-500 transition-colors flex items-center gap-1.5"
                    >
                        <FontAwesomeIcon icon={faCommentReg} />
                        {post.commentCount !== undefined && post.commentCount > 0 && (
                            <span className="text-xs font-bold tracking-tight bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-300">
                                {post.commentCount}
                            </span>
                        )}
                    </button>
                </div>

                <time className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 font-medium">
                    {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: (new Date(post.createdAt).getFullYear() !== new Date().getFullYear()) ? 'numeric' : undefined
                    }) : ''}
                </time>
            </div>

            <div className="px-1 text-black dark:text-white">
                <p className="font-bold text-sm mb-1">{post.likesCount} likes</p>
                <div className="text-sm">
                    <span className="font-bold mr-2">{post.author?.displayName || post.author?.username}</span>
                    <span className="whitespace-pre-line">{post.caption}</span>
                </div>
            </div>

            {isShowingComments && (
                <div className="absolute inset-0 z-20 bg-white dark:bg-black flex flex-col animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-zinc-800">
                        <span className="font-semibold text-sm">Comments ({post.commentCount ?? 0})</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.currentTarget.blur();
                                onCloseComments();
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                        >
                            <FontAwesomeIcon icon={faXmark} className="text-xl" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {comments.length > 0 ? (
                            comments.map((c) => (
                                <div key={c.id} className="flex gap-3 text-sm animate-in fade-in duration-300">
                                    <span className="font-bold">{c.author?.username}</span>
                                    <span className="text-gray-800 dark:text-zinc-200">{c.content}</span>
                                </div>
                            ))
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                                <p className="font-semibold text-black dark:text-white">No comments yet</p>
                                <p className="text-xs">Start the conversation.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-100 dark:border-zinc-800 flex items-end gap-3 bg-white dark:bg-black">
                        <textarea
                            placeholder="Add a comment..."
                            className="flex-1 bg-transparent text-sm outline-none text-black dark:text-white resize-none max-h-32 py-1"
                            rows={1}
                            value={commentText}
                            onChange={(e) => {
                                setCommentText(e.target.value);
                                e.target.style.height = 'inherit';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handlePostComment();
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={handlePostComment}
                            disabled={!commentText.trim()}
                            className={`font-semibold text-sm pb-1 transition-colors ${commentText.trim() ? 'text-blue-500 hover:text-blue-700' : 'text-gray-300'}`}
                        >
                            Post
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostCard;