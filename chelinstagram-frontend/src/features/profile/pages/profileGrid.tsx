import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import { GetUserPostsApi, GetUserByUserNameApi, ToggleFollowApi } from "@/service/api.service";
import { Post, UserProfile } from "@/types/schema";
import { ROUTES } from "@/routes";
import { Url } from "@/service/helpers/urlConstants";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faLock, faThumbtack } from '@fortawesome/free-solid-svg-icons';

const ProfileGrid = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { user: currentUser } = useAppSelector(state => state.authData);
    const { ok, data, loading, apiMethod } = useAppSelector(state => state.apiData);

    const [posts, setPosts] = useState<Post[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    const isOwnProfile = currentUser?.username === username;
    // Assuming backend returns isFollowing in the profile object
    const canSeeContent = isOwnProfile || profile?.isFollowing;

    useEffect(() => {
        if (username) {
            dispatch(GetApi([username], GetUserByUserNameApi));
        }
    }, [username, dispatch]);

    useEffect(() => {
        if (username && profile?.isFollowing && posts.length === 0) {
            dispatch(GetApi([username], GetUserPostsApi));
        }
    }, [profile?.isFollowing, username, dispatch, posts.length]);

    useEffect(() => {
        if (ok) {
            if (apiMethod === GetUserByUserNameApi.name) {
                const userProfile = data as UserProfile;
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setProfile(userProfile);

                // ONLY fetch posts if it's my profile OR I follow them
                if (isOwnProfile || userProfile.isFollowing) {
                    dispatch(GetApi([username!], GetUserPostsApi));
                }
            }
            else if (apiMethod === GetUserPostsApi.name) {
                setPosts(data as Post[]);
            }
        }
    }, [ok, data, apiMethod, username, isOwnProfile, dispatch]);

    const handleToggleFollow = () => {
        if (!profile) return;

        // 1. OPTIMISTIC UPDATE: Update the profile state locally
        setProfile(prev => {
            const wasFollowing = prev?.isFollowing;
            const followers = prev?._count?.followers ?? 0;
            return {
                ...prev,
                isFollowing: !wasFollowing,
                _count: {
                    ...prev?._count,
                    // If we were following, we subtract 1. If we weren't, we add 1.
                    followers: followers + (wasFollowing ? -1 : 1)
                }
            };
        });

        // 2. DISPATCH: Send the ID to the backend
        dispatch(PostApi([profile.id ?? ""], ToggleFollowApi));
    };


    return (
        <div className="w-full flex flex-col min-h-screen bg-white dark:bg-black text-black dark:text-white relative">

            {/* Full Screen Loader */}
            {loading && !profile && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-black">
                    <FontAwesomeIcon icon={faCircleNotch} className="text-4xl text-blue-500 animate-spin mb-4" />
                </div>
            )}

            {/* Profile Header (Always visible) */}
            <div className="p-1 md:p-8">
                <div className="flex items-center gap-6 md:gap-12">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border border-gray-100 dark:border-zinc-800 shrink-0 bg-zinc-100">
                        <img
                            src={profile?.avatarUrl ? `${Url}${profile.avatarUrl}` : '/default-avatar.png'}
                            alt={username}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="flex flex-col flex-1 gap-3">
                        <span className="text-sm font-medium text-zinc-500 lowercase px-1">@{username}</span>
                        <div className="flex justify-between max-w-sm">
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-base">{profile?._count?.posts || 0}</span>
                                <span className="text-[10px] uppercase text-zinc-400 font-bold">Chelfies</span>
                            </div>
                            <button
                                onClick={() => canSeeContent && navigate(`${ROUTES.FOLLOWERS(username ?? "")}?tab=followers`)}
                                className={`flex flex-col items-center ${!canSeeContent && 'opacity-50 cursor-default'}`}
                            >
                                <span className="font-bold text-base">{profile?._count?.followers || 0}</span>
                                <span className="text-[10px] uppercase text-zinc-400 font-bold">Followers</span>
                            </button>
                            <button
                                onClick={() => canSeeContent && navigate(`${ROUTES.FOLLOWERS(username ?? "")}?tab=following`)}
                                className={`flex flex-col items-center ${!canSeeContent && 'opacity-50 cursor-default'}`}
                            >
                                <span className="font-bold text-base">{profile?._count?.following || 0}</span>
                                <span className="text-[10px] uppercase text-zinc-400 font-bold">Following</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 px-1 space-y-3">
                    <div>
                        <h1 className="font-bold text-sm">{profile?.displayName || username}</h1>
                        <p className="text-sm mt-0.5 text-zinc-700 dark:text-zinc-300">
                            {profile?.bio || "No bio yet."}
                        </p>
                    </div>

                    {isOwnProfile ? (
                        <button
                            onClick={() => navigate(ROUTES.SETTINGS)}
                            className="w-full py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold transition-colors"
                        >
                            Edit Profile
                        </button>
                    ) : (
                        <button
                            onClick={handleToggleFollow}
                            className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${profile?.isFollowing
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border border-zinc-200 dark:border-zinc-700'
                                : 'bg-blue-500 text-white'
                                }`}
                        >
                            {profile?.isFollowing ? 'Following' : 'Follow'}
                        </button>
                    )}
                </div>
            </div>

            {/* Conditional Content Section */}
            <div className="border-t dark:border-zinc-900 mt-2 flex-1">
                {canSeeContent ? (
                    <>
                        <div className="grid grid-cols-3 gap-0.5 p-0.5">
                            {posts.map((post) => (
                                <div
                                    key={post.id}
                                    onClick={() => navigate(`${ROUTES.PROFILE_FEED(username ?? "")}?post=${post.id}`)}
                                    className="aspect-square relative cursor-pointer active:opacity-80 transition-opacity bg-zinc-100 dark:bg-zinc-900 group"
                                >
                                    <img
                                        src={post.imageUrl?.startsWith('http') ? post.imageUrl : `${Url}${post.imageUrl}`}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />

                                    {/* PINNED INDICATOR */}
                                    {post.isPinned && (
                                        <div className="absolute top-2 right-2 z-10">
                                            {/* Shadow/Gradient for visibility */}
                                            <div className="absolute inset-0 bg-black/20 blur-sm rounded-full" />
                                            <FontAwesomeIcon
                                                icon={faThumbtack}
                                                className="relative text-white text-[10px] -rotate-45 drop-shadow-md"
                                            />
                                        </div>
                                    )}

                                    {/* Optional: Hover effect for desktop */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                </div>
                            ))}
                        </div>
                        {!loading && posts.length === 0 && (
                            <div className="py-20 text-center text-zinc-400">
                                <p className="text-xs italic">No Chelfies yet.</p>
                            </div>
                        )}
                    </>
                ) : (
                    /* Private Account Placeholder */
                    <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                        <div className="w-16 h-16 border-2 border-black dark:border-white rounded-full flex items-center justify-center mb-4">
                            <FontAwesomeIcon icon={faLock} className="text-2xl" />
                        </div>
                        <h2 className="font-bold text-sm">This account is private</h2>
                        <p className="text-xs text-zinc-500 mt-2">Follow to see their Chelfies and interactions.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileGrid;