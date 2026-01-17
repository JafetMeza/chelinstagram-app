import { prisma } from './database';
import * as bcrypt from 'bcrypt';

async function main() {
    console.log('--- STARTING COMPLETE SEED --- 🌱');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create/Update Users
    const official = await prisma.user.upsert({
        where: { username: 'chelinstagram' },
        update: {},
        create: {
            username: 'chelinstagram',
            displayName: 'Chelinstagram Official',
            password: hashedPassword,
            bio: 'Official tutorials and updates for the app. 🛠️',
        },
    });

    const abraham = await prisma.user.upsert({
        where: { username: 'abraham_meza' },
        update: {},
        create: {
            username: 'abraham_meza',
            displayName: 'Abraham Meza',
            password: hashedPassword,
            bio: 'Entrepreneur, engineer and CEO of Chelinstagram 🏎️',
        },
    });

    const graciela = await prisma.user.upsert({
        where: { username: 'graciela2aa' }, // Updated username
        update: {},
        create: {
            username: 'graciela2aa',
            displayName: 'Graciela',
            password: hashedPassword,
            bio: 'The inspiration behind the app. ❤️',
        },
    });

    const testUser = await prisma.user.upsert({
        where: { username: 'testUser' },
        update: {},
        create: {
            username: 'testUser',
            displayName: 'Beta Tester',
            password: hashedPassword,
            bio: 'Testing features and functionality.',
        },
    });

    console.log('Users created. Setting up follows...');

    // 2. Setup Follow Relationships
    // Graciela follows Chelinstagram and Abraham
    await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: graciela.id, followingId: official.id } },
        update: {},
        create: { followerId: graciela.id, followingId: official.id },
    });
    await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: graciela.id, followingId: abraham.id } },
        update: {},
        create: { followerId: graciela.id, followingId: abraham.id },
    });

    // Abraham follows Graciela and Chelinstagram
    await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: abraham.id, followingId: graciela.id } },
        update: {},
        create: { followerId: abraham.id, followingId: graciela.id },
    });
    await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: abraham.id, followingId: official.id } },
        update: {},
        create: { followerId: abraham.id, followingId: official.id },
    });

    console.log('Follows established. Checking chat room...');

    // 3. Ensure the private chat room exists between Abraham and Graciela
    const conversation = await prisma.conversation.findFirst({
        where: {
            AND: [
                { participants: { some: { userId: abraham.id } } },
                { participants: { some: { userId: graciela.id } } }
            ]
        }
    });

    if (!conversation) {
        await prisma.conversation.create({
            data: {
                participants: {
                    create: [
                        { userId: abraham.id },
                        { userId: graciela.id }
                    ]
                },
                messages: {
                    create: {
                        content: "Welcome to our private corner of the internet, Graciela! ❤️",
                        senderId: abraham.id
                    }
                }
            }
        });
        console.log('Chat room and welcome message created! ✅');
    }

    console.log('Seeding finished successfully! 🏁');
}

main()
    .then(async () => await prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });