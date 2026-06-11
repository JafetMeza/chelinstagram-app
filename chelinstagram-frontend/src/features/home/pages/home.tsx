import { useState } from 'react';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { PostApi, GetApi } from "@/redux/middleware/httpMethod.mid";
import { AddCommentApi, GetCommentsApi, GetFeedApi, ToggleLikeApi } from "@/service/api.service";
import { Comment, CommentRequest } from "@/types/schema";
import { useInfiniteScroll } from "@/components/hooks/useInfiniteScroll"; // Ajusta la ruta
import PostCard from "../components/postCard";
import PostSkeleton from "../components/postSkeleton";

const Home = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector(state => state.authData);
    const { ok, data, apiMethod } = useAppSelector(state => state.apiData);

    // 1. Usamos nuestro nuevo Custom Hook
    const {
        posts,
        loading,
        hasMore,
        lastElementRef,
        updateLocalPost
    } = useInfiniteScroll({
        apiService: GetFeedApi,
        limit: 10
    });

    // Estados locales para la gestión de comentarios (específicos de la UI del Home)
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);

    // 2. Sincronización de comentarios (Sigue aquí porque es lógica de UI local)
    if (ok && apiMethod === GetCommentsApi.name && comments.length === 0 && data) {
        setComments(data as Comment[]);
    }

    const handleToggleLike = (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        // Update Optimista usando el helper del hook
        const isCurrentlyLiked = post.isLikedByUser;
        updateLocalPost(postId, {
            isLikedByUser: !isCurrentlyLiked,
            likesCount: (post.likesCount ?? 0) + (isCurrentlyLiked ? -1 : 1)
        });

        dispatch(PostApi([postId], ToggleLikeApi));
    };

    const handleOpenComments = (postId: string) => {
        setActivePostId(postId);
        setComments([]);
        dispatch(GetApi([postId], GetCommentsApi));
    };

    const handleAddComment = async (postId: string, content: string) => {
        const newComment: Comment = {
            id: `temp-${Date.now()}`,
            content,
            createdAt: new Date().toISOString(),
            author: {
                username: user?.username,
                displayName: user?.displayName
            }
        };

        setComments(prev => [...prev, newComment]);
        const commentRequest: CommentRequest = { postId, content };
        dispatch(PostApi([commentRequest], AddCommentApi));
    };

    return (
        <div className="flex flex-col gap-6 w-full pb-10">
            {/* Skeletons: Solo en la carga inicial (cuando no hay posts) */}
            {loading && posts.length === 0 && (
                <>
                    <PostSkeleton />
                    <PostSkeleton />
                </>
            )}

            {/* Lista de Posts renderizada con el Hook */}
            {posts.map((post, index) => (
                <div
                    key={post.id}
                    ref={posts.length === index + 1 ? lastElementRef : null}
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
                    />
                </div>
            ))}

            {/* Spinner de carga para páginas siguientes */}
            {loading && posts.length > 0 && (
                <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary border-t-transparent"></div>
                </div>
            )}

            {/* Feedback de fin de contenido */}
            {!hasMore && posts.length > 0 && (
                <p className="text-center text-gray-400 text-sm py-8">
                    Has llegado al final del camino. ✨
                </p>
            )}

            {/* Empty State */}
            {!loading && posts.length === 0 && (
                <div className="text-center p-10 text-gray-500">
                    <p>No hay publicaciones todavía. ¡Sigue a alguien!</p>
                </div>
            )}
        </div>
    );
};

export default Home;