import { useCallback, useLayoutEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { ROUTES } from '@/routes';

/**
 * Reinicia el scroll de #root en cada cambio de ruta.
 * Excepción: la cuadrícula de perfil (`/profile/:username`) restaura su propia
 * posición al volver desde un post, así que no se reinicia aquí.
 */
export const useScrollResetOnRouteChange = () => {
    const { pathname } = useLocation();

    useLayoutEffect(() => {
        if (matchPath({ path: ROUTES.PROFILE_PATH, end: true }, pathname)) return;
        const root = document.getElementById("root");
        if (root) root.scrollTop = 0;
    }, [pathname]);
};

export const useScroll = () => {
    // Buscamos el elemento que tú confirmaste que tiene el scroll
    const getRootElement = () => document.getElementById("root");

    const scrollToTop = useCallback(() => {
        const root = getRootElement();
        if (root) {
            root.scrollTop = 0; // Asignación directa
        }
    }, []);

    const scrollTo = useCallback((y: number) => {
        const root = getRootElement();
        if (root) {
            // 1. Intento inmediato
            root.scrollTop = y;

            // 2. Intento en el siguiente frame (por si React aún está pintando el Grid)
            // Esto asegura que si el contenido creció un milisegundo después, el scroll se aplique.
            requestAnimationFrame(() => {
                if (root) root.scrollTop = y;
            });
        }
    }, []);

    const getYPosition = useCallback((): number => {
        const root = getRootElement();
        return root ? root.scrollTop : 0;
    }, []);

    return { scrollToTop, scrollTo, getYPosition };
};