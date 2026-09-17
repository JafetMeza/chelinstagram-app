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

const Layout = () => {
    const { onLogout } = useContext(AuthenticationContext);
    const dispatch = useAppDispatch();
    const isDark = useTheme();
    const location = useLocation(); // 👈 Hook para saber en qué URL estamos

    // Detectamos si estamos en la pantalla de settings (o podrías agregar la del chat aquí)
    const isSettingsRoute = location.pathname.includes('settings');

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
        // 1. Usamos min-h-[100dvh] en lugar de min-h-screen para evitar problemas con la barra de Safari/Chrome en celular
        <div className="min-h-[100dvh] bg-white dark:bg-black flex flex-col lg:flex-row transition-colors duration-300">

            {/* 2. Ocultamos el header móvil si estamos en Settings para evitar doble-header */}
            {!isSettingsRoute && <MobileHeader isDark={isDark} toggleTheme={toggleTheme} />}

            <Navigation />

            {/* Main Feed Area */}
            {/* 3. Aseguramos w-full para que la columna no colapse */}
            <main className="flex-1 w-full pb-16 lg:pb-0 lg:ml-20 xl:ml-64 flex flex-col items-center text-black dark:text-white">

                {/* Utility Bar (Desktop Header/Actions) */}
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

                    <Link
                        to={ROUTES.SETTINGS}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-400 hover:text-blue-500 transition-colors"
                        title="Settings"
                    >
                        <FontAwesomeIcon icon={faGear} className="text-xl" />
                    </Link>

                    <button
                        onClick={onLogout}
                        className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-zinc-400 hover:text-red-600 transition-colors"
                        title="Logout"
                    >
                        <FontAwesomeIcon icon={faRightFromBracket} className="text-xl" />
                    </button>
                </div>

                {/* Content Wrapper */}
                {/* 4. Quitamos p-4 en celular (p-0) y agregamos 'flex-1 flex flex-col' para que el Outlet pueda estirarse */}
                <div className="w-full flex-1 flex flex-col max-w-157.5 p-0 sm:p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;