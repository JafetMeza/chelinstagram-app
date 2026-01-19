import { Post, Comment } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartReg, faComment as faCommentReg, faEdit } from '@fortawesome/free-regular-svg-icons';
import { faEllipsisVertical, faHeart as faHeartSolid, faLocationDot, faThumbtack, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Url } from "@/service/helpers/urlConstants";
import { ROUTES } from "@/routes";
import { useNavigate } from "react-router";
import { useRef, useState } from "react";

interface PostCardProps {
    post: Post;
    isLiked: boolean;
    onToggleLike: (postId: string) => void;
    // Comment Props
    comments: Comment[];
    activePostId: string | null; // Used to know if THIS post's comments should show
    onOpenComments: (postId: string) => void;
    onCloseComments: () => void;
    disableProfileClick?: boolean;
    onDelete?: (postId: string) => void;
    onEdit?: (post: Post) => void;
    isOwner?: boolean;
}

const PostCard = ({
    post, isLiked, onToggleLike,
    comments, activePostId, onOpenComments, onCloseComments,
    disableProfileClick = false,
    onDelete, onEdit, isOwner
}: PostCardProps) => {
    const navigate = useNavigate();
    const isShowingComments = activePostId === post.id;

    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const fullImageUrl = `${Url}${post.imageUrl}`;

    // Helper to navigate to profile
    const handleProfileClick = () => {
        if (!disableProfileClick && post.author?.username) {
            navigate(ROUTES.PROFILE(post.author.username));
        }
    };

    return (
        <div className="relative w-full bg-white dark:bg-black border-b border-gray-200 dark:border-zinc-800 pb-4 mb-4 overflow-hidden">

            {/* 1. PINNED INDICATOR (Top of card) */}
            {post.isPinned && (
                <div className="flex items-center gap-2 px-3 pt-2 text-zinc-400">
                    <FontAwesomeIcon icon={faThumbtack} className="text-[10px] -rotate-45" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Pinned Chelfie</span>
                </div>
            )}

            {/* Header: User Info & Context Menu */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                    <button onClick={handleProfileClick} className="active:opacity-60 transition-opacity shrink-0">
                        <img
                            src={post.author?.avatarUrl ? `${Url}${post.author.avatarUrl}` : '/default-avatar.png'}
                            alt={post.author?.username}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
                        />
                    </button>

                    <div className="flex flex-col min-w-0">
                        <button onClick={handleProfileClick} className="text-left font-semibold text-sm text-black dark:text-white hover:underline decoration-1 truncate">
                            {post.author?.displayName || post.author?.username}
                        </button>

                        {/* 2. LOCATION (Re-added here) */}
                        {post.location && (
                            <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                                <span className="text-[11px] truncate">{post.location}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Context Menu Trigger */}
                {isOwner && (
                    <div className="relative" ref={menuRef}>
                        <button
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

            {/* Image */}
            <div className="w-full aspect-square relative bg-gray-100 dark:bg-zinc-900">
                <img
                    src={fullImageUrl}
                    alt={post.caption || 'Post Image'}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Interaction Buttons & Date */}
            <div className="flex items-center justify-between px-1 py-3 text-black dark:text-white w-full">
                {/* Action Icons */}
                <div className="flex gap-4 text-2xl">
                    <button
                        onClick={() => post.id && onToggleLike(post.id)}
                        className={`transition-transform active:scale-125 duration-100 ${isLiked ? 'text-red-500' : 'hover:text-gray-500'}`}
                    >
                        <FontAwesomeIcon icon={isLiked ? faHeartSolid : faHeartReg} />
                    </button>

                    <button
                        onClick={() => post.id && onOpenComments(post.id)}
                        className="hover:text-gray-500 transition-colors"
                    >
                        <FontAwesomeIcon icon={faCommentReg} />
                    </button>
                </div>

                {/* Formatted Date */}
                <time className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 font-medium">
                    {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: (new Date(post.createdAt).getFullYear() !== new Date().getFullYear()) ? 'numeric' : undefined
                    }) : ''}
                </time>
            </div>

            {/* Caption Section */}
            <div className="px-1 text-black dark:text-white">
                <p className="font-bold text-sm mb-1">{post._count?.likes || 0} likes</p>
                <p className="text-sm">
                    <span className="font-bold mr-2">{post.author?.displayName}</span>
                    {post.caption}
                </p>
            </div>

            {isShowingComments && (
                <div className="absolute inset-0 z-20 bg-white dark:bg-black flex flex-col animate-slide-up">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-zinc-800">
                        <span className="font-semibold text-sm">Comments</span>
                        <button
                            onClick={onCloseComments}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                        >
                            <FontAwesomeIcon icon={faXmark} className="text-xl" />
                        </button>
                    </div>

                    {/* Comments List */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {comments.length > 0 ? (
                            comments.map((c) => (
                                <div key={c.id} className="flex gap-3 text-sm animate-in fade-in duration-500">
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

                    {/* Input area at the bottom of the slide-up */}
                    <div className="p-3 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-3 bg-white dark:bg-black">
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            className="flex-1 bg-transparent text-sm outline-none text-black dark:text-white"
                            autoFocus
                        />
                        <button className="text-blue-500 font-semibold text-sm hover:text-blue-700 transition-colors">
                            Post
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostCard;