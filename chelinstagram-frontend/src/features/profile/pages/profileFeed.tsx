import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import { GetUserPostsApi, ToggleLikeApi, GetCommentsApi, DeletePostApi, UpdatePostApi, AddCommentApi } from "@/service/api.service";
import { Post, Comment, UpdatePostRequest, CommentRequest } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import PostCard from "@/features/home/components/postCard";
import PostSkeleton from "@/features/home/components/postSkeleton";

const ProfileFeedPage = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetPostId = searchParams.get("post"); // The ID passed from the Grid

    const dispatch = useAppDispatch();
    const { ok, data, loading, apiMethod } = useAppSelector(state => state.apiData);
    const { user: currentUser } = useAppSelector(state => state.authData);


    const [posts, setPosts] = useState<Post[]>([]);
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [newCaption, setNewCaption] = useState("");
    const [newLocation, setNewLocation] = useState("");
    const [isPinned, setIsPinned] = useState(false);

    const isMyProfile = currentUser?.username === username;

    // 1. Fetch the user's Chelfies
    useEffect(() => {
        if (username) {
            dispatch(GetApi([username], GetUserPostsApi));
        }
    }, [username, dispatch]);

    // 2. Sync data and comments
    useEffect(() => {
        if (ok) {
            if (apiMethod === GetUserPostsApi.name) {
                setPosts(data as Post[]);
            } else if (apiMethod === GetCommentsApi.name) {
                setComments(data as Comment[]);
            } else if (apiMethod === DeletePostApi.name) {
                setPosts(prev => prev.filter(p => p.id !== postToDelete));
                setShowModal(false);
            } else if (apiMethod === UpdatePostApi.name) {
                const updatedPost = data as Post;
                setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
                setEditingPost(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ok, data, apiMethod]);

    // 3. AUTO-SCROLL LOGIC: Scroll to the Chelfie clicked in the grid
    useEffect(() => {
        if (targetPostId && posts.length > 0) {
            const element = document.getElementById(`post-${targetPostId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'instant', block: 'start' });
            }
        }
    }, [posts, targetPostId]);

    // Reuse your Home.tsx logic for Likes and Comments
    const handleToggleLike = (postId: string) => {
        setPosts(current => current.map(p => p.id === postId ?
            { ...p, isLikedByUser: !p.isLikedByUser, _count: { ...p._count, likes: p._count?.likes ?? 0 + (p.isLikedByUser ? -1 : 1) } }
            : p
        ));
        dispatch(PostApi([postId], ToggleLikeApi));
    };

    const handleOpenComments = (postId: string) => {
        setActivePostId(postId);
        setComments([]);
        dispatch(GetApi([postId], GetCommentsApi));
    };

    const confirmDelete = () => {
        if (postToDelete) {
            dispatch(PostApi([postToDelete], DeletePostApi));
        }
    };

    const handleSaveEdit = () => {
        if (editingPost) {
            const updateRequest: UpdatePostRequest = {
                caption: newCaption,
                location: newLocation,
                isPinned: isPinned
            };
            // Pass the ID and the data object
            dispatch(PostApi([editingPost.id ?? "", updateRequest], UpdatePostApi));
        }
    };

    // Helper to open the edit modal with current post data
    const openEditModal = (post: Post) => {
        setEditingPost(post);
        setNewCaption(post.caption || "");
        setNewLocation(post.location || "");
        setIsPinned(post.isPinned || false);
    };

    const handleAddComment = async (postId: string, content: string) => {
        // 1. Objeto temporal (usa datos que ya tienes)
        const newComment: Comment = {
            id: `temp-${Date.now()}`, // ID temporal para React
            content,
            createdAt: new Date().toISOString(),
            author: {
                username: currentUser?.username,
                displayName: currentUser?.displayName
            }
        };

        // 2. Actualización instantánea de la UI
        setComments(prev => [...prev, newComment]);

        const commentRequest: CommentRequest = {
            postId,
            content

        };
        dispatch(PostApi([commentRequest], AddCommentApi));
    };

    return (
        <div className="flex flex-col w-full bg-white dark:bg-black min-h-screen">
            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-sm p-4 border-b dark:border-zinc-800 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-1 active:opacity-50 transition-opacity"
                >
                    <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
                </button>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Chelfies</span>
                    <span className="font-bold text-sm lowercase">@{username}</span>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col w-full py-2 gap-6">
                {/* 1. SKELETON LOADING STATE */}
                {loading && posts.length === 0 && (
                    <>
                        <PostSkeleton />
                        <PostSkeleton />
                    </>
                )}

                {/* 2. FEED CONTENT */}
                {posts.map((post) => (
                    <div key={post.id} id={`post-${post.id}`}>
                        <PostCard
                            post={post}
                            isLiked={post.isLikedByUser ?? false}
                            onToggleLike={handleToggleLike}
                            comments={activePostId === post.id ? comments : []}
                            onAddComment={handleAddComment}
                            activePostId={activePostId}
                            onOpenComments={handleOpenComments}
                            onCloseComments={() => setActivePostId(null)}
                            disableProfileClick={true} // CANCEL NAVIGATION HERE
                            isOwner={isMyProfile}
                            onDelete={(id) => {
                                setPostToDelete(id);
                                setShowModal(true);
                            }}
                            onEdit={() => openEditModal(post)}
                        />
                    </div>
                ))}

                {/* DELETE MODAL */}
                {showModal && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="p-6 text-center">
                                <h3 className="text-lg font-bold">Delete Chelfie?</h3>
                                <p className="text-sm text-zinc-500 mt-2">This action cannot be undone.</p>
                            </div>
                            <div className="flex border-t dark:border-zinc-800">
                                <button onClick={() => setShowModal(false)} className="flex-1 p-4 text-sm font-medium">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 p-4 text-sm font-bold text-red-500 border-l dark:border-zinc-800">Delete</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* IMPROVED EDIT MODAL */}
                {editingPost && (
                    <div className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <h3 className="font-bold text-lg mb-4">Edit Chelfie</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Caption</label>
                                    <textarea
                                        className="w-full h-24 p-3 mt-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-sm outline-none resize-none focus:ring-1 ring-blue-500"
                                        value={newCaption}
                                        onChange={(e) => setNewCaption(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Location</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 mt-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none focus:ring-1 ring-blue-500"
                                        value={newLocation}
                                        onChange={(e) => setNewLocation(e.target.value)}
                                        placeholder="Add location..."
                                    />
                                </div>

                                <div className="flex items-center justify-between p-1">
                                    <span className="text-sm font-medium">Pin to profile</span>
                                    <button
                                        onClick={() => setIsPinned(!isPinned)}
                                        className={`w-10 h-6 rounded-full transition-colors relative ${isPinned ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPinned ? 'left-5' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setEditingPost(null)} className="flex-1 py-3 text-sm font-bold text-zinc-500">Cancel</button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 py-3 bg-blue-500 text-white rounded-2xl text-sm font-bold active:scale-95 transition-transform"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileFeedPage;