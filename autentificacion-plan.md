**Sprint 2** (19 de octubre de 2026 → 23 de octubre de 2026) · **Área:** Backend · **Responsable:** Ángel Rafael Herrera Carvajal

Implementar en Laravel 11 el inicio y cierre de sesión con sesiones de servidor, la recuperación de contraseña por correo y los roles Laboratorista, productor y Jefe de laboratorio, con un middleware que restrinja cada ruta según el rol. Desplegar la primera versión en Render conectada a Supabase.

## Actividades

- [ ]  Laravel Breeze (React + Inertia): login, logout y recuperación de contraseña
- [ ]  Sesiones de servidor (driver database) y contraseñas con bcrypt (rounds = 13)
- [ ]  Desactivar el registro público: los usuarios los crea el Jefe de laboratorio
- [ ]  Columna rol en users y seeder con un usuario de prueba por rol
- [ ]  Middleware EnsureUserHasRole registrado en bootstrap/app.php y rutas agrupadas por rol
- [ ]  Bloquear el acceso a cuentas desactivadas
- [ ]  Compartir el usuario y su rol con React (HandleInertiaRequests) y ocultar opciones del menú según el rol
- [ ]  Dockerfile (PHP 8.3 + Nginx + build de Vite) y Web Service en Render
- [ ]  Conexión a Supabase por Session Pooler, variables de entorno y migraciones en el despliegue

## Criterios de aceptación

- [ ]  Un usuario puede iniciar y cerrar sesión y recuperar su contraseña por correo
- [ ]  Un Laboratorista que abre una ruta del Jefe recibe error 403
- [ ]  Un usuario desactivado no puede iniciar sesión
- [ ]  La aplicación está disponible en una URL pública de Render con HTTPS