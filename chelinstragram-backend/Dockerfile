FROM node:22-slim

WORKDIR /app

# Misma versión de pnpm que en local y en el CI; el lockfile es v9, pnpm 8 lo ignoraba
RUN npm install -g pnpm@11.0.8

# Copiamos los archivos de dependencias y el esquema de Prisma
# (pnpm-workspace.yaml trae allowBuilds: prisma, bcrypt, ffmpeg-static...)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

# Instalación reproducible: falla si el lockfile no coincide con package.json
RUN pnpm install --frozen-lockfile

# Copiamos el resto del código
COPY . .

# Construimos el proyecto (si usas TypeScript)
RUN pnpm build

# Exponemos el puerto
EXPOSE 3001

# Comando para iniciar
CMD ["pnpm", "start"]
