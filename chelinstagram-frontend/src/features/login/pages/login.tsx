import { useState, useContext, useEffect } from 'react';
import { AuthenticationContext } from '@/components/context/authenticationContext';
import { AuthResponse, LoginRequest } from '@/types/schema';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { PostApi } from "@/redux/middleware/httpMethod.mid";
import { LoginApi } from "@/service/api.service";
import { apiClear } from "@/redux/ducks/apiData";
import useTheme from "@/components/hooks/useTheme";

const LoginPage = () => {
    const { onLogin } = useContext(AuthenticationContext);
    const dispatch = useAppDispatch();
    useTheme();

    // 1. Destructure errorMessage from your apiData slice
    const { ok, apiMethod, loading, data, errorMessage } = useAppSelector(state => state.apiData);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (apiMethod === LoginApi.name) {
            if (ok) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setLocalError(null);
                const authResponse = data as AuthResponse;
                onLogin(authResponse);
                dispatch(apiClear());
            } else if (ok === false) {
                // 2. Map the server error to your local state
                setLocalError(errorMessage || "Invalid username or password");
                dispatch(apiClear());
            }
        }
    }, [ok, apiMethod, data, errorMessage, onLogin, dispatch]);

    const [formData, setFormData] = useState<LoginRequest>({
        username: '',
        password: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // 3. Clear the error when the user starts typing again
        if (localError) setLocalError(null);
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        dispatch(PostApi([formData], LoginApi));
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black p-4 transition-colors duration-300">
            <div className="w-full max-w-sm border border-gray-300 dark:border-zinc-800 bg-white dark:bg-black p-10 flex flex-col items-center rounded-sm shadow-sm">

                <h1 className="text-4xl font-semibold mb-8 italic font-serif text-black dark:text-white">
                    Chelinstagram
                </h1>

                <form onSubmit={handleLogin} className="w-full flex flex-col gap-2">
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        disabled={loading}
                        /* Added dark:text-white and dark:placeholder-zinc-500 */
                        className="w-full p-2 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-black dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 rounded-sm focus:outline-none focus:border-gray-500 dark:focus:border-zinc-500 disabled:opacity-50"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        disabled={loading}
                        /* Added dark:text-white and dark:placeholder-zinc-500 */
                        className="w-full p-2 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-black dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 rounded-sm focus:outline-none focus:border-gray-500 dark:focus:border-zinc-500 disabled:opacity-50"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    {localError && (
                        <p className="text-red-500 text-xs text-center my-2 font-medium">
                            {localError}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 bg-[#0095f6] hover:bg-[#1877f2] disabled:bg-[#b2dffc] dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 text-white font-semibold py-1.5 rounded-lg text-sm transition-colors"
                    >
                        {loading ? "Logging in..." : "Log in"}
                    </button>
                </form>

                <div className="mt-8">
                    <p className="text-xs text-gray-400 dark:text-zinc-500 text-center">
                        Private access for Abraham & Chela
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;