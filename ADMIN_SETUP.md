# Configurar Menumi y el panel de administración

Menumi ahora requiere un servidor Node.js para guardar sesiones y autenticar administradores. GitHub Pages solo publica archivos estáticos, así que el sitio debe desplegarse en un host que ejecute Node.js y que pueda conectarse a MongoDB Atlas.

## Variables secretas

Configura estas variables en el panel privado del host. Para desarrollo local, copia `.env.example` a `.env` y completa los valores; `.env` está excluido de Git.

- `MONGODB_URI`: conexión a la base `menumi`. Usa un usuario de base de datos con permisos `readWrite` solo sobre `menumi`.
- `MONGODB_DB`: `menumi`.
- `SESSION_SECRET`: valor aleatorio largo, distinto de la contraseña de MongoDB.
- `ADMIN_JUAN_SUAREZ_PASSWORD`: contraseña inicial de Juan suarez.
- `ADMIN_JUAN_PUENTES_PASSWORD`: contraseña inicial de Juan puentes.
- `NODE_ENV`: `production` en el host.

No guardes estas variables en GitHub como archivos ni en el código del sitio. En Atlas, limita Network Access a la IP del host donde se ejecute Menumi; evita permitir todas las direcciones.

## Despliegue en Fly.io

El repositorio incluye `Dockerfile` y `fly.toml` para ejecutar el sitio y el API en una sola app en la región `gru` (São Paulo). Requiere una cuenta Fly.io con facturación habilitada. La configuración deja una máquina de 512 MB encendida para evitar esperas al abrir el sitio.

1. Instala `flyctl` e inicia sesión. Si `menumi-juandsuarez2510` ya está ocupado, cambia `app` en `fly.toml` y el destino de `pages-redirect.js` por el mismo nombre único.
2. Crea la app con `fly apps create menumi-juandsuarez2510`.
3. Asigna una IP de salida fija con `fly ips allocate-egress -r gru`. En MongoDB Atlas, añade esa IP a Network Access y usa un usuario de aplicación con permiso `readWrite` únicamente en `menumi`.
4. Define los secretos en Fly con `fly secrets set MONGODB_URI="..." SESSION_SECRET="..." ADMIN_JUAN_SUAREZ_PASSWORD="..." ADMIN_JUAN_PUENTES_PASSWORD="..."`. No pegues los valores en el repositorio ni en chats.
5. Despliega con `fly deploy` y ejecuta una vez `fly ssh console -C "npm run seed:admins"` para crear las cuentas; luego visita `https://menumi-juandsuarez2510.fly.dev/admin.html`.

Fly publica precios variables por región y consumo. A la tarifa publicada consultada, una máquina shared-cpu-1x de 512 MB encendida todo el mes cuesta alrededor de US$3.99/mes, y la IP saliente fija US$3.60/mes; transferencia y otros cargos se facturan aparte. Revisa el total en Fly antes de activar el servicio.

## Crear las dos cuentas

1. Instala dependencias con `npm install`.
2. Define las variables anteriores en el entorno local o en el host.
3. Ejecuta `npm run seed:admins` una vez. El script crea las cuentas con hashes bcrypt y conserva sus contraseñas si ya existen.
4. Ejecuta `npm start` para iniciar el sitio y el API.

El panel está en `/admin.html`. Las contraseñas nunca se devuelven al navegador ni se muestran en el panel.
