# Usa una versión de Node (ejemplo con la 18 o 20)
FROM node:20-bullseye-slim

WORKDIR /app

# Instalamos pnpm globalmente
RUN npm install -g pnpm

# Copiamos los archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalamos TODAS las dependencias (incluyendo ffmpeg-static que hace la magia)
RUN pnpm install

# Copiamos el resto del código
COPY . .

# Generamos Prisma
RUN npx prisma generate

# Construimos el proyecto (si usas TypeScript)
RUN pnpm build

# Exponemos el puerto
EXPOSE 3001

# Comando para iniciar
CMD ["pnpm", "start"]