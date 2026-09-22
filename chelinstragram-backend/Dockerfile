# Usa una versión de Node (ejemplo con la 18 o 20)
FROM node:20-bullseye-slim

WORKDIR /app

# Instalamos pnpm globalmente
RUN npm install -g pnpm

# Copiamos los archivos de dependencias y la carpeta prisma
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Instalamos TODAS las dependencias (el postinstall de prisma generate ahora sí encontrará el schema)
RUN pnpm install

# Copiamos el resto del código
COPY . .

# Construimos el proyecto (si usas TypeScript)
RUN pnpm build

# Exponemos el puerto
EXPOSE 3001

# Comando para iniciar
CMD ["pnpm", "start"]