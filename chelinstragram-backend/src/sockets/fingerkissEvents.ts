import { Server, Socket } from 'socket.io';
import { prisma } from '../config/database';
import { sendPushToUser } from '../controllers/notificationController';
import { isUserOnline, userRoom } from './presence';

/**
 * Fingerkiss: sala efímera por conversación donde ambos comparten la posición de su dedo.
 * Nada se guarda en la base de datos; las posiciones viajan normalizadas (0..1) al lienzo.
 */
const FINGERKISS_PREFIX = 'fingerkiss:';
const fingerkissRoom = (conversationId: string) => `${FINGERKISS_PREFIX}${conversationId}`;

const isNormalized = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

export const registerFingerkissEvents = (io: Server, socket: Socket, currentUserId: string) => {
    const user = socket.data.user;

    // Devuelve los demás participantes si el usuario pertenece a la conversación
    const getPartnerIds = async (conversationId: unknown) => {
        if (typeof conversationId !== 'string' || !conversationId) return null;
        const participants = await prisma.participant.findMany({
            where: { conversationId },
            select: { userId: true }
        });
        if (!participants.some(p => p.userId === currentUserId)) return null;
        return participants.map(p => p.userId).filter(id => id !== currentUserId);
    };

    const isInRoom = (conversationId: unknown): conversationId is string =>
        typeof conversationId === 'string' && socket.rooms.has(fingerkissRoom(conversationId));

    socket.on('fingerkiss_invite', async (data) => {
        const { conversationId } = data ?? {};
        try {
            const partnerIds = await getPartnerIds(conversationId);
            if (!partnerIds) return;

            const from = await prisma.user.findUnique({
                where: { id: currentUserId },
                select: { id: true, username: true, displayName: true, avatarUrl: true }
            });

            for (const partnerId of partnerIds) {
                if (isUserOnline(partnerId)) {
                    io.to(userRoom(partnerId)).emit('fingerkiss_invited', { conversationId, from });
                } else {
                    await sendPushToUser(partnerId, {
                        title: `${from?.displayName || user.username} te invita a un Fingerkiss 💋`,
                        body: 'Pon tu dedo en la pantalla',
                        url: `/chat/${conversationId}/fingerkiss`
                    });
                }
            }
        } catch (error) {
            console.error('Error en fingerkiss_invite:', error);
        }
    });

    socket.on('fingerkiss_respond', async (data) => {
        const { conversationId, accepted } = data ?? {};
        try {
            const partnerIds = await getPartnerIds(conversationId);
            if (!partnerIds) return;
            io.to(partnerIds.map(userRoom)).emit('fingerkiss_response', {
                conversationId,
                userId: currentUserId,
                accepted: accepted === true
            });
        } catch (error) {
            console.error('Error en fingerkiss_respond:', error);
        }
    });

    socket.on('fingerkiss_join', async (data) => {
        const { conversationId } = data ?? {};
        try {
            const partnerIds = await getPartnerIds(conversationId);
            if (!partnerIds) return;

            const room = fingerkissRoom(conversationId);
            await socket.join(room);

            // Quién más está ya en la sala (por usuario, no por socket)
            const sockets = await io.in(room).fetchSockets();
            const peers = Array.from(new Set(
                sockets
                    .map(s => s.data.user?.userId as string | undefined)
                    .filter((id): id is string => !!id && id !== currentUserId)
            ));

            socket.emit('fingerkiss_state', { conversationId, peers });
            socket.to(room).emit('fingerkiss_peer_joined', { conversationId, userId: currentUserId });
        } catch (error) {
            console.error('Error en fingerkiss_join:', error);
        }
    });

    const leaveRoom = async (conversationId: string) => {
        const room = fingerkissRoom(conversationId);
        await socket.leave(room);
        socket.to(room).emit('fingerkiss_peer_left', { conversationId, userId: currentUserId });
    };

    socket.on('fingerkiss_leave', async (data) => {
        const { conversationId } = data ?? {};
        if (!isInRoom(conversationId)) return;
        await leaveRoom(conversationId);
    });

    // Alta frecuencia: volatile para descartar paquetes viejos si la red va lenta
    socket.on('fingerkiss_touch', (data) => {
        const { conversationId, x, y } = data ?? {};
        if (!isInRoom(conversationId) || !isNormalized(x) || !isNormalized(y)) return;
        socket.volatile.to(fingerkissRoom(conversationId)).emit('fingerkiss_touch', {
            conversationId,
            userId: currentUserId,
            x,
            y
        });
    });

    socket.on('fingerkiss_release', (data) => {
        const { conversationId } = data ?? {};
        if (!isInRoom(conversationId)) return;
        socket.to(fingerkissRoom(conversationId)).emit('fingerkiss_release', {
            conversationId,
            userId: currentUserId
        });
    });

    // Si se cae la conexión avisamos en las salas en las que estaba
    socket.on('disconnecting', () => {
        for (const room of socket.rooms) {
            if (room.startsWith(FINGERKISS_PREFIX)) {
                socket.to(room).emit('fingerkiss_peer_left', {
                    conversationId: room.slice(FINGERKISS_PREFIX.length),
                    userId: currentUserId
                });
            }
        }
    });
};
