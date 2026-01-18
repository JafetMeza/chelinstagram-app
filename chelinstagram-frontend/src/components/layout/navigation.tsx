import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSearch, faSquarePlus, faUser } from '@fortawesome/free-solid-svg-icons';
import { faMessage } from '@fortawesome/free-regular-svg-icons';
import { Link } from 'react-router-dom';
import { ROUTES } from "@/routes";

const Navigation = () => {
    const navItems = [
        { icon: faHome, label: 'Home', path: ROUTES.HOME },
        { icon: faSearch, label: 'Search', path: ROUTES.EXPLORE },
        { icon: faSquarePlus, label: 'Create', path: ROUTES.CREATE },
        { icon: faMessage, label: 'Messages', path: ROUTES.CHAT },
        { icon: faUser, label: 'Profile', path: ROUTES.PROFILE('me') }, // Example usage
    ];

    return (
        <>
            {/* MOBILE BOTTOM BAR */}
            <nav className="fixed bottom-0 w-full h-12 bg-white dark:bg-black border-t border-gray-200 dark:border-zinc-800 flex justify-around items-center lg:hidden z-50">
                {navItems.map((item) => (
                    <Link key={item.label} to={item.path} className="p-2">
                        <FontAwesomeIcon icon={item.icon} className="text-xl dark:text-white" />
                    </Link>
                ))}
            </nav>

            {/* DESKTOP SIDEBAR */}
            <nav className="hidden lg:flex fixed left-0 h-screen w-20 xl:w-64 border-r border-gray-200 dark:border-zinc-800 p-4 flex-col bg-white dark:bg-black dark:text-white">
                <h1 className="hidden xl:block text-2xl italic font-serif mb-10 px-2">Chelinstagram</h1>
                <div className="flex flex-col gap-4">
                    {navItems.map((item) => (
                        <Link key={item.label} to={item.path} className="flex items-center gap-4 p-3 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-lg group">
                            <FontAwesomeIcon icon={item.icon} className="text-xl group-hover:scale-110 transition-transform" />
                            <span className="hidden xl:block text-md">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
};

export default Navigation;