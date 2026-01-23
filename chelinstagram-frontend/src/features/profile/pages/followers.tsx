import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi } from "@/redux/middleware/httpMethod.mid";
import { GetFollowersApi, GetFollowingApi } from "@/service/api.service";
import { SearchUser } from "@/types/schema";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { ROUTES } from "@/routes";
import { getAvatarSrc } from "@/helpers/imageUtils";

const FollowersPage = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useAppDispatch();

    // Determine initial tab from URL query (?tab=followers)
    const activeTab = searchParams.get('tab') === 'following' ? 'following' : 'followers';

    const { ok, data, loading, apiMethod } = useAppSelector(state => state.apiData);
    const [users, setUsers] = useState<SearchUser[]>([]);

    useEffect(() => {
        if (username) {
            const api = activeTab === 'followers' ? GetFollowersApi : GetFollowingApi;
            dispatch(GetApi([username], api));
        }
    }, [username, activeTab, dispatch]);

    useEffect(() => {
        if (ok && (apiMethod === GetFollowersApi.name || apiMethod === GetFollowingApi.name)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUsers(data as SearchUser[]);
        }
    }, [ok, data, apiMethod]);

    const handleTabChange = (tab: 'followers' | 'following') => {
        setSearchParams({ tab });
        setUsers([]); // Clear list to show loader
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
            {/* Header */}
            <div className="flex items-center p-4 border-b dark:border-zinc-800 sticky top-0 bg-white dark:bg-black z-10">
                <button onClick={() => navigate(ROUTES.PROFILE(username ?? ""))} className="mr-4">
                    <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
                </button>
                <h1 className="font-bold text-lg">{username}</h1>
            </div>

            {/* Tabs */}
            <div className="flex border-b dark:border-zinc-800">
                <button
                    onClick={() => handleTabChange('followers')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'followers' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-zinc-400'}`}
                >
                    Followers
                </button>
                <button
                    onClick={() => handleTabChange('following')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'following' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-zinc-400'}`}
                >
                    Following
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4">
                {loading ? (
                    <div className="flex justify-center p-10">
                        <FontAwesomeIcon icon={faCircleNotch} className="text-3xl text-blue-500 animate-spin" />
                    </div>
                ) : users.length > 0 ? (
                    users.map((user) => (
                        <div
                            key={user.id}
                            onClick={() => navigate(ROUTES.PROFILE(user.username ?? ""))}
                            className="flex items-center gap-3 py-3 cursor-pointer active:opacity-60 transition-opacity"
                        >
                            <img
                                src={getAvatarSrc(user.avatarUrl)}
                                className="w-12 h-12 rounded-full object-cover border dark:border-zinc-800"
                                alt={user.username}
                            />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">{user.username}</span>
                                <span className="text-zinc-500 text-xs">{user.displayName}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-10 text-zinc-500 italic text-sm">
                        No {activeTab} yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowersPage;