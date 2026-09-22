import { Outlet, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthenticationContext } from '@/components/context/authenticationContext';
import Navigation from './navigation';
import MobileHeader from './mobileHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faRightFromBracket, faGear } from '@fortawesome/free-solid-svg-icons';
import { setTheme } from "@/redux/ducks/theme";
import { useAppDispatch } from "@/redux/hooks";
import useTheme from "../hooks/useTheme";
import { Link } from 'react-router-dom';
import { ROUTES } from "@/routes";
import StoryTray from '@/features/stories/components/storyTray'; // 🟢 NEW

const Layout = () => {
    const { onLogout } = useContext(AuthenticationContext);
    const dispatch = useAppDispatch();
    const isDark = useTheme();
    const location = useLocation();

    const isSettingsRoute = location.pathname.includes('settings');
    const isHomeRoute = location.pathname === ROUTES.HOME; // 🟢 NEW

    const toggleTheme = () => {
        if (isDark) {
            dispatch(setTheme("light"));
            document.documentElement.classList.remove('dark');
        } else {
            dispatch(setTheme("dark"));
            document.documentElement.classList.add('dark');
        }
    };

    return (
        <div className="min-h-dvh bg-white dark:bg-black flex flex-col lg:flex-row transition-colors duration-300">
            {!isSettingsRoute && <MobileHeader isDark={isDark} toggleTheme={toggleTheme} />}

            <Navigation />

            <main className="flex-1 w-full pb-16 lg:pb-0 lg:ml-20 xl:ml-64 flex flex-col items-center text-black dark:text-white">

                <div className="hidden lg:flex w-full max-w-157.5 justify-end gap-4 p-4">
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors" title="Toggle Theme">
                        <FontAwesomeIcon icon={!isDark ? faSun : faMoon} className={`text-lg transition-colors ${!isDark ? 'text-yellow-400' : 'text-zinc-700'}`} />
                    </button>
                    <Link to={ROUTES.SETTINGS} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-400 hover:text-blue-500 transition-colors" title="Settings">
                        <FontAwesomeIcon icon={faGear} className="text-xl" />
                    </Link>
                    <button onClick={onLogout} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-zinc-400 hover:text-red-600 transition-colors" title="Logout">
                        <FontAwesomeIcon icon={faRightFromBracket} className="text-xl" />
                    </button>
                </div>

                {/* 🟢 NEW: Story tray sits above the feed content, only on Home */}
                {isHomeRoute && (
                    <div className="w-full max-w-157.5 px-0 sm:px-4 lg:px-8 pt-2">
                        <StoryTray />
                    </div>
                )}

                <div className="w-full flex-1 flex flex-col max-w-157.5 p-0 sm:p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;