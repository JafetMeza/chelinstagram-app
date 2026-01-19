import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import { GetCommentsApi, GetFeedApi, ToggleLikeApi } from "@/service/api.service";
import { Post, Comment } from "@/types/schema";
import PostCard from "../components/postCard";
import PostSkeleton from "../components/postSkeleton";

const Home = () => {
    const dispatch = useAppDispatch();
    const { ok, data, loading, apiMethod } = useAppSelector(state => state.apiData);
    const [posts, setPosts] = useState<Post[]>([]);
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);

    useEffect(() => {
        dispatch(GetApi([], GetFeedApi));
    }, [dispatch]);

    useEffect(() => {
        if (ok && apiMethod === GetFeedApi.name) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPosts(data as Post[]);
        } else if (ok && apiMethod === GetCommentsApi.name) {
            setComments(data as Comment[]);
        }
        // Removed the ToggleLikeApi reload from here to prevent flashing
    }, [ok, data, apiMethod]);

    const handleToggleLike = (postId: string) => {
        // OPTIMISTIC UPDATE: Update the state locally before the API finishes
        setPosts(currentPosts => currentPosts.map(post => {
            if (post.id === postId) {
                const isCurrentlyLiked = post.isLikedByUser;
                return {
                    ...post,
                    isLikedByUser: !isCurrentlyLiked,
                    _count: {
                        ...post._count,
                        likes: (post._count?.likes || 0) + (isCurrentlyLiked ? -1 : 1)
                    }
                };
            }
            return post;
        }));

        // Fire and forget - the UI is already updated!
        dispatch(PostApi([postId], ToggleLikeApi));
    };

    const handleOpenComments = (postId: string) => {
        setActivePostId(postId);
        setComments([]); // Clear previous comments while loading
        dispatch(GetApi([postId], GetCommentsApi)); // Your API to fetch comments
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* 1. Show Skeletons ONLY on initial load, don't hide current posts on re-fetch */}
            {loading && posts.length === 0 && (
                <>
                    <PostSkeleton />
                    <PostSkeleton />
                </>
            )}

            {/* 2. Success State */}
            {posts.length > 0 ? (
                posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        isLiked={post.isLikedByUser ?? false}
                        onToggleLike={handleToggleLike}
                        // Comment Props
                        comments={activePostId === post.id ? comments : []}
                        activePostId={activePostId}
                        onOpenComments={handleOpenComments}
                        onCloseComments={() => setActivePostId(null)}
                    />
                ))
            ) : !loading && (
                <div className="text-center p-10 text-gray-500">
                    <p>No posts yet. Follow someone to see their photos!</p>
                </div>
            )}
        </div>
    );
};

export default Home;