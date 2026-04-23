import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import {
    GetUserPostsApi,
    ToggleLikeApi,
    GetCommentsApi,
    DeletePostApi,
    UpdatePostApi,
    AddCommentApi
} from "@/service/api.service";
import { Post, Comment, UpdatePostRequest, PostsUserDetailData } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import PostCard from "@/features/home/components/postCard";
import PostSkeleton from "@/features/home/components/postSkeleton";

import {
    updatePostInState,
    removePostFromState,
    setProfilePosts
} from "@/redux/ducks/profileState";

const ProfileFeedPage = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dispatch = useAppDispatch();

    // 1. SELECTORES (Fuente de Verdad: Redux)
    const { ok, data, loading, apiMethod } = useAppSelector(state => state.apiData);
    const { user: currentUser } = useAppSelector(state => state.authData);
    const {
        posts: persistedPosts,
        currentUsername,
        currentPage: persistedPage,
        hasMore: persistedHasMore
    } = useAppSelector(state => state.profileState);

    // 2. PARAMS & CONTEXTO (Sin page ni limit de URL)
    const targetPostId = searchParams.get("post");
    const isSameUser = currentUsername === username;
    const GLOBAL_LIMIT = 18; // Definimos el límite constante

    // 3. ESTADOS LOCALES UI
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [newCaption, setNewCaption] = useState("");
    const [newLocation, setNewLocation] = useState("");
    const [isPinned, setIsPinned] = useState(false);

    // Refs de control
    const hasScrolledToTarget = useRef(false);
    const isFetching = useRef(false);

    // 4. CARGA INICIAL (Solo si Redux está vacío o es otro usuario)
    useEffect(() => {
        if (username && (!isSameUser || persistedPosts.length === 0)) {
            isFetching.current = true;
            // Si no hay datos, pedimos la página 1 por defecto
            dispatch(GetApi([`page=1&limit=${GLOBAL_LIMIT}`, username], GetUserPostsApi));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, isSameUser, dispatch]);

    // 5. INTERSECTION OBSERVER MANUAL (Para paginación al final de la lista)
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLElement | null) => {
        if (loading || !persistedHasMore || isFetching.current) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && username) {
                isFetching.current = true;
                const nextPage = persistedPage + 1;
                dispatch(GetApi([`page=${nextPage}&limit=${GLOBAL_LIMIT}`, username], GetUserPostsApi));
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, persistedHasMore, persistedPage, username, dispatch]);

    // 6. SYNC DE RESPUESTAS (Pattern de funciones locales)
    useEffect(() => {
        if (!ok || !username) return;

        if (apiMethod === GetUserPostsApi.name) {
            const response = data as PostsUserDetailData;
            if (response && !Array.isArray(response)) {
                dispatch(setProfilePosts({
                    posts: response.data || [],
                    username: username,
                    page: response.meta?.page || persistedPage,
                    hasMore: response.meta?.hasNextPage ?? false
                }));
            }
            isFetching.current = false;
        } else if (apiMethod === GetCommentsApi.name) {
            const updateComments = () => setComments(data as Comment[]);
            updateComments();
        } else if (apiMethod === DeletePostApi.name && postToDelete) {
            const removePost = () => {
                dispatch(removePostFromState(postToDelete));
                setShowDeleteModal(false);
            };
            removePost();
        } else if (apiMethod === UpdatePostApi.name) {
            const updatePost = () => {
                const updated = data as Post;
                if (updated.id) {
                    dispatch(updatePostInState(updated as Post & { id: string; }));
                }
                setEditingPost(null);
            };
            updatePost();
        }
    }, [ok, data, apiMethod, postToDelete, username, dispatch, persistedPage]);

    // 7. AUTO-SCROLL AL POST OBJETIVO
    useEffect(() => {
        if (targetPostId && persistedPosts.length > 0 && !hasScrolledToTarget.current) {
            const element = document.getElementById(`post-${targetPostId}`);
            if (element) {
                console.log("scroll");
                element.scrollIntoView({ behavior: 'instant', block: 'start' });
                hasScrolledToTarget.current = true;
            }
        }
    }, [persistedPosts, targetPostId]);

    // --- HANDLERS ---
    const handleToggleLike = (postId: string) => {
        const post = persistedPosts.find(p => p.id === postId);
        if (!post) return;
        const isLiked = !post.isLikedByUser;
        const newLikesCount = (post.likesCount ?? 0) + (isLiked ? 1 : -1);

        dispatch(updatePostInState({ id: postId, isLikedByUser: isLiked, likesCount: newLikesCount }));
        dispatch(PostApi([postId], ToggleLikeApi));
    };

    const handleOpenComments = (postId: string) => {
        setActivePostId(postId);
        setComments([]);
        dispatch(GetApi([postId], GetCommentsApi));
    };

    const handleSaveEdit = () => {
        if (editingPost) {
            const updateRequest: UpdatePostRequest = {
                caption: newCaption,
                location: newLocation,
                isPinned: isPinned
            };
            dispatch(PostApi([editingPost.id ?? "", updateRequest], UpdatePostApi));
        }
    };

    const openEditModal = (post: Post) => {
        setEditingPost(post);
        setNewCaption(post.caption || "");
        setNewLocation(post.location || "");
        setIsPinned(post.isPinned || false);
    };

    const handleAddComment = async (postId: string, content: string) => {
        const newComment: Comment = {
            id: `temp-${Date.now()}`,
            content,
            createdAt: new Date().toISOString(),
            author: { username: currentUser?.username, displayName: currentUser?.displayName }
        };
        setComments(prev => [...prev, newComment]);
        dispatch(PostApi([{ postId, content }], AddCommentApi));
    };

    const isMyProfile = currentUser?.username === username;

    return (
        <div className="flex flex-col w-full bg-white dark:bg-black min-h-screen">
            {/* Header Sticky */}
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-sm p-4 border-b dark:border-zinc-800 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-1 active:opacity-50 transition-transform active:scale-90"
                >
                    <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
                </button>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Chelfies</span>
                    <span className="font-bold text-sm lowercase">@{username}</span>
                </div>
            </div>

            {/* Feed Area */}
            <div className="flex flex-col w-full py-2 gap-6">
                {/* Skeleton solo si Redux está vacío y cargando */}
                {loading && persistedPosts.length === 0 && (
                    <><PostSkeleton /><PostSkeleton /></>
                )}

                {persistedPosts.map((post, index) => (
                    <div
                        key={post.id}
                        id={`post-${post.id}`}
                        ref={persistedPosts.length === index + 1 ? lastElementRef : null}
                    >
                        <PostCard
                            post={post}
                            isLiked={post.isLikedByUser ?? false}
                            onToggleLike={handleToggleLike}
                            comments={activePostId === post.id ? comments : []}
                            onAddComment={handleAddComment}
                            activePostId={activePostId}
                            onOpenComments={handleOpenComments}
                            onCloseComments={() => setActivePostId(null)}
                            disableProfileClick={true}
                            isOwner={isMyProfile}
                            onDelete={(id) => { setPostToDelete(id); setShowDeleteModal(true); }}
                            onEdit={() => openEditModal(post)}
                        />
                    </div>
                ))}

                {/* Skeleton de carga infinita al final */}
                {loading && persistedPosts.length > 0 && <PostSkeleton />}
            </div>

            {/* MODAL: Delete */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <h3 className="text-lg font-bold">Delete Chelfie?</h3>
                            <p className="text-sm text-zinc-500 mt-2">This action cannot be undone.</p>
                        </div>
                        <div className="flex border-t dark:border-zinc-800">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 p-4 text-sm font-medium">Cancel</button>
                            <button
                                onClick={() => postToDelete && dispatch(PostApi([postToDelete], DeletePostApi))}
                                className="flex-1 p-4 text-sm font-bold text-red-500 border-l dark:border-zinc-800"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Edit */}
            {editingPost && (
                <div className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="font-bold text-lg mb-4 text-center">Edit Chelfie</h3>
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
                            <button onClick={handleSaveEdit} className="flex-1 py-3 bg-blue-500 text-white rounded-2xl text-sm font-bold active:scale-95 transition-transform">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileFeedPage;