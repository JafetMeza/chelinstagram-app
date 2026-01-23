import { useState, useEffect, useMemo } from 'react';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi } from "@/redux/middleware/httpMethod.mid";
import { SearchUsersApi } from "@/service/api.service";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { SearchUser } from "@/types/schema";
import { getAvatarSrc } from "@/helpers/imageUtils";

const Search = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { data, loading, ok, apiMethod } = useAppSelector(state => state.apiData);

    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<SearchUser[]>([]);

    // 1. Create a persistent Subject stream for the search input
    const searchSubject = useMemo(() => new Subject<string>(), []);

    useEffect(() => {
        // 2. Setup the RxJS Pipe logic
        const subscription = searchSubject.pipe(
            debounceTime(400),           // Wait for 400ms pause in typing
            filter(val => val.trim().length > 0), // Don't search empty strings
            distinctUntilChanged()        // Only search if the value actually changed
        ).subscribe((searchTerm) => {
            dispatch(GetApi([searchTerm], SearchUsersApi));
        });

        // 3. Cleanup on unmount
        return () => subscription.unsubscribe();
    }, [searchSubject, dispatch]);

    // Handle incoming data from Redux
    useEffect(() => {
        if (ok && apiMethod === SearchUsersApi.name) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUsers(data as SearchUser[]);
        }
    }, [ok, apiMethod, data]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        searchSubject.next(value); // Push the new value into the RxJS stream
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
            {/* Search Input */}
            <div className="p-4 sticky top-0 bg-white dark:bg-black z-10">
                <div className="relative flex items-center">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 text-gray-500 text-sm" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full bg-gray-100 dark:bg-zinc-900 py-2 pl-10 pr-4 rounded-lg outline-none text-sm"
                        value={query}
                        onChange={handleInputChange}
                        autoFocus
                    />
                    {loading && (
                        <FontAwesomeIcon icon={faCircleNotch} className="absolute right-3 animate-spin text-blue-500" />
                    )}
                </div>
            </div>

            {/* Results Grid (Insta-style list) */}
            <div className="flex-1 overflow-y-auto px-4">
                {query.length > 0 ? (
                    users.length > 0 ? (
                        users.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => navigate(`/profile/${user.username}`)}
                                className="flex items-center gap-3 py-3 cursor-pointer active:opacity-60 transition-opacity"
                            >
                                <img
                                    src={getAvatarSrc(user.avatarUrl)}
                                    className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-zinc-800"
                                    alt={user.username}
                                />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{user.username}</span>
                                    <span className="text-zinc-500 dark:text-zinc-400 text-xs">{user.displayName}</span>
                                </div>
                            </div>
                        ))
                    ) : !loading && (
                        <p className="text-center text-zinc-500 mt-10 text-sm italic">No users found.</p>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center mt-20 text-zinc-500">
                        <FontAwesomeIcon icon={faSearch} className="text-4xl mb-2 opacity-20" />
                        <p className="text-sm">Search for Chela or friends</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;