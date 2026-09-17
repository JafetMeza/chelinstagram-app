import webpush from 'web-push';
import { prisma } from "../config/database";
import { AuthRequest } from "../middleware/authMiddleware";
import { Response } from 'express';

// Configuramos la librería con tus llaves
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export const subscribePush = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const subscription = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ error: "Usuario no autenticado" });
            return;
        }

        // Upsert en la nueva tabla PushDevice (evita duplicados si es el mismo navegador)
        await prisma.pushDevice.upsert({
            where: { endpoint: subscription.endpoint },
            update: {
                subscription: subscription as any,
                userId: userId
            },
            create: {
                endpoint: subscription.endpoint,
                subscription: subscription as any,
                userId: userId
            }
        });

        res.status(201).json({ message: "Suscripción guardada con éxito." });
    } catch (error) {
        console.error("Error al guardar suscripción push:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// Utilidad para enviar push (la usaremos desde socketHandler)
export const sendPushToUser = async (userId: string, payload: any) => {
    try {
        // Buscamos todos los dispositivos registrados del usuario
        const devices = await prisma.pushDevice.findMany({
            where: { userId }
        });

        for (const device of devices) {
            try {
                await webpush.sendNotification(device.subscription as any, JSON.stringify(payload));
            } catch (err: any) {
                // Si el error es GONE (410), la suscripción caducó o el usuario quitó permisos.
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await prisma.pushDevice.delete({ where: { id: device.id } });
                } else {
                    console.error("Error al enviar push a dispositivo:", err);
                }
            }
        }
    } catch (error) {
        console.error("Error global en sendPushToUser:", error);
    }
};

export const unsubscribePush = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { endpoint } = req.body;
        const userId = req.user?.userId;

        if (!userId || !endpoint) {
            res.status(400).json({ error: "Faltan datos (endpoint)" });
            return;
        }

        // Borramos específicamente este dispositivo del usuario
        await prisma.pushDevice.deleteMany({
            where: {
                endpoint: endpoint,
                userId: userId
            }
        });

        res.status(200).json({ message: "Suscripción eliminada del dispositivo." });
    } catch (error) {
        console.error("Error al eliminar suscripción push:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};