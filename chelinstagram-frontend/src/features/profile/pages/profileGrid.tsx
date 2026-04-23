import { useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import { GetUserPostsApi, GetUserByUserNameApi, ToggleFollowApi } from "@/service/api.service";
import { UserProfile } from "@/types/schema";
import { ROUTES } from "@/routes";
import { Url } from "@/service/helpers/urlConstants";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faLock, faThumbtack } from '@fortawesome/free-solid-svg-icons';
import { getAvatarSrc } from "@/helpers/imageUtils";
import { useInfiniteScroll } from "@/components/hooks/useInfiniteScroll";
import { setProfilePosts, setScrollPosition } from "@/redux/ducks/profileState";
import { useScroll } from "@/components/hooks/useScroll";

const ProfileGrid = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { user: currentUser } = useAppSelector(state => state.authData);
    const { ok, data, loading: apiLoading, apiMethod } = useAppSelector(state => state.apiData);

    // --- SELECTORES DE REDUX ---
    const {
        posts: persistedPosts,
        scrollPosition,
        currentUsername,
        currentPage: persistedPage,
        hasMore: persistedHasMore
    } = useAppSelector(state => state.profileState);

    const [profile, setProfile] = useState<UserProfile | null>(null);

    const isOwnProfile = currentUser?.username === username;
    const canSeeContent = isOwnProfile || profile?.isFollowing;

    const { getYPosition, scrollTo } = useScroll();

    // Cambiado a 18 según tu código
    const GRID_LIMIT = 18;

    const extraParams = useMemo(() => [username ?? ""], [username]);

    // Verificamos si los posts en Redux pertenecen al usuario actual
    const isSameUser = currentUsername === username;
    // 🟢 ESTA ES TU LISTA REAL: Si es el mismo usuario, usamos Redux; si no, empezamos de cero.
    const displayPosts = isSameUser ? persistedPosts : [];

    // --- CONFIGURACIÓN DEL HOOK ---
    const {
        posts: hookPosts, // Los usamos solo para sincronizar
        loading: loadingPosts,
        hasMore: hookHasMore,
        lastElementRef,
        page: hookPage
    } = useInfiniteScroll({
        apiService: GetUserPostsApi,
        extraParams: extraParams,
        limit: canSeeContent ? GRID_LIMIT : 0,
        // Hidratamos el hook para que sepa en qué página va
        initialPage: isSameUser ? persistedPage : 1,
        initialPosts: displayPosts,
        initialHasMore: isSameUser ? persistedHasMore : true
    });

    // --- EFECTO 1: SINCRONIZAR HOOK -> REDUX ---
    useEffect(() => {
        if (hookPosts.length > 0 && username) {
            dispatch(setProfilePosts({
                posts: hookPosts,
                username: username,
                page: hookPage,
                hasMore: hookHasMore
            }));
        }
    }, [hookPosts, hookPage, hookHasMore, username, dispatch]);

    // --- EFECTO 2: RESTAURACIÓN DE SCROLL (Solo Grid) ---
    useLayoutEffect(() => {
        if (isSameUser && scrollPosition > 0 && persistedPosts.length > 0) {
            // instant para que el usuario no vea el "desplazamiento"
            scrollTo(scrollPosition);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSameUser]);

    // --- EFECTO 3: CARGA DE PERFIL ---
    useEffect(() => {
        if (username) {
            dispatch(GetApi([username], GetUserByUserNameApi));
        }
    }, [username, dispatch]);

    // --- EFECTO 4: SINCRONIZACIÓN DE PERFIL ---
    useEffect(() => {
        let isMounted = true;
        if (ok && apiMethod === GetUserByUserNameApi.name && data) {
            const userProfile = data as UserProfile;
            const hasChanged = !profile || profile.id !== userProfile.id || profile.isFollowing !== userProfile.isFollowing;
            if (hasChanged && isMounted) {
                const updateProfile = () => {
                    setProfile(userProfile);
                };
                updateProfile();
            }
        }
        return () => { isMounted = false; };
    }, [ok, data, apiMethod, profile]);

    // --- HANDLERS ---
    const handlePostClick = (postId: string) => {
        // Guardamos scroll solo del Grid
        const currentY = getYPosition();
        dispatch(setScrollPosition(currentY));
        navigate(`${ROUTES.PROFILE_FEED(username ?? "")}?post=${postId}`);
    };

    const handleToggleFollow = () => {
        if (!profile) return;
        setProfile(prev => {
            const wasFollowing = prev?.isFollowing;
            const followers = prev?._count?.followers ?? 0;
            return {
                ...prev,
                isFollowing: !wasFollowing,
                _count: { ...prev?._count, followers: followers + (wasFollowing ? -1 : 1) }
            } as UserProfile;
        });
        dispatch(PostApi([profile.id ?? ""], ToggleFollowApi));
    };

    return (
        <div className="w-full flex flex-col min-h-screen bg-white dark:bg-black text-black dark:text-white relative">
            {apiLoading && !profile && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-black">
                    <FontAwesomeIcon icon={faCircleNotch} className="text-4xl text-blue-500 animate-spin mb-4" />
                </div>
            )}

            {/* Profile Header */}
            <div className="p-1 md:p-8">
                <div className="flex items-center gap-6 md:gap-12">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border border-gray-100 dark:border-zinc-800 shrink-0 bg-zinc-100">
                        <img src={getAvatarSrc(profile?.avatarUrl)} alt={username} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col flex-1 gap-3">
                        <span className="text-sm font-medium text-zinc-500 lowercase px-1">@{username}</span>
                        <div className="flex justify-between max-w-sm">
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-base">{profile?._count?.posts || 0}</span>
                                <span className="text-[10px] uppercase text-zinc-400 font-bold">Chelfies</span>
                            </div>
                            <button onClick={() => canSeeContent && navigate(`${ROUTES.FOLLOWERS(username ?? "")}?tab=followers`)} className="flex flex-col items-center">
                                <span className="font-bold text-base">{profile?._count?.followers || 0}</span>
                                <span className="text-[10px] uppercase text-zinc-400 font-bold">Followers</span>
                            </button>
                            <button onClick={() => canSeeContent && navigate(`${ROUTES.FOLLOWERS(username ?? "")}?tab=following`)} className="flex flex-col items-center">
                                <span className="font-bold text-base">{profile?._count?.following || 0}</span>
                                <span className="text-[10px] uppercase text-zinc-400 font-bold">Following</span>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Bio y Botones */}
                <div className="mt-4 px-1 space-y-3">
                    <div>
                        <h1 className="font-bold text-sm">{profile?.displayName || username}</h1>
                        <p className="text-sm mt-0.5 text-zinc-700 dark:text-zinc-300">{profile?.bio || "No bio yet."}</p>
                    </div>
                    {isOwnProfile ? (
                        <button onClick={() => navigate(ROUTES.SETTINGS)} className="w-full py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold">Edit Profile</button>
                    ) : (
                        <button onClick={handleToggleFollow} className={`w-full py-1.5 rounded-lg text-xs font-bold ${profile?.isFollowing ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-blue-500 text-white'}`}>
                            {profile?.isFollowing ? 'Following' : 'Follow'}
                        </button>
                    )}
                </div>
            </div>

            {/* Grid Section */}
            <div className="border-t dark:border-zinc-900 mt-2 flex-1">
                {canSeeContent ? (
                    <>
                        <div className="grid grid-cols-3 gap-0.5 p-0.5">
                            {/* 🟢 SOLUCIÓN: Mapeamos displayPosts (Redux), no hookPosts */}
                            {displayPosts.map((post, index) => {
                                return (
                                    <div
                                        key={post.id}
                                        ref={displayPosts.length === index + 1 ? lastElementRef : null}
                                        onClick={() => handlePostClick(post.id ?? "")}
                                        className="aspect-square relative cursor-pointer bg-zinc-100 dark:bg-zinc-900 group"
                                    >
                                        <img src={post.imageUrl?.startsWith('http') ? post.imageUrl : `${Url}${post.imageUrl}`} alt="" className="w-full h-full object-cover" />
                                        {post.isPinned && (
                                            <div className="absolute top-2 right-2 z-10">
                                                <FontAwesomeIcon icon={faThumbtack} className="text-white text-[10px] -rotate-45 drop-shadow-md" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {loadingPosts && (
                            <div className="flex justify-center p-6">
                                <FontAwesomeIcon icon={faCircleNotch} className="text-xl animate-spin text-zinc-400" />
                            </div>
                        )}
                        {!hookHasMore && displayPosts.length > 0 && (
                            <div className="py-10 text-center">
                                <p className="text-xs text-zinc-500 font-medium uppercase">End of Chelfies</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 border-2 border-black dark:border-white rounded-full flex items-center justify-center mb-4"><FontAwesomeIcon icon={faLock} className="text-2xl" /></div>
                        <h2 className="font-bold text-sm">This account is private</h2>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileGrid;