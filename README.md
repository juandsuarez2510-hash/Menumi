# Menumi

Sitio de cocina asiático-colombiana en Bogotá y panel privado de administración.

## Desarrollo

Requiere Node.js 20 o posterior y una instancia de MongoDB Atlas.

```sh
npm install
npm start
```

Define `MONGODB_URI`, `MONGODB_DB` y `SESSION_SECRET` en el entorno. Para inicializar las dos cuentas de administración, define sus contraseñas como secretos `ADMIN_JUAN_SUAREZ_PASSWORD` y `ADMIN_JUAN_PUENTES_PASSWORD`, y ejecuta `npm run seed:admins` una vez.

La configuración completa está en [ADMIN_SETUP.md](ADMIN_SETUP.md). No subas `.env` ni valores secretos al repositorio.
