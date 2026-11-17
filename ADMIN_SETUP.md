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

## Crear las dos cuentas

1. Instala dependencias con `npm install`.
2. Define las variables anteriores en el entorno local o en el host.
3. Ejecuta `npm run seed:admins` una vez. El script crea las cuentas con hashes bcrypt y conserva sus contraseñas si ya existen.
4. Ejecuta `npm start` para iniciar el sitio y el API.

El panel está en `/admin.html`. Las contraseñas nunca se devuelven al navegador ni se muestran en el panel.
