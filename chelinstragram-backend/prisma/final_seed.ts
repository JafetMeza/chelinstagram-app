
import { prisma } from './database';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string
);

async function main() {
  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('!Q2w3e4r5', 10);
  const grace_password = await bcrypt.hash('05-17ramenBelgium', 10);

  // We only create data here. 
  // On the internet server, the DB will be empty anyway.

  // Create User
  const me = await prisma.user.create({
    data: {
      username: 'abraham_meza',
      displayName: 'Abraham Meza',
      password: password,
      bio: `Entrepreneur, engineer and CEO of Chelinstagram 🏎️`,
      avatarUrl: ""
    }
  });
  const official = await prisma.user.upsert({
    where: { username: 'chelinstagram' },
    update: {},
    create: {
      username: 'chelinstagram',
      displayName: 'Chelinstagram Official',
      password: password,
      bio: 'Official tutorials and updates for the app. 🛠️',
      avatarUrl: ""
    },
  });

  const graciela = await prisma.user.upsert({
    where: { username: 'graciela2aa' }, // Updated username
    update: {},
    create: {
      username: 'graciela2aa',
      displayName: 'Graciela Alvarez',
      password: grace_password,
      bio: 'The inspiration behind the app. ❤️',
      avatarUrl: ""
    },
  });

  // 2. Setup Follow Relationships
  // Graciela follows Chelinstagram and Abraham
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: graciela.id, followingId: official.id } },
    update: {},
    create: { followerId: graciela.id, followingId: official.id },
  });
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: graciela.id, followingId: me.id } },
    update: {},
    create: { followerId: graciela.id, followingId: me.id },
  });

  // Abraham follows Graciela and Chelinstagram
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: me.id, followingId: graciela.id } },
    update: {},
    create: { followerId: me.id, followingId: graciela.id },
  });
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: me.id, followingId: official.id } },
    update: {},
    create: { followerId: me.id, followingId: official.id },
  });

  console.log('Follows established. Checking chat room...');

  // 3. CONVERSATION: Abraham & Graciela (The Personal Letter)
  const personalChat = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: me.id } } },
        { participants: { some: { userId: graciela.id } } }
      ]
    }
  });

  if (!personalChat) {
    await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: me.id }, { userId: graciela.id }]
        },
        messages: {
          create: {
            senderId: me.id,
            content: `Hola, mi amor,\n\nIf you are reading this, it means you solved the puzzle and successfully entered the vault. I wanted to give you something more than just a gift; I wanted to build a home for our memories. I spent the last few days hand-picking 161 photos of us—each one represents a moment where I was happy because I was with you.\n\nFrom our first message on 05-17, to our first trip to Belgium, and all the Ramen dates in between, you have been my greatest inspiration. This app is a work in progress, just like us, and I can't wait to keep adding more photos and more features as we continue our journey.\n\nExplore every corner, look through the photos, and know that every pixel here was coded with love for you.\n\nForever yours, Abraham.`
          }
        }
      }
    });
    console.log('Personal chat and letter created! 💌');
  }

  // 4. CONVERSATION: Chelinstagram & Graciela (The System Welcome)
  const systemChat = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: official.id } } },
        { participants: { some: { userId: graciela.id } } }
      ]
    }
  });

  if (!systemChat) {
    await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: official.id }, { userId: graciela.id }]
        },
        messages: {
          create: {
            senderId: official.id,
            content: `Welcome to Chelinstagram, Grace! 🏎️💨\n\nYou have successfully unlocked the most exclusive social network in the world. This platform was engineered with one purpose: to house the smiles, travels, and 'Chelfies' that belong to you and Abraham.\n\nFeel free to explore your history and like your favorite moments. Most importantly, remember that this space is yours, too! You can upload your own favorite pictures, write your own captions, and use this site however you want to keep our story growing.\n\nWe hope you enjoy the ride!`
          }
        }
      }
    });
    console.log('System welcome chat created! 🤖');
  }

  console.log("Seeding 161 posts into the cloud...");

  const imagesDir = path.join(__dirname, '../uploads'); // Path to your seed images

  const postsToSeed = [
    {
      authorId: me.id,
      imageUrl: '/uploads/1768947941156-125949362.jpg',
      caption: `¿Recuerdas este día? Porque yo no lo olvidaré jamás!!!`,
      location: 'Guadalajara',
      isPinned: false,
      createdAt: new Date('2021-05-17T22:25:41.161Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768947978482-377655870.jpg',
      caption: `El como comenzó todo....`,
      location: '',
      isPinned: false,
      createdAt: new Date('2021-05-17T22:26:18.483Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948005906-356203211.jpg',
      caption: `Mi primer regalo!!`,
      location: 'Ramen UMA UMA',
      isPinned: false,
      createdAt: new Date('2021-05-28T22:26:45.908Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948050428-204523452.jpg',
      caption: `Le pediré que sea mi novia, que nervios!!`,
      location: 'Mi casita',
      isPinned: false,
      createdAt: new Date('2021-07-06T22:27:30.430Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948170605-873238527.jpg',
      caption: `Me dijo que si!!!!!`,
      location: 'Gyropolus',
      isPinned: false,
      createdAt: new Date('2021-07-07T22:29:30.607Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948211207-515335966.jpg',
      caption: `7 horas hablando con mi NOVIA!!❤️`,
      location: '',
      isPinned: false,
      createdAt: new Date('2021-07-10T22:30:11.209Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948260839-73231257.jpg',
      caption: `Vean esta mujer tan increible, me vino a ver nadar😊💕`,
      location: 'Estadio Scotiabank',
      isPinned: false,
      createdAt: new Date('2021-08-01T22:31:00.841Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948297302-764338174.jpg',
      caption: `Disfrutando un día soleado con mi noviecita😘`,
      location: 'Parquecito de choco',
      isPinned: false,
      createdAt: new Date('2021-08-02T22:31:37.304Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948350101-854524380.jpg',
      caption: `Besos sabor mujer preciosa😍😍😍`,
      location: 'Parquecito de choco',
      isPinned: false,
      createdAt: new Date('2021-08-02T22:32:30.103Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948413419-680092301.jpg',
      caption: `Que guapos nos vemos mi amorcito😊`,
      location: '',
      isPinned: false,
      createdAt: new Date('2021-08-10T22:33:33.421Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948502393-668359145.jpg',
      caption: `A que no adivnas que compramos en este lugar!!👀👀👀`,
      location: 'Plaza patria',
      isPinned: false,
      createdAt: new Date('2021-08-17T22:35:02.394Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948543178-786166525.jpg',
      caption: `Mis dos comidas favoritas, ramencito y bebecita💕`,
      location: 'Peko peko',
      isPinned: false,
      createdAt: new Date('2021-08-20T22:35:43.180Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948677330-20542670.jpg',
      caption: `Dia de picnic😙😙 y musiquita con mi amorcito😍`,
      location: 'Parque metropolitano',
      isPinned: false,
      createdAt: new Date('2021-08-25T22:37:57.332Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948732956-111522414.jpg',
      caption: `Bicicletitas, café y muchas risas con mi personita especial`,
      location: 'La Minerva',
      isPinned: false,
      createdAt: new Date('2021-08-28T22:38:52.958Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948846369-41140685.jpg',
      caption: `Vean que guapisimos nos vemos mi amorcito y yo😍😙💕`,
      location: 'Parquecito de choco',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:40:46.371Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948933664-213409916.jpg',
      caption: `Que día tan increible a tu lado! Que guapisima te ves con esa faldita, te amo mucho mi amorcito😙❤️`,
      location: 'Gato café',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:42:13.666Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768948971412-871662007.jpg',
      caption: `Twining is winning✌️`,
      location: 'Casita de mi chiquis',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:42:51.414Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949002459-330301850.jpg',
      caption: `Viva el rock, los besos y Graciela Alvarez`,
      location: 'Auditorio Telmex',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:43:22.461Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949088143-885039021.jpg',
      caption: `Nuestra primera navidad!! Muchismas gracias por el libro de Mikel, sin duda alguna es el mejor regalo que alguien me ha dado en toda la vida, muchas gracias mi amor por el esfuerzo tan grande que se que hiciste, TE AMO!!!💕💕`,
      location: 'Casita de mi chiquis',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:44:48.145Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949173684-432129961.jpg',
      caption: `Un lugar especial con una mujer especial! No existe una foto que pueda retratar toda tu personalidad hasta que vi esta foto, gracias por existir.❤️`,
      location: 'Pajaretto',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:46:13.686Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949221223-409234392.jpg',
      caption: `Y seguimos celebrando nuestra primera navidad como noviecitos, vaya que nos encanta combinar nuestras ropitas jeje, te amo mucho`,
      location: 'Casita de mi chiquis',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:47:01.225Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949259064-366149945.jpg',
      caption: `Feliz navidad mi amor!!`,
      location: 'Casita de mi amorcito',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:47:39.066Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949315127-678410840.jpg',
      caption: `Graciela la mecanica! Jajaj muchas gracias por ayudarme a cambiar mi llanta bebecita`,
      location: 'La casita del novio de Grace',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:48:35.129Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949359999-362645349.jpg',
      caption: `Dieguito y Frida! Jajaja muchas gracias por invitarme mi amorcito, me divertí mucho`,
      location: 'Casa del jefecito de Grace',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:49:20.000Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949466307-922288908.jpg',
      caption: `¿Como ser feliz en la vida? Asi es clona a tu noviecita😝`,
      location: 'Mi casita',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:51:06.309Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949499883-663806914.jpg',
      caption: `Acuario y noviecita, no se le puede pedir nada más a la vida`,
      location: 'Acuario Michin',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:51:39.884Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949537815-354969198.jpg',
      caption: `Comprandole zapatos a mi chelita preciosa😙😍`,
      location: '',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:52:17.817Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949591502-322172836.jpg',
      caption: `Bosquecito!!!🌳🌳🌳`,
      location: 'Bosque de la primavera',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:53:11.504Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949639048-730675900.jpg',
      caption: `ABACHOOOO!!🌳🌳🌳😍😍😍❤️💕`,
      location: 'Bosque de la primavera',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:53:59.049Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949716314-53791272.jpg',
      caption: `Me trajo a ver a NO TE VA GUSTAR!!! Una novia más increible que ella no existe😝😝😝`,
      location: 'Teatro Galerias',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:55:16.316Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949763906-714220047.jpg',
      caption: `Disfrutando del concierto, pero yo disfruto más de esa hermosa sonrisa!!😍😍😍`,
      location: 'Teatro Galerías',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:56:03.908Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949808298-420442917.jpg',
      caption: `Que increible concierto! Afonicos y cansados pero con ella todo se vuelve mucho más sencillo y ameno`,
      location: '',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:56:48.300Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768949855525-146413799.jpg',
      caption: `Jajaj aqui con mi merch de NTVG. Gracias por todo Gracielita, te amo con todo mi ser!!!`,
      location: 'Mi casita',
      isPinned: false,
      createdAt: new Date('2026-01-20T22:57:35.526Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768950317088-143925955.jpg',
      caption: `Pajaretto y Gracielita, my new happy place😍❤️`,
      location: 'Pajaretto',
      isPinned: false,
      createdAt: new Date('2026-01-20T23:05:17.090Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768950359186-686763964.jpg',
      caption: `Nuestra primera playita!!! Que gran detalle de mi abuelito de mandarte esa piñita jaja😝💕`,
      location: 'San Blas',
      isPinned: false,
      createdAt: new Date('2026-01-20T23:05:59.188Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768950398993-73900294.jpg',
      caption: `Jajajaj quien diría que nuestra segunda playita sería Cancún`,
      location: 'Aeropuerto de Cancún',
      isPinned: false,
      createdAt: new Date('2026-01-20T23:06:38.995Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768950447075-217885797.jpg',
      caption: `VE NOMAS ESA VISTA!!!😍😍😍😍😍 Cancún también se ve algo lindo`,
      location: 'Playa Delfines',
      isPinned: false,
      createdAt: new Date('2026-01-20T23:07:27.077Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768950471297-429751908.jpg',
      caption: `Feliz como lombriz!!`,
      location: 'Cancún',
      isPinned: false,
      createdAt: new Date('2026-01-20T23:07:51.299Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768950503418-726335988.jpg',
      caption: `Grace con su suegrita preciosa jaja`,
      location: 'Isla Mujeres',
      isPinned: false,
      createdAt: new Date('2026-01-20T23:08:23.420Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1768950550617-992096444.jpg',
      caption: `Nuevamente Graciela siendo el paisaje más hermoso😍😍😍. Cancún esta x`,
      location: 'Isla mujeres',
      isPinned: false,
      createdAt: new Date('2026-01-20T23:09:10.619Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769019702939-980523837.jpg',
      caption: `Gracias por tan bonito viaje a tu lado😘💕❤️❤️`,
      location: 'Isla mujeres',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:21:42.945Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769019737851-932750332.jpg',
      caption: `Viajando a Veracruz con mi amorcito`,
      location: 'Veracruz',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:22:17.853Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769019782967-137043859.jpg',
      caption: `Jajaj la primera vez que me enseña a hacer una trenza, creo que necesito practicar más`,
      location: 'No se, no me acuerdo',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:23:02.969Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769019812973-608592550.jpg',
      caption: `No se porque dice que no le gusta el rosa si se le queda increible!!`,
      location: 'Casita de chelita',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:23:32.975Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769019845393-314481247.jpg',
      caption: `Puebleando ando con mi mochito`,
      location: 'Atotonilquillo',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:24:05.395Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769019867916-301137391.jpg',
      caption: `Modo rancheros #on`,
      location: 'Atotonilquillo',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:24:27.918Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769019923665-637844413.jpg',
      caption: `Un libro, un parque y una mujer preciosa, son las 3 cosas que necesitas para tenerlo todo en la vida`,
      location: 'Parquecito de choco',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:25:23.667Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769019989652-539323257.jpg',
      caption: `Ella me juraba que era imposible ser más hermosa. Vaya que es muy mentirosilla😍😍😍`,
      location: 'Casita de chelita',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:26:29.654Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020020008-762234916.jpg',
      caption: `Vean esa sonrisa!!!😍😍😍`,
      location: 'Casita de mi beibi',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:27:00.010Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020072230-610253433.jpg',
      caption: `Y que la invito a donde pasé más de 10 años de mi vida, muchas gracias por tan bonito día, me encanta pasear a todos lados contigo mochito.`,
      location: 'Hospicio Cabañas',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:27:52.232Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020102455-424378300.jpg',
      caption: `Zoológico Time!!!`,
      location: 'Zoológico Guadalajara',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:28:22.457Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020162910-103951682.jpg',
      caption: `Orgullosisimo de ti, felicidades por haberte animado a ir a nadar en aguas abiertas, te amo mucho muchisimo.`,
      location: 'Mantanchen',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:29:22.912Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020227042-818314153.jpg',
      caption: `Curioso que llegamos aquí por accidente, pero excelente lugar con excelente compañía.`,
      location: 'Restaurante Italiano del parque rojo',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:30:27.044Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020285977-878617426.jpg',
      caption: `Y otra carrera más a la bolsa, felicidades mi amor, aunque el clima no te dejó continuar pero muy orgulloso de tí por el gran esfuerzo que hiciste.`,
      location: 'Melaque',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:31:25.978Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020319964-508695209.jpg',
      caption: `Barranqueños en su habitad natural😝🌳🌳`,
      location: 'Puente de Arcediano',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:31:59.966Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020425344-491156116.jpg',
      caption: `Gracias por esperarme cuando me canso mi amorcito😝😝😘`,
      location: 'Barranca de Huentitan',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:33:45.346Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020494875-853476184.jpg',
      caption: `Fiestas de Octubre, en Guadalajara!🎶🎵🎶🎵🎶`,
      location: 'Auditorio Benito Juarez',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:34:54.877Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020537236-958017507.jpg',
      caption: `Besitos sabor a churro😍😘😍💕❤️`,
      location: 'Churrería la bombilla',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:35:37.238Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020604405-932015390.jpg',
      caption: `Y porque no ir 2 veces seguidas a las fiestas de Octubre`,
      location: 'Fiestas de Octubre',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:36:44.407Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020654115-253806037.jpg',
      caption: `Rock, cervecitas y alta cocina jaja, que gran día con mi amorcito`,
      location: 'Explanada UDG',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:37:34.116Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020694244-712944042.jpg',
      caption: `La mujer de verde se ha vuelto a poner el traje para rescatarme❤️`,
      location: 'Explanada UDG',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:38:14.246Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020737943-884791861.jpg',
      caption: `Estas lista para escuchar "La vieja escuela" otra vez??👀👀👀`,
      location: 'Explanada UDG',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:38:57.945Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020762008-220218113.jpg',
      caption: `We are the champions!!!`,
      location: 'Casita del jefecito de Grace',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:39:22.010Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020803406-156640047.jpg',
      caption: `Segunda navidad juntos!!! Muchas gracias por ayudarme a envolver todo mamochito`,
      location: 'Casita de bebecita',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:40:03.408Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020843299-371693290.jpg',
      caption: `Ballenita time!!🐳🐳🐳`,
      location: 'Mantanchen',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:40:43.301Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020937173-213757522.jpg',
      caption: `Y ella juraba que todavía era imposible verse aún más guapa y vean como sin intentarlo lo sigue logrando😍😍😍`,
      location: 'Zapopan',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:42:17.175Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769020958384-942840327.jpg',
      caption: `Arriba las chivas!!!!!`,
      location: 'Mi casita',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:42:38.385Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021002468-644301461.jpg',
      caption: `Tequila time!! Muchas gracias por tan bonita sorpresa mi amor, gracias por celebrar mi cumpleaños de esta manera.😙`,
      location: 'Tequila Jalisco',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:43:22.470Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021054324-983214936.jpg',
      caption: `Jaja aqui pensando que los unicos cenotes que quiero ver son los de mi amorcito😝😝😘`,
      location: 'Yucatan',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:44:14.326Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021088180-363429547.jpg',
      caption: `Foto para mi amorcito`,
      location: 'Playa Majahuel',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:44:48.182Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021149853-157801099.jpg',
      caption: `Nuestro primer viaje al extranjero juntos!!! Muchas gracias por invitarme a este increible país y por tan increible gorra!😝😙😘😍💕❤️`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:45:49.855Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021199879-958172977.jpg',
      caption: `Con lo de sol para poder observar tu deslumbrante belleza😍😘💕❤️`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:46:39.881Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021279096-523562355.jpg',
      caption: `Aqui pueden observar dos monumentos, por la derecha a Gracielita Alvarez😍😍😍, y el de la izquierda la catedral de Colonia`,
      location: 'Colonia Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:47:59.097Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021317266-51312386.jpg',
      caption: `Dos monumentos belgas captados en camara😍😍❤️`,
      location: 'Bruselas Belgica',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:48:37.268Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021357176-490371104.jpg',
      caption: `Que bellisima estas!!!!😍😍😍💕❤️😘😙😝`,
      location: 'Bruselas Belgica',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:49:17.178Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021426594-510022276.jpg',
      caption: `Europa y tú combinan😍😍💕❤️`,
      location: 'Ghent Belgium',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:50:26.596Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021475473-764620452.jpg',
      caption: `Quería un recuerdo de Brujas y que mejor que esta fotografía`,
      location: 'Brujas Belgica',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:51:15.475Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021504524-614241822.jpg',
      caption: `Feliz cumpleaños!!!! Te amo mucho mi amorcito`,
      location: 'Lugar de ramencito coreano',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:51:44.526Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021789710-320600039.jpg',
      caption: `Vean nomás a esta hermosura😍😍😍😍 Ella siempre se ve fantastica en todas las fotografías`,
      location: 'Fiestas de Octubre',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:56:29.711Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021838259-208184836.jpg',
      caption: `Y la traje a ver a Silvana Estrada, vean nomás esa cara de felicidad😍😍`,
      location: 'Conjunto Santander',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:57:18.260Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021860263-914457864.jpg',
      caption: `Foto capturada antes de la trajedia`,
      location: 'Tulum',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:57:40.265Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021894243-31352263.jpg',
      caption: `Atropellados y cansados, pero felices de estar juntitos`,
      location: 'Tulum',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:58:14.244Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021932578-942869434.jpg',
      caption: `SE DICE    G U A D A L A J A R A!!!!!😝😝😝`,
      location: 'Tulum',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:58:52.579Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769021967894-547789748.jpg',
      caption: `Vamos a ver a MIKEL IZAL!!!!!`,
      location: 'C3',
      isPinned: false,
      createdAt: new Date('2026-01-21T18:59:27.896Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022004621-875756695.jpg',
      caption: `No me importa el concierto, yo feliz de ver esta sonrisa siempre😙😙`,
      location: 'C3',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:00:04.623Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022087609-41076469.jpg',
      caption: `Tu no sabes hacer caras feas jajaj, que bella eres siempre😍😍😍`,
      location: 'Tlaquepaque',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:01:27.611Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022117440-817613272.jpg',
      caption: `Feliz con su vesitidito nuevo jaja, que guapa eres`,
      location: 'San Blas',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:01:57.442Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022158820-167768114.jpg',
      caption: `Y que me llega mi celularcito nuevo, y vean quien fue mi primer fotografía😍😍`,
      location: 'Mi cazumba',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:02:38.821Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022201435-318247040.jpg',
      caption: `Ramencito y cata de cerveza con mi chela favorita`,
      location: 'Hachiko Ramen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:03:21.437Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022247594-888695072.jpg',
      caption: `Que bonitos nos vemos jaja, te quiero mucho😝😝😙😍😘💕❤️`,
      location: 'Mi casita',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:04:07.595Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022280084-906877083.jpg',
      caption: `Tu jamás serás espectadora mi amorcito😍😍😍😝😙`,
      location: 'Casita de mi beibi',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:04:40.085Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022321211-165313975.jpg',
      caption: `No te va gustar 😝😝😝`,
      location: 'Guanamor',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:05:21.213Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022371596-590735833.jpg',
      caption: `Solo vine a presumir 2 cosas, 1 a mi noviecita, y 2 mi corte nuevo😝`,
      location: 'Guadalajara Centro',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:06:11.597Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022409267-373457657.jpg',
      caption: `Nuevo hobby desbloqueado, armar rompecabezas con mi amorcito😙😝💕`,
      location: 'Casita de mi beibi',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:06:49.268Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022451680-579794092.jpg',
      caption: `Una chelita capturada en su habitad natural😝😙😍😍`,
      location: 'Camecuaro Michoacan',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:07:31.682Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022492692-958129197.jpg',
      caption: `100 pesos a quien me diga todos los colores capturados en esta fotografía jaja.`,
      location: 'Camecuaro Michoachan',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:08:12.693Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022521708-159961735.jpg',
      caption: `Vengo a presumir que tengo nuevo fondo de pantalla😍😍😍`,
      location: 'La tetería',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:08:41.709Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022578666-46207647.jpg',
      caption: `Emocionada por su nueva tableta😙😙. Verás que la romperás muchisimo en tu maestría amor, todo mi apoyo en esta nueva etapa.`,
      location: 'Mi cazumba',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:09:38.668Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022621219-225582970.jpg',
      caption: `Ultimo viajecito a la playa antes del frabuyoso día, espero que lo disfrutes mucho amorcito.`,
      location: 'Manzanillo Colima',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:10:21.221Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022682358-304824887.jpg',
      caption: `Feliz cumpleaños!!! Gracias por dejarme estar otro cumpleaños más contigo, espero que Holanda te trate con mucho amor asi como tu me has tratado a mi a lo largo de estos 3 años juntos.`,
      location: 'Casita de choco',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:11:22.360Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022742824-233907497.jpg',
      caption: `Ultimo viajecito dentro de Mexico con mi amorcitaa😝😝. Muy bonito experimentar la ciudad de mexico contigo amor, cuidaré muchismo a mi ajolote jaja`,
      location: 'Bosque de Chapultepec',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:12:22.826Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022801592-275506401.jpg',
      caption: `Y nos vamos!!! Verás que te irá increible, eres espectacular te felicito mucho por esta nueva etapa en tu vida mi amorcito.`,
      location: 'Aeropuerto Internacional de Guadalajara',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:13:21.593Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769022952441-65907053.jpg',
      caption: `Volando a Cancún🛫. Proxima parada, Bruselas 🇧🇪`,
      location: 'Aeropuerto Internacional de Cancún',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:15:52.442Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023055207-566352221.jpg',
      caption: `Y llegamos a nuestra primera parada, Amberes, te amo mucho muchisimo amorcito, verás que todo saldrá esplendido`,
      location: 'Amberes Belgica',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:17:35.209Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023118113-319959142.jpg',
      caption: `Y ellos presumiendo que su chocolate es el más dulce cuando no han tenido el privilegio de probar tus dulces besos😙😍😍`,
      location: 'Amberes Belgica 🇧🇪',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:18:38.114Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023157979-592439573.jpg',
      caption: `Santo Dios jajaja estoy super cacheton, creo que alguien aqui no necesita más chocolate Belga`,
      location: 'Amberes Belgica',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:19:17.981Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023195072-54078912.jpg',
      caption: `Wageningen!!! Jajajaj piecitos de celebración`,
      location: 'Wageningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:19:55.073Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023221735-501398456.jpg',
      caption: `Jajjaja para que vean el POV de Grace`,
      location: 'Wageningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:20:21.737Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023263764-792148981.jpg',
      caption: `Grace ya confirmó que mi especialidad es el desayuno😌😌`,
      location: 'Wageningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:21:03.766Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023304891-171900678.jpg',
      caption: `Amo despertar y que estes ahi a un ladito😍😍😍😙`,
      location: 'Wageningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:21:44.892Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023335753-327086772.jpg',
      caption: `Chelita capturada nuevamente en su ambiente natural👀👀`,
      location: 'Wageningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:22:15.755Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023397383-471027616.jpg',
      caption: `Felicidades por tus nuevas amistades, espero te acompañen en esta nueva etapa con bien, te quiero mucho amorcito.`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:23:17.384Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023440941-718612267.jpg',
      caption: `Como me encataría quedarme aqui contigo, aunque para ser sincero yo soy feliz en donde sea que este a tu lado.`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:24:00.943Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023484852-675172018.jpg',
      caption: `Primer día de escuela, primer día de escuela!!!🐠🐠🐠`,
      location: 'Orion WUR',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:24:44.854Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023520868-602068007.jpg',
      caption: `Gracias por acompañarme a Rotterdam, el sueño de una vida conocer este magico lugar`,
      location: 'Rotterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:25:20.870Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023586944-70005673.jpg',
      caption: `Ultima fotito juntos, espero de todo corazón que te vaya excelente, sabes que aunque esté del otro lado del charco siempre puedes contar conmigo y que solo necesito un día para poder llegar contigo nuevamente.`,
      location: 'Utrech Netherlands',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:26:26.946Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023610044-942773638.jpg',
      caption: `Comprandome mi primer trajecito`,
      location: 'Zapopan',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:26:50.045Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023628935-805757306.jpg',
      caption: `Mi primer expo!!`,
      location: 'Expo Guadalajara',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:27:08.937Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023659974-559647642.jpg',
      caption: `Aqui viendo a los Charros de Jalisco`,
      location: 'Estadio de los Charros de Jalisco',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:27:39.976Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023694529-437886.jpg',
      caption: `Aqui con la sobri`,
      location: 'Mercado Bola Zapopan',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:28:14.531Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023731132-980971391.jpg',
      caption: `Here we go again!!, Jajaj esperemos que todo esto nutra a mi Gracielita`,
      location: 'Mi cazumba',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:28:51.134Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023764182-555478627.jpg',
      caption: `Un mariano captado en el aeropuerto de Guadalajara`,
      location: 'Aeropuerto de Guadalajara',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:29:24.184Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023790626-443518641.jpg',
      caption: `Un mariano captado en el aeropuerto de Cancún`,
      location: 'Aeropuerto de Cancún',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:29:50.628Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023829058-853879231.jpg',
      caption: `Un mariano llegando con su legitima y hermosa dueña😍😍😍😍😙`,
      location: 'Aeropuerto de Schipool',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:30:29.060Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023864209-563626555.jpg',
      caption: `Actua natural!! Y procede a hacer la pose más hermosa del mundo mundial😍😍😍`,
      location: 'Wageningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:31:04.212Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023893339-230215363.jpg',
      caption: `Y que me invita a ver a NTVG😍😍😝😝😝`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:31:33.341Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769023941431-423238728.jpg',
      caption: `Que nervios de poder ver a NTVG otra vez!!! Pero muy emocionado de siempre verlos con ella a mi lado😍😍😍`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:32:21.433Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024019985-876641001.jpg',
      caption: `Golpeados, cansados pero felices!! Gran concierto el que precensiamos, quien iba a decir que el sueño de toda mi vida de ir a verlos a ver a Uruguay se me iba a cumplir en Amsterdam jaja, muchas gracias por este gran y maravilloso día.`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:33:39.987Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024080108-984267410.jpg',
      caption: `Traje a una obra de arte con sus hermanitas lejanas, espero no se la quieran robar despues de esto👀👀`,
      location: 'Museo de Van Gogh',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:34:40.110Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024137974-213691198.jpg',
      caption: `Con una cara de enfermo que no se me quita con nada pero igualmente que día tan esplendido a tu lado amorcito.`,
      location: 'Museo de Van Gogh',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:35:37.976Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024187283-781051586.jpg',
      caption: `Es muy cansado se la mujer más guapa del mundo, dejenla descansar😝😝`,
      location: 'Museo de Van Gogh',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:36:27.285Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024241667-4388087.jpg',
      caption: `jajaj necesito un corte pero hasta Mexico que aqui sale caro`,
      location: 'Museo de Van Gogh',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:37:21.668Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024304206-302488988.jpg',
      caption: `Botecito en Amsterdam, cosas imperdibles si vienes de visita a este increible lugar, gracias por animarte a venir conmigo amorcito`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:38:24.208Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024334955-760884471.jpg',
      caption: `AMSTERDAM!!😝😝😙`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:38:54.957Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024390197-785393152.jpg',
      caption: `Pizzita y cervecitas con mi amorcita en un botecito en Amsterdam jaja, la buena vida😝😝`,
      location: 'Amsterdam',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:39:50.200Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024477761-188961295.jpg',
      caption: `Descubriendo que NEMO en Amsterdam no es un pez si no un museo muy divertido jajaj, gracias por invitarme aqui amorcito, pero no olvidar del paseo en bicicleta para poder llegar aqui jaja, increible todo amorcito.`,
      location: 'Nemo museum',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:41:17.763Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024530089-958976513.jpg',
      caption: `SU PRIMERA TORTILLA!!! jjajaja que bueno que traje mucha maseca, yo sabía que esto te hacía mucha falta`,
      location: 'Nueva casita de mi amorcito',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:42:10.091Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024561311-87151745.jpg',
      caption: `Apoco no me rifé con esta foto, lo unico que no me gustó es que no sale mi amorcito😝😝`,
      location: 'Wageningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:42:41.313Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024616876-196112611.jpg',
      caption: `Feliz cumpleaños!!!! Yo no me pierdo de ningún cumpleaños de mi amorcito, ni aunque este en otro continente. `,
      location: 'Wageningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:43:36.878Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024674191-14787096.jpg',
      caption: `De compras!!!😝😝😝 Eso de traerte despensa desde Mexico hizo que no me cupiera ropa jajaja Gracias por traerme a tan increible lugar`,
      location: 'Nijmegen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:44:34.193Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024698447-267720158.jpg',
      caption: `jajajja ayudaaa! me atoré`,
      location: 'WUR',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:44:58.449Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024736118-439178492.jpg',
      caption: `Chelita captada en ambiente natural😍😍❤️💕`,
      location: 'Wageningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:45:36.121Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024762176-401118913.jpg',
      caption: `Y nos vamos a Alemania otra vez!!`,
      location: '',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:46:02.178Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024803286-532123520.jpg',
      caption: `Que si no me ama esta mujer jajaj, miren como no se puede apartar ni un centimetro de mi`,
      location: 'Bremen Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:46:43.288Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024840808-28580298.jpg',
      caption: `En busca de esos mentados musicos👀👀 Espero que se puedan aventar unos cumbiones muy lokotes`,
      location: 'Bremen Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:47:20.810Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024866656-106242368.jpg',
      caption: `Shhhh estamos en misa👀👀`,
      location: 'Bremen Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:47:46.657Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769024904625-395361480.jpg',
      caption: `A Europa le hacias falta tú nunca al revez😍😍😍`,
      location: 'Bremen Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T19:48:24.628Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769033116476-575531474.jpg',
      caption: `No he conocido a nadie que tenga dentro tanto sol como tú, y no hablo de tu belleza sino de como se siente el mundo cuando tu estas cerca, ojala estuviera hablando de tú sonrisa o de la suavidad de tu mejilla, ojalá, porque bastaría con volver a mirar hacia otro lado para encontrarlo en alguien más, pero como se encuentra lo que solo nace de ti.`,
      location: 'Bremen Germany',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:05:16.478Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769033337118-613756468.jpg',
      caption: `Solo deseo un segundo a tu lado, uno tan simple y tan profundo como el silencio que compartimos, cuando las palabras ya no son necesarios. Un segundo donde el mundo desaparezca y solo quede el tibio sonido de tu respiración cerca de mi rostro, la paz que anida en tu regazo. Porque en ese latido suspendido cabe toda la eternidad: tu presencia calmando el tiempo, los segundos volviéndose nido, y este instante, suave e infinito, donde por fin descansa el alma.`,
      location: 'Hannover Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:08:57.119Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769033561637-304581674.jpg',
      caption: `Hoy tengo ganas de un café, no amargo, no dulce, sino de ese que habita en tus ojos, ese que no se sirve en taza alguna, porque solo tú sabes prepararlo. Un café oscuro profundo, que guarda silencios y secretos, pero que cuando la luz del sol lo acaricia brilla como si en su hondura se escondiera un amanecer eterno. Hoy tengo sed de esa mirada, del café que no despierta el cuerpo, sino el alma; ese sorbo invisible que solo tus ojos pueden brindarme, porque en ellos no se agota nunca el sabor de volver a empezar.`,
      location: 'Hannover Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:12:41.638Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769033700017-784625422.jpg',
      caption: `Si la vida es como estar en el mar, tu eres mi faro. No me empujas ni me jalas, solo me alumbras para que no me pierda. Cuando hay calma, me haces disfrutar el viaje; cuando hay tormenta, me recuerdas que puedo llegar. Hoy prometo seguir tu luz y también ser luz para ti.`,
      location: 'Hannover Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:15:00.018Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769033839155-294904328.jpg',
      caption: `Yo ya era así antes de que tú llegaras, caminaba por las mismas calles y comía las mismas cosas, incluso antes de tú llegaras yo ya vivía enamorado de ti y a veces no pocas, te extrañaba como si supiera que me hacías falta.`,
      location: 'Hannover Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:17:19.157Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769034157636-69942066.jpg',
      caption: `Que gran día a tu lado, organicé mi primer viaje pero te mentiría al decirte que no estaba improvisando todo el tiempo, sabía sobre el red thread pero ni idea de como comenzar ni tampoco que tanto íbamos a ver, pero eso fue lo emocionante si me lo preguntas, me hubiera encantado seguir continuando explorando aquí y allá, pero sin duda este día se queda como en uno de mis favoritos por siempre, muchas gracias por ser mi compañera de aventuras y por dejarte llevar en ese pequeño caos en Hannover, aún me queda pendiente ese viaje a Colonia para poder colocar nuestro candado :)`,
      location: 'Hannover Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:22:37.638Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769034261400-299231301.jpg',
      caption: `Nuestra última foto antes de irnos de este fabuloso lugar, muchas muchas gracias por tan increible aventura, espero podamos tener diecisiete mil más de estas, te amo mucho mi chaparrumpa😙❤️❤️`,
      location: 'Hannover Alemania',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:24:21.402Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769034353278-673342340.jpg',
      caption: `Mis 3 cosas favoritas en un solo lugar:
1. Mi novia
2: Librería
3: Una iglesia vieja
😝😝😝`,
      location: 'Maastricht',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:25:53.280Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769034422801-472280812.jpg',
      caption: `Increible que mi guía de turistas sea esta mujer tan preciosa😍😍😍`,
      location: 'Maastricht',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:27:02.803Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769034472022-260126780.jpg',
      caption: `Jajjaja ya se va a bañar y no encontraba sus chanclitas😝😝😍❤️`,
      location: 'Nueva casita de mi beibi',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:27:52.024Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769034536854-54320719.jpg',
      caption: `Mi novia me dice que me veo bien😙😙. Lo compro???👀👀`,
      location: 'La Haya',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:28:56.855Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769034588220-128491573.jpg',
      caption: `Queríamos ver la inspiración de nuestro cuadro favorito de Van Gogh😝😝`,
      location: 'Scheveningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:29:48.221Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769034661460-588041989.jpg',
      caption: `Quiero que todos mis días sean asi por el resto de mi vida!! Gracias por se la mejor guía de turistas, creo que en definitiva si te queda ya el "like a local" jaja aprendiste muy rápido, gracias por cuidarme tanto!!`,
      location: 'Scheveningen',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:31:01.462Z')
    },
    {
      authorId: me.id,
      imageUrl: '/uploads/1769034963902-553150205.jpg',
      caption: `Estas sonrisas enmascaran mucho lo que estábamos sintiendo ambos, esta es literalmente nuestra última fotografía juntos, la veo y aún puedo sentir todo el fuego dentro de irme de este lugar, de irme de tu lado, de dejar de despertar y verte ahí a un lado, de dejar de jugar a nuestra granjita, de dejar de explorar países extraños jaja, este viaje vaya que me encantó, me encantó que hiciste todo lo posible por hacerme sentir en casa, te juro que lo sentí así, en todo momento me sentí parte, como si todo el año que pasamos alejados verdaderamente no hubiera pasado, muchas gracias por todo amor, ya verás que pasará otro año volando como este que ya vivimos, te amo de aquí hasta Wageningen.❤️`,
      location: 'Aeropuerto de Schipool',
      isPinned: false,
      createdAt: new Date('2026-01-21T22:36:03.903Z')
    }
  ];

  for (const postData of postsToSeed) {
    try {
      // 1. Extract just the filename (e.g., "1768...jpg")
      const cleanFileName = postData.imageUrl.replace('/uploads/', '');
      const filePath = path.join(imagesDir, cleanFileName);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Skipping: File not found at ${filePath}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(filePath);

      // 2. Upload using the CLEAN filename
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chelinstagram-images')
        .upload(`memories/${cleanFileName}`, fileBuffer, { // Use cleanFileName here
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`❌ Upload failed for ${cleanFileName}:`, uploadError.message);
        continue;
      }

      // 3. Get the Public URL using the CLEAN filename
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(`memories/${cleanFileName}`); // Use cleanFileName here

      // 4. Save to Prisma
      await prisma.post.create({
        data: {
          authorId: postData.authorId,
          imageUrl: publicUrl,
          caption: postData.caption,
          location: postData.location,
          isPinned: false,
          createdAt: postData.createdAt
        }
      });

      console.log(`✅ Uploaded and Seeded: ${cleanFileName}`);
    } catch (err) {
      console.error(`💥 Fatal error seeding ${postData.imageUrl}:`, err);
    }
  }

  console.log("✨ All 161 memories are now safely in the cloud!");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
