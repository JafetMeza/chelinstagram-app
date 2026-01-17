import { Outlet } from 'react-router';
import { useContext } from 'react';
import { AuthenticationContext } from '@/components/context/authenticationContext';
import Navigation from './navigation';
import MobileHeader from './mobileHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { setTheme } from "@/redux/ducks/theme";
import { useAppDispatch } from "@/redux/hooks";
import useTheme from "../hooks/useTheme";

const Layout = () => {
    const { onLogout } = useContext(AuthenticationContext);
    const dispatch = useAppDispatch();
    const isDark = useTheme();


    // Sync theme with the HTML tag
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
        <div className="min-h-screen bg-white dark:bg-black flex flex-col lg:flex-row transition-colors duration-300">
            <MobileHeader isDark={isDark} toggleTheme={toggleTheme} />
            <Navigation />

            {/* Main Feed Area */}
            <main className="flex-1 pb-16 lg:pb-0 lg:ml-20 xl:ml-64 flex flex-col items-center">

                {/* 4. Utility Bar (Desktop Header/Actions) */}
                <div className="hidden lg:flex w-full max-w-157.5 justify-end gap-4 p-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Toggle Theme"
                    >
                        <FontAwesomeIcon
                            icon={!isDark ? faSun : faMoon}
                            className={`text-lg transition-colors ${!isDark ? 'text-yellow-400' : 'text-zinc-700'}`}
                        />
                    </button>
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-zinc-400 hover:text-red-600 transition-colors"
                        title="Logout"
                    >
                        <FontAwesomeIcon icon={faRightFromBracket} className="text-xl" />
                    </button>
                </div>

                <div className="w-full max-w-157.5">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;