# Menumi

Sitio de cocina asiático-colombiana en Bogotá con panel privado de administración.

## Desarrollo local

Requiere Node.js 22 o posterior y Netlify CLI.

```sh
npm install
npm run dev
```

Netlify Dev inicia el sitio, las funciones y la base local de desarrollo. Define `ADMIN_JUAN_SUAREZ_PASSWORD` y `ADMIN_JUAN_PUENTES_PASSWORD` en el entorno local. La configuración de despliegue está en [ADMIN_SETUP.md](ADMIN_SETUP.md).

## Despliegue

Netlify construye los archivos públicos en `dist/`, despliega las funciones de `netlify/functions/` y aplica las migraciones de `netlify/database/migrations/`. Los secretos se configuran en el panel de Netlify y nunca se guardan en Git.
