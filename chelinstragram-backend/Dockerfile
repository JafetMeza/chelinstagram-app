FROM node:20-bullseye-slim

WORKDIR /app

# 🟢 LA SOLUCIÓN: Instalamos pnpm versión 8 para evitar el bloqueo interactivo
RUN npm install -g pnpm@8

# Copiamos los archivos de dependencias y el esquema de Prisma
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Instalamos TODAS las dependencias (en la v8 esto ejecutará ffmpeg y prisma sin quejarse)
RUN pnpm install

# Copiamos el resto del código
COPY . .

# Construimos el proyecto (si usas TypeScript)
RUN pnpm build

# Exponemos el puerto
EXPOSE 3001

# Comando para iniciar
CMD ["pnpm", "start"]