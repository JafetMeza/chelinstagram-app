// src/components/PwaUpdatePrompt.tsx
import { usePwaUpdate } from '../hooks/usePwaUpdate';

export function PwaUpdatePrompt() {
    const { needRefresh, updateServiceWorker, setNeedRefresh } = usePwaUpdate();

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
            <span>Nueva versión disponible</span>
            <button
                onClick={() => updateServiceWorker(true)}
                className="bg-white text-black px-3 py-1 rounded font-medium"
            >
                Actualizar
            </button>
            <button
                onClick={() => setNeedRefresh(false)}
                className="text-white/70 px-2"
            >
                ✕
            </button>
        </div>
    );
}