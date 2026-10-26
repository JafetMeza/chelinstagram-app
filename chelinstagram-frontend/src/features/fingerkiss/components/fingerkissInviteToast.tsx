import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '@/components/context/socketContext';
import { getAvatarSrc } from "@/helpers/imageUtils";
import { ROUTES } from "@/routes";
import { User } from "@/types/schema";
import FingerprintOval from "./fingerprintOval";

const INVITE_TIMEOUT_MS = 30000;

type FingerkissInvite = { conversationId: string; from: Partial<User> | null; };

// Aviso global: la invitación puede llegar estando en cualquier pantalla
const FingerkissInviteToast = () => {
    const { socket } = useSocket();
    const navigate = useNavigate();
    const location = useLocation();
    const [invite, setInvite] = useState<FingerkissInvite | null>(null);

    useEffect(() => {
        if (!socket) return;
        const handleInvited = (payload: FingerkissInvite) => {
            // Si ya estamos en esa sala no hace falta avisar
            if (location.pathname === ROUTES.FINGERKISS(payload.conversationId)) return;
            setInvite(payload);
        };
        socket.on('fingerkiss_invited', handleInvited);
        return () => {
            socket.off('fingerkiss_invited', handleInvited);
        };
    }, [socket, location.pathname]);

    useEffect(() => {
        if (!invite) return;
        const timeout = setTimeout(() => setInvite(null), INVITE_TIMEOUT_MS);
        return () => clearTimeout(timeout);
    }, [invite]);

    if (!invite) return null;

    const name = invite.from?.displayName || invite.from?.username || 'Alguien';

    const respond = (accepted: boolean) => {
        socket?.emit('fingerkiss_respond', { conversationId: invite.conversationId, accepted });
        if (accepted) {
            navigate(ROUTES.FINGERKISS(invite.conversationId), { state: { partner: invite.from } });
        }
        setInvite(null);
    };

    return (
        <div className="fixed top-3 inset-x-3 z-70 flex justify-center pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm flex items-center gap-3 p-3 rounded-2xl bg-zinc-900 text-white shadow-2xl border border-zinc-800 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="relative shrink-0">
                    <img src={getAvatarSrc(invite.from?.avatarUrl)} className="w-11 h-11 rounded-full object-cover" alt="avatar" />
                    <FingerprintOval className="absolute -bottom-1 -right-1 w-4 h-[22px] text-pink-400 bg-zinc-900 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{name}</p>
                    <p className="text-xs text-zinc-400">Te invita a un Fingerkiss 💋</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button onClick={() => respond(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 active:opacity-60">
                        Ahora no
                    </button>
                    <button onClick={() => respond(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-600 active:opacity-60">
                        Entrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FingerkissInviteToast;
