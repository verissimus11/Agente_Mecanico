# Changelog

Todos los cambios importantes de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

## [0.8.0] - 2026-02-21

### Agregado
- **Notificaciones WhatsApp**: Integración con WhatsApp Business API (Cloud API - Meta) para notificar al cliente en 4 estados clave: En revisión, Presupuesto pendiente, Esperando pieza y Listo
- **Envío de presupuesto PDF por WhatsApp**: Al subir el PDF de presupuesto, se envía automáticamente al cliente por WhatsApp
- **Teléfono del taller**: Campo opcional de teléfono al crear talleres, editable después desde el panel de gestión de talleres
- **Confirmación de cambio de estado**: Diálogo de confirmación antes de cada cambio de estado del vehículo, incluyendo aviso de notificación WhatsApp
- **Editar teléfono del taller**: Botón de edición de teléfono en la lista de talleres para owners y dueños

### Cambiado
- **Modal de usuarios**: Más ancho (680px vs 540px) y con grid mejorado que incluye selector de rol visible
- **Matrícula de ejemplo**: Cambiada de "3107 JBN" a "1234 ABC" para formato europeo más claro
- **Contraseña del owner**: Actualizada a nueva contraseña segura
- **Versión**: Bump a v0.8.0

### Mejorado
- **Modelo Workshop**: Métodos `create()` acepta teléfono, nuevo `setPhone()` para actualizar
- **Ruta workshops**: Nuevo endpoint `PATCH /workshops/:slug/phone` para actualizar teléfono
- **Base de datos**: Columna `phone` en tabla `workshops` (migración automática)
- **Servicio WhatsApp**: Módulo `services/whatsapp.js` con mensajes personalizados por estado

## [0.3.0] - 2026-02-17

### Agregado
- **Arquitectura multi-taller**: Tabla `workshops` con `id`, `name`, `slug` (único), `active`
- **Historial de estados**: Tabla `vehicle_logs` con `vehicle_id`, `status`, `note`, `created_at`
- **Endpoint público**: `GET /api/public/:slug/status/:plate` — devuelve estado + historial sin datos sensibles
- **Página pública de seguimiento**: `/:slug/status/:plate` con timeline visual tipo "seguimiento de paquete"
- **CRUD de talleres**: `POST /workshops`, `GET /workshops`, `GET /workshops/:slug`
- **Modelo Workshop**: `findBySlug`, `create`, `listActive`, `getOrCreateDefault`, `normalizeSlug`, `isValidSlug`
- **Modelo VehicleLog**: `create`, `findByVehicleId`, `findPublicByVehicleId`
- **Controlador público**: `PublicController.getVehicleStatus` — sanitiza inputs, no expone datos sensibles
- **Taller por defecto**: Se crea "Taller Demo" automáticamente al iniciar si no existe ninguno
- **URL de seguimiento**: Se muestra al registrar un vehículo en el panel admin
- **Foreign keys SQLite**: Habilitadas con `PRAGMA foreign_keys = ON`

### Cambiado
- **Tabla vehicles**: Nueva columna `workshop_id` (FK → workshops.id)
- **Todas las consultas de vehículos**: Filtran por `workshop_id` para separación lógica entre talleres
- **VehicleController.create**: Ahora crea un `vehicle_log` inicial ("Vehículo recibido") al registrar
- **VehicleController.updateStatus**: Cada cambio de estado genera un registro en `vehicle_logs` (atómico)
- **VehicleController.findById**: Ahora incluye historial completo (`logs`) en la respuesta
- **Vehicle.create**: Requiere `workshopId` como primer parámetro
- **Vehicle.getActive**: Filtrada por `workshopId`
- **Vehicle.updateStatus**: Filtrada por `workshopId`
- **Vehicle.findByPhone/findByPlate/findById**: Todas filtradas por `workshopId`
- **Rutas vehicles.js**: Middleware que inyecta `workshop_id` desde header `X-Workshop-Slug` o query `?workshop=`
- **server.js**: Monta rutas `/workshops`, `/api/public`, y `/:slug/status/:plate`
- **Banner de servidor**: Actualizado a v0.3.0 con info multi-taller
- **README**: Documentación completa de la nueva arquitectura multi-tenant

### Seguridad
- Sanitización de `slug` y `plate` en endpoint público (longitud máxima, caracteres válidos)
- Sin exposición de `id`, `phone`, `workshop_id` ni stack traces en respuestas públicas
- Queries parametrizadas en todos los modelos
- Validación de slug: 2-50 caracteres, solo letras/números/guiones

### Técnico
- Base de datos: 3 tablas (`workshops`, `vehicles`, `vehicle_logs`) con índices y foreign keys
- Índices: `idx_workshops_slug`, `idx_vehicles_workshop`, `idx_vehicle_logs_vehicle`, `idx_vehicle_logs_created`
- Arquitectura multi-tenant lógica: un backend, una BD, separación por `workshop_id`

---

## [0.1.2] - 2026-02-17

### Agregado
- Barra de búsqueda por matrícula con filtrado en tiempo real sobre datos ya cargados
- Mensaje cuando no hay resultados: "No se encontraron vehículos con esa matrícula."
- Endpoint `GET /vehicles/:id` documentado y disponible
- Iconos en badges de estado:
  - `EN_REVISION` → 🛠 En revisión
  - `ESPERANDO_PIEZA` → 📦 Esperando pieza
  - `PRESUPUESTO_PENDIENTE` → 📄 Presupuesto pendiente
  - `LISTO` → ✅ Listo

### Mejorado
- Selección de vehículo por click en fila (se elimina paso extra del botón "Seleccionar")
- Sección de cambio de estado con texto operativo cuando no hay selección
- Botones de estado deshabilitados de forma explícita hasta seleccionar vehículo
- Mensajes operativos de actualización con autocierre en 3 segundos
- Normalización de matrícula en frontend y backend (mayúsculas y sin espacios)
- Validación y normalización de teléfono para España (`+34` + 9 dígitos)
- Formato de fecha en español legible dentro de `generateStatusMessage()`
- Ajustes visuales sobrios: jerarquía, espaciado, sombras y transiciones

### Robustez
- Prevención de duplicados activos por matrícula mantenida y reforzada
- Orden de tabla garantizado por `updated_at DESC` en backend y frontend

## [0.1.1] - 2026-02-17

### Agregado
- **Endpoint adicional** `GET /vehicles/:id` para consultar vehículo por ID
- **Normalización automática** de matrículas (mayúsculas, sin espacios)
- **Validación de duplicados** - previene vehículos activos con misma matrícula
- **Logging mínimo** en backend para creación y actualización de vehículos
- **Tipografía moderna** con Google Font Inter
- **Colores sobrios y elegantes** para estados de vehículos

### Mejorado
- **Feedback visual** - mensajes de éxito desaparecen automáticamente tras 3 segundos
- **Bloqueo de botones** cuando no hay vehículo seleccionado
- **generateStatusMessage()** con texto más humano y fecha en español legible
- **Jerarquía visual** mejorada con mejores sombras y espaciado
- **Botones con bordes suaves** y transiciones más elegantes
- **Validación mejorada** de campos de entrada
- **Manejo de errores** más específico (ej: VEHICLE_ALREADY_ACTIVE)

### Cambiado
- **Base de datos**: SQLite en lugar de PostgreSQL para facilidad de desarrollo
- **Colores de estado**: Tonos más profesionales y sobrios
  - EN_REVISION → gris elegante
  - ESPERANDO_PIEZA → naranja suave  
  - PRESUPUESTO_PENDIENTE → azul profesional
  - LISTO → verde sobrio
- **Instalación simplificada**: No requiere configuración de PostgreSQL

### Técnico
- **Performance**: Optimización de consultas y índices
- **UX**: Mejor experiencia móvil con diseño responsive refinado
- **Robustez**: Mejor manejo de estados de error y validaciones

---

## [0.1.0] - 2026-02-17

### Agregado
- **Infraestructura mínima funcional** - Fase A del sistema
- Servidor Express con Node.js
- Conexión a PostgreSQL con pool de conexiones
- Modelo de datos `vehicles` con campos requeridos
- Endpoints API REST completos:
  - `POST /vehicles` - Crear vehículo
  - `GET /vehicles?active=true` - Listar vehículos activos
  - `PATCH /vehicles/:id/status` - Actualizar estado
  - `GET /vehicles/by-phone/:phone` - Buscar por teléfono
  - `GET /vehicles/by-plate/:plate` - Buscar por matrícula
- Estados de vehículo deterministas:
  - EN_REVISION
  - ESPERANDO_PIEZA
  - PRESUPUESTO_PENDIENTE
  - LISTO
- Función `generateStatusMessage()` determinista sin IA
- Frontend HTML puro con diseño responsive
- CSS mobile-first con botones grandes para estados
- JavaScript vanilla para interacciones sin recarga de página
- Validación básica de datos de entrada
- Manejo de errores robusto
- Índices de base de datos para consultas rápidas
- Trigger automático para `updated_at`
- Documentación completa en español
- Scripts SQL para creación de tabla
- Configuración de entorno con .env

### Características Técnicas
- Registro de vehículo: < 10 segundos
- Actualización de estado: < 2 segundos
- Compatible con Supabase
- Responsive design para móvil y escritorio
- Actualización automática cada 30 segundos
- Footer "Powered by Grupo Lance"

### Estructura del Proyecto
- `/server.js` - Servidor principal
- `/routes/vehicles.js` - Rutas de API
- `/controllers/vehicleController.js` - Lógica de negocio
- `/models/Vehicle.js` - Modelo de datos
- `/db/connection.js` - Conexión PostgreSQL
- `/db/schema.sql` - Script de base de datos
- `/public/` - Frontend estático
- `.env.example` - Template de configuración
- `README.md` - Documentación
- `CHANGELOG.md` - Este archivo

---

**Objetivos de Fase A cumplidos:**
- ✅ Sistema funcional local
- ✅ Validación para taller real
- ✅ Base sólida para Fase B (WhatsApp)
- ✅ Preparado para Fase C (IA inteligente)