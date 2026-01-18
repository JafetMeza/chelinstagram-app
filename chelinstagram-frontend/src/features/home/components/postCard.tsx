import { Post, Comment } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartReg, faComment as faCommentReg } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Url } from "@/service/helpers/urlConstants";
import { ROUTES } from "@/routes";
import { useNavigate } from "react-router";

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
}

const PostCard = ({
    post, isLiked, onToggleLike,
    comments, activePostId, onOpenComments, onCloseComments,
    disableProfileClick = false
}: PostCardProps) => {
    const navigate = useNavigate();
    const isShowingComments = activePostId === post.id;

    const fullImageUrl = post.imageUrl?.startsWith('http')
        ? post.imageUrl
        : `${Url}${post.imageUrl}`;

    // Helper to navigate to profile
    const handleProfileClick = () => {
        if (!disableProfileClick && post.author?.username) {
            navigate(ROUTES.PROFILE(post.author.username));
        }
    };

    return (
        <div className="relative w-full bg-white dark:bg-black border-b border-gray-200 dark:border-zinc-800 pb-4 mb-4 overflow-hidden">
            {/* Header: User Info */}
            <div className="flex items-center justify-between p-3">
                {/* Wrapped in a button for accessibility and navigation */}
                <button
                    onClick={handleProfileClick}
                    className="flex items-center gap-3 active:opacity-60 transition-opacity"
                >
                    <img
                        src={post.author?.avatarUrl ? `${Url}${post.author.avatarUrl}` : '/default-avatar.png'}
                        alt={post.author?.username}
                        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
                    />
                    <span className="font-semibold text-sm text-black dark:text-white hover:underline decoration-1">
                        {post.author?.displayName}
                    </span>
                </button>
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