import { prisma } from './database';

async function syncCounts() {
    // Determinamos en qué base de datos estamos operando para el log
    const isDev = process.env.NODE_ENV !== 'production';
    const dbTarget = isDev ? "LOCAL 🛠️" : "SUPABASE ☁️";

    console.log(`🚀 Iniciando sincronización de contadores en: ${dbTarget}`);

    try {
        // 1. Obtenemos el conteo real desde las tablas de relación
        const posts = await prisma.post.findMany({
            include: {
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        if (posts.length === 0) {
            console.log("⚠️ No se encontraron posts para sincronizar.");
            return;
        }

        console.log(`📸 Procesando ${posts.length} posts...`);

        // 2. Ejecutamos las actualizaciones en una transacción para mayor seguridad
        const updates = posts.map(post => {
            return prisma.post.update({
                where: { id: post.id },
                data: {
                    likesCount: post._count.likes,
                    commentCount: post._count.comments
                }
            });
        });

        await prisma.$transaction(updates);

        console.log(`✅ Sincronización exitosa en ${dbTarget}.`);
    } catch (error) {
        console.error("❌ Error durante la sincronización:", error);
    } finally {
        await prisma.$disconnect();
    }
}

syncCounts();