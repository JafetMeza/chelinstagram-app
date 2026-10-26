import { prisma } from '../config/database';
import { sendPushToUser } from '../controllers/notificationController';
import { getOnlineUserIds, isUserOnline } from './presence';

// Avisos de "X está en línea". Render (plan free) duerme el servidor y lo reinicia en cada
// deploy, así que la última conexión se guarda en la BD (User.lastSeenAt) y no en memoria.
const MIN_OFFLINE_MS = 5 * 60 * 1000;      // reconexiones por red inestable no avisan
const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000; // máximo un aviso cada 30 min por usuario
const HEARTBEAT_MS = 2 * 60 * 1000;        // lastSeenAt de los conectados se refresca cada 2 min

const lastNotifiedAt = new Map<string, number>();
let heartbeat: NodeJS.Timeout | null = null;

export const markLastSeen = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { lastSeenAt: new Date() } });
};

// Mientras estén conectados su lastSeenAt se mantiene fresco: si el servidor se reinicia
// sin pasar por 'disconnect', la reconexión no cuenta como "volvió después de mucho".
export const startPresenceHeartbeat = () => {
    if (heartbeat) return;
    heartbeat = setInterval(() => {
        markLastSeen(getOnlineUserIds()).catch(err => console.error('Presence heartbeat error:', err));
    }, HEARTBEAT_MS);
    heartbeat.unref();
};

// Se llama cuando el usuario abre su primer socket (pasa de offline a online)
export const notifyUserCameOnline = async (userId: string) => {
    const now = Date.now();
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, displayName: true, lastSeenAt: true }
    });
    if (!user) return;

    const wasAwayLongEnough = !user.lastSeenAt || now - user.lastSeenAt.getTime() >= MIN_OFFLINE_MS;
    const cooledDown = now - (lastNotifiedAt.get(userId) ?? 0) >= NOTIFY_COOLDOWN_MS;

    await markLastSeen([userId]);
    if (!wasAwayLongEnough || !cooledDown) return;

    // Personas con las que tiene conversación, que quieren el aviso y no están conectadas
    const conversations = await prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        select: {
            id: true,
            participants: {
                where: { userId: { not: userId }, user: { notifyOnlineEnabled: true } },
                select: { userId: true }
            }
        }
    });

    const name = user.displayName || user.username;
    const notified = new Set<string>();
    for (const conversation of conversations) {
        for (const { userId: partnerId } of conversation.participants) {
            if (notified.has(partnerId) || isUserOnline(partnerId)) continue;
            notified.add(partnerId);
            await sendPushToUser(partnerId, {
                title: `🟢 ${name} está en línea`,
                body: 'Entra a saludar 👋',
                url: `/chat/${conversation.id}`,
                tag: `online-${userId}`,
                skipIfVisible: true
            });
        }
    }
    if (notified.size > 0) lastNotifiedAt.set(userId, now);
};
