# Menumi en Netlify

El sitio estático y el panel se publican en Netlify. Las rutas `/api/*` son funciones serverless y las cuentas se guardan en Netlify Database (Postgres). Esto evita una IP de salida de pago y no requiere abrir MongoDB Atlas a todo Internet. La base Atlas creada anteriormente queda sin uso; como aún no se habían cargado cuentas ni datos, no hay registros que migrar.

No guardes estos valores en GitHub, en archivos `.env` compartidos ni en el navegador. Netlify Database entrega la conexión internamente a las funciones. Las sesiones usan tokens aleatorios de corta duración, guardados como hash en la base y protegidos por una cookie `HttpOnly`.

## Nivel gratuito

Netlify Free incluye 300 créditos mensuales con límite estricto; no activa recargas ni cobra automáticamente. Las funciones y Netlify Database consumen créditos según el uso. La base gratuita entra en reposo tras cinco minutos sin actividad, por lo que una primera solicitud después de un periodo quieto puede tardar. Si se agota el límite, Netlify puede pausar el servicio hasta el siguiente periodo.

## URL

La URL pública es [https://menumi-juandsuarez2510.netlify.app](https://menumi-juandsuarez2510.netlify.app). GitHub Pages redirige al sitio de Netlify cuando publique los cambios en `main`.
