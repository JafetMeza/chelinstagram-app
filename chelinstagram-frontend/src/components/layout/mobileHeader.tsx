import { useContext } from 'react';
import { AuthenticationContext } from '@/components/context/authenticationContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faRightFromBracket, faGear } from '@fortawesome/free-solid-svg-icons';
import { Link } from "react-router";
import { ROUTES } from "@/routes";

interface MobileHeaderProps {
    toggleTheme: () => void;
    isDark: boolean;
}


const MobileHeader = ({ toggleTheme, isDark }: MobileHeaderProps) => {
    const { onLogout } = useContext(AuthenticationContext);

    return (
        <header className="sticky top-0 w-full h-12 bg-white dark:bg-black border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-4 lg:hidden z-50">
            <h1 className="text-xl italic font-serif dark:text-white transition-colors">
                Chelinstagram
            </h1>

            <div className="flex items-center gap-5">
                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="focus:outline-none"
                    aria-label="Toggle Theme"
                >
                    <FontAwesomeIcon
                        icon={!isDark ? faSun : faMoon}
                        className={`text-lg transition-colors ${!isDark ? 'text-yellow-400' : 'text-zinc-700'}`}
                    />
                </button>

                <Link
                    to={ROUTES.SETTINGS}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-400 hover:text-blue-500 transition-colors"
                    title="Settings"
                >
                    <FontAwesomeIcon icon={faGear} className="text-xl" />
                </Link>

                {/* Logout Button */}
                <button
                    onClick={onLogout}
                    className="text-zinc-700 dark:text-zinc-400 focus:outline-none active:text-red-500"
                    aria-label="Logout"
                >
                    <FontAwesomeIcon icon={faRightFromBracket} className="text-lg" />
                </button>
            </div>
        </header>
    );
};

export default MobileHeader;