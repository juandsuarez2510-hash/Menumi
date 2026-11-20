# Menumi en Netlify

El sitio estático y el panel se publican en Netlify. Las rutas `/api/*` son funciones serverless y las cuentas se guardan en Netlify Database (Postgres). Esto evita una IP de salida de pago y no requiere abrir MongoDB Atlas a todo Internet. La base Atlas creada anteriormente queda sin uso; como aún no se habían cargado cuentas ni datos, no hay registros que migrar.

## Publicar el proyecto

1. Crea un proyecto en Netlify conectado al repositorio `juandsuarez2510-hash/Menumi`, con `main` como rama de producción.
2. Netlify usa `netlify.toml`: ejecuta `npm run build`, publica `dist/` y despliega `netlify/functions/`.
3. En el proyecto, crea o habilita Netlify Database desde **Data & Storage → Database**. La migración `0001_create_admins.sql` crea la tabla de administradores.
4. En **Project configuration → Environment variables**, define:
   - `ADMIN_JUAN_SUAREZ_PASSWORD`: contraseña inicial de Juan suarez.
   - `ADMIN_JUAN_PUENTES_PASSWORD`: contraseña inicial de Juan puentes.
5. Publica un nuevo deploy y abre `/admin.html`. Al primer inicio de sesión, las dos cuentas se insertan con hashes bcrypt; si ya existen, se conservan.

No guardes estos valores en GitHub, en archivos `.env` compartidos ni en el navegador. Netlify Database entrega la conexión internamente a las funciones. Las sesiones usan tokens aleatorios de corta duración, guardados como hash en la base y protegidos por una cookie `HttpOnly`.

## Nivel gratuito

Netlify Free incluye 300 créditos mensuales con límite estricto; no activa recargas ni cobra automáticamente. Las funciones y Netlify Database consumen créditos según el uso. La base gratuita entra en reposo tras cinco minutos sin actividad, por lo que una primera solicitud después de un periodo quieto puede tardar. Si se agota el límite, Netlify puede pausar el servicio hasta el siguiente periodo.

## URL

Después de crear el proyecto, sustituye el enlace de GitHub Pages por la URL `https://<nombre-del-proyecto>.netlify.app`. No actives la redirección desde GitHub Pages antes de que el primer deploy de Netlify esté publicado.
