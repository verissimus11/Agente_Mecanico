# Changelog

Todos los cambios importantes de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

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