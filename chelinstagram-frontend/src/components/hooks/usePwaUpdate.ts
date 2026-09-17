// src/hooks/usePwaUpdate.ts
import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePwaUpdate() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW();

    return { needRefresh, updateServiceWorker, setNeedRefresh };
}