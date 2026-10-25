# AGENTS.md

Guía para agentes de IA (Claude Code, Codex, Copilot, etc.) que trabajen en este repositorio.

## Qué es

**Chelinstagram** es una red social privada (PWA mobile‑first) para dos personas: feed de "Chelfies" (foto/video), historias temporales, perfiles con seguidores y chat en tiempo real con notificaciones push.

El repo es un monorepo **sin workspace raíz**: cada app tiene su propio `package.json` y `pnpm-lock.yaml`.

| Carpeta | App | Stack |
| --- | --- | --- |
| `chelinstagram-frontend/` | SPA/PWA | React 19, Vite 7, Tailwind 4, Redux Toolkit, React Router 7, socket.io-client, vite-plugin-pwa (`injectManifest`) |
| `chelinstragram-backend/` | API REST + WebSocket | Express 5, Prisma 7 (PostgreSQL vía `@prisma/adapter-pg`), socket.io, JWT, Multer, Supabase Storage, ffmpeg, web-push |

> Ojo: la carpeta del backend se llama `chelinstragram-backend` (con **r** extra). No la renombres.

## Comandos

Usa **pnpm** siempre (el frontend bloquea `npm` vía `engines`).

### Frontend (`chelinstagram-frontend/`)

```bash
pnpm install
pnpm dev             # http://localhost:3000
pnpm build           # tsc -b && vite build
pnpm lint            # eslint (hay errores previos de react-hooks/set-state-in-effect; no agregues nuevos)
pnpm generate:types  # regenera src/types/schema.d.ts desde el Swagger del backend (backend corriendo en :3001)
```

### Backend (`chelinstragram-backend/`)

```bash
pnpm install         # postinstall ejecuta prisma generate
pnpm dev             # tsx watch src/index.ts -> http://localhost:3001 (Swagger en /api-docs)
pnpm build           # tsc -> dist/
npx tsc --noEmit     # verificación de tipos
pnpm db:migrate      # prisma migrate dev (las migraciones están en .gitignore)
pnpm db:seed
docker compose up -d # Postgres local
```

No hay suite de tests automatizados. Como mínimo verifica **`npx tsc --noEmit` en backend** y **`pnpm build` en frontend** antes de abrir un PR.

## Variables de entorno

Backend (`.env` en `chelinstragram-backend/`, se carga solo fuera de producción):
`DATABASE_URL`, `DATABASE_URL_DEV`, `JWT_SECRET` (**obligatoria**), `REFRESH_SECRET`, `FRONTEND_URL`, `USE_LOCAL_STORAGE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PORT`, `NODE_ENV`.

Frontend (`.env` en `chelinstagram-frontend/`): `VITE_API_URL` (sin `/api` al final), `VITE_VAPID_PUBLIC_KEY`.

Nunca commitees `.env` ni secretos.

## Arquitectura

### Backend

- `src/index.ts` — arma Express, Swagger, socket.io (middleware JWT en el handshake) y **registra todas las rutas**. Si agregas un endpoint, regístralo aquí.
- `src/controllers/*.ts` — un controller por dominio (`auth`, `chat`, `feed`, `interaction`, `user`, `story`, `notification`). Los comentarios `@openapi` de JSDoc generan el Swagger; mantenlos al día porque de ahí salen los tipos del frontend.
- `src/schemas/*.schema.ts` — schemas OpenAPI (componentes), no validación en runtime.
- `src/sockets/socketHandler.ts` — eventos de tiempo real (`send_message`, `typing`, `stop_typing`, presencia) y `notifyNewStory`. Si el destinatario no tiene sockets abiertos se envía web push.
- `src/middleware/authMiddleware.ts` — `authenticateToken` deja `req.user = { userId, username }`.
- `src/config/` — Prisma client y configuración de auth.
- `prisma/schema.prisma` — modelos. Los contadores `likesCount` / `commentCount` en `Post` están **desnormalizados**: actualízalos en la misma transacción que crea/borra likes o comentarios.

Reglas de seguridad que deben mantenerse:
- Todo endpoint/evento de chat debe validar que el usuario sea **participante** de la conversación.
- Nunca devuelvas `password` ni `refreshToken` de `User`; usa `select` explícito.
- No loguees cuerpos de peticiones que puedan contener credenciales.

### Frontend

- `src/App.tsx` — rutas; `src/routes/index.ts` — constantes `ROUTES`.
- `src/pages/*` son wrappers de 4 líneas; la lógica vive en `src/features/<dominio>/{pages,components,lib}`.
- **Capa de API**: `src/service/api.service.ts` define funciones `XxxApi`; se despachan con `GetApi` / `PostApi` (`src/redux/middleware/httpMethod.mid.ts`). El resultado cae en el slice **global y único** `state.apiData` (`{ ok, data, apiMethod, loading }`). Los componentes reaccionan con un `useEffect` que filtra por `apiMethod === XxxApi.name`. Consecuencia: solo hay una respuesta "viva" a la vez; evita disparar dos peticiones en paralelo cuyo resultado necesites en el mismo componente.
- `src/components/context/authenticationContext.tsx` — silent refresh con cookie httpOnly y protección de rutas.
- `src/components/context/socketContext.tsx` — un socket por sesión; expone `socket`, `isConnected`, `onlineUsers`. Cada componente que haga `socket.on(...)` debe hacer `socket.off(...)` del **mismo handler** en el cleanup.
- `src/sw.ts` — service worker (precache + push). Con `injectManifest`, la opción `workbox.runtimeCaching` de `vite.config.ts` no aplica.
- Alias `@/` → `src/`.

## Convenciones

- TypeScript estricto, componentes funcionales, Tailwind para estilos (con variantes `dark:`).
- Textos de UI mayormente en español; comentarios en español o inglés indistintamente. Sigue el estilo del archivo que edites.
- Commits estilo Conventional Commits: `feat(scope): ...`, `fix(scope): ...`, `chore: ...`.
- Ramas (git flow): `main` = producción, `develop` = integración, `feature/*` desde `develop`, `hotfix/*` desde `main` (luego se integra también a `develop`).
- Versiones: `package.json` de frontend y backend se mantienen en la misma versión; súbela en releases y hotfixes.
- Si cambias contratos de la API, actualiza los `@openapi` y regenera `src/types/schema.d.ts`.
