import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import { GetUserPostsApi, ToggleLikeApi, GetCommentsApi } from "@/service/api.service";
import { Post, Comment } from "@/types/schema";
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

    const [posts, setPosts] = useState<Post[]>([]);
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);

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
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setPosts(data as Post[]);
            } else if (apiMethod === GetCommentsApi.name) {
                setComments(data as Comment[]);
            }
        }
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
                            activePostId={activePostId}
                            onOpenComments={handleOpenComments}
                            onCloseComments={() => setActivePostId(null)}
                            disableProfileClick={true} // CANCEL NAVIGATION HERE
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfileFeedPage;