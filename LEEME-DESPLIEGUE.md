# CV de Kayla — cómo subirlo

## Instalar y probar en tu computadora
1. Instala Node.js 20+ y Bun (https://bun.sh).
2. En esta carpeta: `bun install` y luego `bun run dev`.
3. Abre http://localhost:8080

El archivo `.env` ya trae la dirección y la llave pública de tu base de datos
(Lovable Cloud). Son públicas, no son contraseñas.

## Subir a GitHub
1. Crea un repositorio nuevo en github.com.
2. Sube el contenido de esta carpeta (sin `node_modules`).

## Subir a Vercel
1. En Vercel: "Add New Project" e importa tu repositorio de GitHub.
2. En "Environment Variables" agrega las 6 variables que están en `.env`.
3. Build command: `bun run build`.
   El proyecto está preparado por defecto para Cloudflare; si Vercel no lo
   reconoce, agrega también la variable `NITRO_PRESET=vercel`.

Tu información, tus PDFs y tu cuenta siguen guardados en Lovable Cloud, así que el
panel funciona igual desde cualquier hosting.
