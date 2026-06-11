import { useCallback } from 'react';

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