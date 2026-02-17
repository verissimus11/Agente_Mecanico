# TallerFlow - Sistema de Control Vehicular Multi-Taller

**Versión:** v0.3.0  
**Autor:** Grupo Lance  

## Descripción

Sistema de control vehicular centralizado para talleres mecánicos. Permite registrar vehículos, actualizar estados, generar historial tipo "seguimiento de paquete" y ofrecer URLs públicas de consulta para clientes.

Arquitectura **multi-tenant**: un solo backend, una sola base de datos, separación lógica por `workshop_id`. Cada taller tiene su propio slug para URLs públicas.

## Novedades v0.3.0

- **Multi-taller**: Tabla `workshops` con slug único para identificar cada taller
- **Historial de estados**: Tabla `vehicle_logs` — cada cambio de estado genera un registro automático
- **Seguimiento público**: Endpoint `GET /api/public/:slug/status/:plate` sin datos sensibles
- **Página pública**: `/:slug/status/:plate` con diseño responsive y timeline visual
- **Separación lógica**: Todas las consultas filtran por `workshop_id`
- **Taller por defecto**: Se crea automáticamente "Taller Demo" al iniciar si no existe

## Arquitectura

```
┌─────────────────────────────────────────────┐
│              TallerFlow (Cloud)              │
│                                              │
│  Express Server ──► SQLite/PostgreSQL        │
│                                              │
│  /vehicles          → API admin (por taller) │
│  /workshops         → CRUD talleres          │
│  /api/public/:slug  → API pública            │
│  /:slug/status/:p   → Página seguimiento     │
└─────────────────────────────────────────────┘
```

**Multi-tenant simple**: Sin aislamiento físico, solo separación lógica por `workshop_id`.

## Stack Tecnológico

- **Backend:** Node.js + Express
- **Base de datos:** SQLite (desarrollo) / PostgreSQL (producción)
- **Frontend:** HTML + CSS responsive + JavaScript vanilla
- **Arquitectura:** Multi-tenant lógico

## Instalación

### Requisitos Previos

- Node.js >= 16.0.0
- npm

### Pasos

```bash
cd Agente_Mecanico
npm install
npm start
```

La base de datos y el taller por defecto se crean automáticamente.

Acceder a: `http://localhost:3000`

## Modelo de Datos

### Tabla: workshops

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único (PK) |
| name | TEXT | Nombre del taller |
| slug | TEXT | Slug URL único (ej: `taller-martinez`) |
| active | BOOLEAN | Taller activo/inactivo |
| created_at | DATETIME | Fecha de creación |

### Tabla: vehicles

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único (PK) |
| workshop_id | UUID | FK → workshops.id |
| plate | TEXT | Matrícula del vehículo |
| phone | TEXT | Teléfono del cliente |
| status | ENUM | Estado actual |
| last_event | TEXT | Último evento registrado |
| updated_at | DATETIME | Última actualización |
| active | BOOLEAN | Vehículo activo/inactivo |

### Tabla: vehicle_logs

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único (PK) |
| vehicle_id | UUID | FK → vehicles.id |
| status | TEXT | Estado en ese momento |
| note | TEXT | Nota opcional |
| created_at | DATETIME | Fecha del evento |

### Estados Permitidos

| Estado | Descripción |
|--------|-------------|
| `EN_REVISION` | 🛠 En revisión |
| `ESPERANDO_PIEZA` | 📦 Esperando pieza |
| `PRESUPUESTO_PENDIENTE` | 📄 Presupuesto pendiente |
| `LISTO` | ✅ Listo para recoger |

## Endpoints API

### Talleres

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/workshops` | Listar talleres activos |
| POST | `/workshops` | Crear nuevo taller |
| GET | `/workshops/:slug` | Obtener taller por slug |

### Vehículos (Admin)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/vehicles` | Crear vehículo |
| GET | `/vehicles` | Listar vehículos activos del taller |
| PATCH | `/vehicles/:id/status` | Actualizar estado + generar log |
| GET | `/vehicles/by-phone/:phone` | Buscar por teléfono |
| GET | `/vehicles/by-plate/:plate` | Buscar por matrícula |
| GET | `/vehicles/:id` | Buscar por ID (incluye historial) |

> Los endpoints de vehículos usan el header `X-Workshop-Slug` o query `?workshop=slug` para contexto de taller. Si no se envía, usa el taller por defecto.

### Público (Sin autenticación)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/public/:slug/status/:plate` | Consultar estado + historial |

**Respuesta pública** (sin datos sensibles):
```json
{
  "workshop": { "name": "Taller Martínez", "slug": "taller-martinez" },
  "vehicle": { "plate": "ABC123", "status": "EN_REVISION", "updated_at": "..." },
  "logs": [
    { "status": "EN_REVISION", "note": "Vehículo recibido", "created_at": "..." }
  ]
}
```

### Página de Seguimiento Público

```
http://localhost:3000/{slug}/status/{plate}
```

Ejemplos:
- `http://localhost:3000/taller-martinez/status/ABC123`
- `http://localhost:3000/autoexpress/status/5678DEF`

Muestra: nombre del taller, matrícula, estado actual, última actualización, y timeline con historial completo tipo seguimiento de paquete.

## Estructura del Proyecto

```
Agente_Mecanico/
├── server.js                    # Servidor Express principal
├── package.json                 # Dependencias y scripts
├── README.md                    # Documentación
├── CHANGELOG.md                 # Historial de cambios
├── routes/
│   ├── vehicles.js              # Rutas admin de vehículos
│   ├── workshops.js             # Rutas CRUD talleres
│   └── public.js                # Rutas públicas de seguimiento
├── controllers/
│   ├── vehicleController.js     # Lógica admin de vehículos
│   └── publicController.js      # Lógica de consulta pública
├── models/
│   ├── Vehicle.js               # Modelo vehículos (multi-tenant)
│   ├── Workshop.js              # Modelo talleres
│   └── VehicleLog.js            # Modelo historial de estados
├── db/
│   └── sqlite-connection.js     # Conexión SQLite + esquema 3 tablas
└── public/
    ├── index.html               # Frontend admin
    ├── tracking.html            # Página pública de seguimiento
    ├── styles.css               # CSS responsive
    └── app.js                   # JavaScript admin
```

## Seguridad

- Sanitización de slug y plate en endpoint público
- Validación de longitud de inputs
- Sin exposición de IDs internos, teléfonos ni stack traces en respuestas públicas
- Queries parametrizadas (sin concatenación SQL)
- Foreign keys habilitadas en SQLite

## Scripts

```bash
npm start      # Iniciar servidor
npm run dev    # Alias de start
```

## Próximas Fases

- **Fase B:** Integración WhatsApp
- **Fase C:** Capa inteligente con IA
- Autenticación por taller
- QR dinámicos para seguimiento
- Dashboard de métricas por taller

## Soporte

**Desarrollado por:** Grupo Lance  
**Versión:** v0.3.0  
**Fecha:** 2026

---

*Arquitectura multi-tenant lista para escalar sin migraciones dolorosas.*