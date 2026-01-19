import { createContext, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { ResponseStatus } from "@/service/helpers/serviceConstants";
import { ROUTES } from "@/routes";
import { setLogin, setLogout } from "@/redux/ducks/auth";
import { AuthResponse } from "@/types/schema";

interface IAuthenticationContext {
    GoToLogin: () => void;
    onLogout: () => void;
    onLogin: (authData: AuthResponse) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthenticationContext = createContext<IAuthenticationContext>({
    GoToLogin: () => { },
    onLogout: () => { },
    onLogin: () => { },
});

export default function AuthenticationProvider({
    children,
}: { children: React.ReactNode; }) {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const isLoggedIn = useRef(false);
    const apiData = useAppSelector(state => state.apiData);
    const authData = useAppSelector(state => state.authData);

    const GoToLogin = useCallback((): void => {
        navigate(ROUTES.LOGIN, { replace: true });
    }, [navigate]);

    useEffect(() => {
        const isPublicRoute = location.pathname === ROUTES.LOGIN;

        if (!authData.token) {
            isLoggedIn.current = false;
            // Only redirect if they are trying to access a protected page
            if (!isPublicRoute) {
                GoToLogin();
            }
        } else {
            isLoggedIn.current = true;
            // Optional: If they have a token and are on the Login page, send them Home
            if (isPublicRoute) {
                navigate(ROUTES.HOME, { replace: true });
            }
        }
    }, [authData.token, GoToLogin, location, navigate]);

    const onLogout = useCallback((): void => {
        isLoggedIn.current = false;
        dispatch(setLogout());
        navigate(ROUTES.LOGIN, { replace: true });
    }, [dispatch, navigate]);

    useEffect(() => {
        if (apiData.status === ResponseStatus.NO_AUTH) {
            onLogout();
        }
    }, [apiData.status, onLogout]);



    const onLogin = (data: AuthResponse) => {
        isLoggedIn.current = true;
        dispatch(setLogin(data));
    };

    return (
        <AuthenticationContext.Provider value={{ GoToLogin, onLogout, onLogin }}>
            {children}
        </AuthenticationContext.Provider>);
}