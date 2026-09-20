# Usamos una imagen ligera de Linux con Node.js
FROM node:20-bullseye-slim

# 🟢 EL TRUCO DE MAGIA: Instalamos FFmpeg en el servidor de Render
RUN apt-get update && apt-get install -y ffmpeg

# Configuramos nuestra carpeta de trabajo
WORKDIR /app

# Instalamos pnpm (ya que es tu gestor de paquetes)
RUN npm install -g pnpm

# Copiamos los archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalamos las dependencias
RUN pnpm install

# Copiamos todo el resto del código del backend
COPY . .

# Generamos el cliente de Prisma para que la base de datos funcione
RUN npx prisma generate

# Compilamos el TypeScript a JavaScript (asegúrate de tener "build": "tsc" en tu package.json)
RUN pnpm build

# Exponemos el puerto que usa Render
EXPOSE 3001

# Arrancamos la aplicación (ajusta esto si tu script de inicio se llama distinto)
CMD ["pnpm", "start"]