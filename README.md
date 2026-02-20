# TallerFlow

Aplicación web para talleres mecánicos desarrollada por **Lance Systems**.

## Objetivo del sistema

- Gestionar vehículos por taller (`multi-tenant` por `workshop_id`).
- Actualizar estado operativo del vehículo y registrar historial (`vehicle_logs`).
- Compartir seguimiento público por URL segura: `/:slug/status/:plate/:trackingHash`.
- Mantener el panel interno protegido con autenticación por roles.

## Arquitectura (actual)

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL gestionado (en local también PostgreSQL)
- **Frontend interno:** HTML/CSS/JS (panel)
- **Frontend público:** `tracking.html` (solo lectura)

### Separación de acceso

- **Owner:** gestiona talleres y operación general.
- **Mechanic:** opera vehículos dentro de su taller asignado.
- **Cliente:** solo seguimiento público por URL, sin login.

## Seguridad implementada (pre-piloto)

- `JWT` para panel interno (`/auth/login`, `/auth/me`).
- Middleware `authenticate` + control de rol `requireRole`.
- Middleware `resolveWorkshopContext` para forzar contexto por usuario autenticado.
- `helmet` para headers de seguridad.
- `cors` configurable por variable de entorno.
- `express-rate-limit` en tracking público.
- Índice único parcial por taller para evitar matrículas activas duplicadas.

## Estructura de carpetas

- `server.js`: arranque, middlewares globales, routing principal, errores.
- `routes/auth.js`: login y validación de sesión.
- `routes/vehicles.js`: endpoints operativos de vehículos (protegidos).
- `routes/workshops.js`: endpoints de talleres (protegidos por rol).
- `routes/public.js`: API pública de tracking.
- `middleware/auth.js`: emisión/validación JWT y autorización por rol.
- `middleware/workshopContext.js`: resolución de `workshop_id` en backend.
- `controllers/vehicleController.js`: lógica de negocio de vehículos.
- `controllers/publicController.js`: lógica pública de seguimiento.
- `models/*.js`: acceso a datos de talleres/vehículos/logs.
- `db/pg-connection.js`: conexión, creación de tablas e índices PostgreSQL.

## Taller piloto por defecto

Si no existe contexto explícito, se crea/usa automáticamente el taller:

- **Nombre:** `Alua Odón Motor`
- **Slug:** `alua-odon-motor`

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `OWNER_USERNAME`, `OWNER_PASSWORD`
- `MECHANIC_USERNAME`, `MECHANIC_PASSWORD`, `MECHANIC_WORKSHOP_SLUG`
- `NODE_ENV`, `FORCE_HTTPS`, `CORS_ORIGIN`
- `TRACKING_RATE_WINDOW_MS`, `TRACKING_RATE_MAX`
- `TRACKING_HASH_SECRET` (recomendado para reforzar el token público)

## Levantar en local

1. Instalar dependencias:
   - `npm install`
2. Tener PostgreSQL activo y base creada (ejemplo: `tallerflow`).
3. Configurar `DATABASE_URL` en `.env`.
4. Iniciar:
   - `npm start`
5. Abrir panel:
   - `http://localhost:3000`

## Despliegue mínimo recomendado (piloto)

- Web Service Node en Render.
- PostgreSQL gestionado en Render (misma región).
- Dominio propio en Cloudflare + DNS a Render.
- SSL/TLS automático (HTTPS).

## Checklist go-live piloto (obligatorio)

- [ ] Variables de entorno de producción cargadas en Render.
- [ ] `CORS_ORIGIN` restringido a dominio real.
- [ ] `FORCE_HTTPS=true` en producción.
- [ ] Usuario owner/mecánico con credenciales definitivas.
- [ ] **Snapshots automáticos de PostgreSQL activados**.
- [ ] Prueba de restore (al menos una restauración de validación).
- [ ] Verificación de rutas públicas: no listar datos por `/:slug`.

## Endpoints relevantes

### Auth
- `POST /auth/login`
- `GET /auth/me`

### Panel (protegido)
- `GET /vehicles`
- `POST /vehicles`
- `PATCH /vehicles/:id`
- `PATCH /vehicles/:id/status`
- `POST /vehicles/:id/quote-pdf` (subir presupuesto PDF)
- `GET /vehicles/:id/quote-pdf` (ver presupuesto PDF)
- `GET /workshops`
- `POST /workshops` (owner)

### Público
- `GET /api/public/:slug/status/:plate/:trackingHash`
- `GET /:slug/status/:plate/:trackingHash` (página pública)

## Marca

- **Empresa:** Lance Systems
- **Aplicación:** TallerFlow
- Footer: `Powered by Lance Systems`
