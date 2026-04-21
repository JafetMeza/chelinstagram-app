import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { ResponseStatus } from "@/service/helpers/serviceConstants";
import { ROUTES } from "@/routes";
import { setLogin, setLogout } from "@/redux/ducks/auth";
import { AuthResponse } from "@/types/schema";
import { PostApi } from "@/redux/middleware/httpMethod.mid";
import { RefreshTokenApi } from "@/service/api.service";

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
    const refreshAttempts = useRef<number>(0);

    // CRÍTICO: Necesitamos este estado para "pausar" la App mientras el refresh sucede
    const [isRefreshing, setIsRefreshing] = useState(true);

    const apiData = useAppSelector(state => state.apiData);
    const authData = useAppSelector(state => state.authData);

    const GoToLogin = useCallback((): void => {
        navigate(ROUTES.LOGIN, { replace: true });
    }, [navigate]);

    const onLogin = useCallback((data: AuthResponse) => {
        dispatch(setLogin(data));
    }, [dispatch]);

    const onLogout = useCallback((): void => {
        setIsRefreshing(false);
        if (location.pathname !== ROUTES.LOGIN) {
            console.log("ON LOGOUT");
            refreshAttempts.current = 0;
            dispatch(setLogout());
            navigate(ROUTES.LOGIN, { replace: true });
        }
    }, [dispatch, navigate, location]);

    const triggerRefresh = useCallback(() => {
        setIsRefreshing(true); // Bloqueamos la App
        dispatch(PostApi([], RefreshTokenApi));
    }, [dispatch]);

    // EFECTO 1: Intento inicial de Silent Refresh
    useEffect(() => {
        if (!authData.accessToken || !authData.user?.username) {
            triggerRefresh();
        } else {
            setIsRefreshing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // EFECTO 2: Observador de resultados de Refresh
    useEffect(() => {
        if (apiData.apiMethod === RefreshTokenApi.name) {
            if (apiData.status === ResponseStatus.OK) {
                onLogin(apiData.data as AuthResponse);
                setIsRefreshing(false); // Éxito: Ya podemos mostrar la App
                refreshAttempts.current = 0;
            } else {
                onLogout(); // Fallo: Al login
            }
        }
    }, [apiData.apiMethod, apiData.data, apiData.status, dispatch, onLogout, onLogin]);

    // EFECTO 3: Reacción a errores 401 de otras peticiones
    useEffect(() => {
        if (apiData.status === ResponseStatus.NO_AUTH && apiData.apiMethod !== RefreshTokenApi.name && !isRefreshing) {
            if (refreshAttempts.current >= 1) {
                onLogout();
            } else {
                refreshAttempts.current += 1;
                console.log("REFRESHING DUE TO 401");
                triggerRefresh();
            }
        }
    }, [apiData.status, apiData.apiMethod, onLogout, triggerRefresh, isRefreshing]);

    // EFECTO 4: Protección de rutas (EL MURO)
    useEffect(() => {
        // SI ESTÁ REFRESCANDO, NO HACEMOS NADA. Esperamos.
        if (isRefreshing) return;

        const isPublicRoute = location.pathname === ROUTES.LOGIN;

        if (!authData.accessToken) {
            if (!isPublicRoute) GoToLogin();
        } else if (isPublicRoute) {
            navigate(ROUTES.HOME, { replace: true });
        }
    }, [authData.accessToken, isRefreshing, location.pathname, GoToLogin, navigate]);

    return (
        <AuthenticationContext.Provider value={{ GoToLogin, onLogout, onLogin }}>
            {/* Si isRefreshing es true, no renderizamos nada (o un loader) 
                para evitar que el Efecto 4 o los componentes hijos intenten actuar sin token */}
            {!isRefreshing ? children : null}
        </AuthenticationContext.Provider>
    );
}