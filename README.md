# TallerFlow - Sistema de Control Vehicular

**Versión:** v0.1.1 - Fase A  
**Autor:** Grupo Lance  

## Descripción

Sistema de control vehicular para talleres mecánicos. Permite registrar vehículos, actualizar estados y generar mensajes deterministas basados en datos reales.

Esta es la **Fase A** - Infraestructura mínima funcional. No incluye IA generativa ni optimizaciones avanzadas.

## Objetivos de la Fase A

✅ Registrar un vehículo en menos de 10 segundos  
✅ Actualizar el estado en menos de 2 segundos  
✅ Consultar estado por matrícula o teléfono  
✅ Generar mensaje determinista basado en datos reales  

## Stack Tecnológico

- **Backend:** Node.js + Express
- **Base de datos:** SQLite (compatible con PostgreSQL/Supabase)
- **Frontend:** HTML puro + CSS responsive + JavaScript vanilla
- **ORM:** sqlite3 driver

## Instalación

### Requisitos Previos

- Node.js >= 16.0.0
- npm o yarn
- (No requiere PostgreSQL - usa SQLite local)

### Pasos de Instalación

1. **Clonar/Descargar el proyecto**
   ```bash
   cd Agente_Mecanico
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar servidor**
   ```bash
   npm start
   ```
   (La base de datos SQLite se creará automáticamente)

4. **Acceder a la aplicación**
   ```
   http://localhost:3000
   ```

## Uso del Sistema

### Registro de Vehículos

1. Completar formulario con matrícula y teléfono
2. Click en "Registrar Vehículo"
3. El estado inicial será "En Revisión"

### Actualización de Estados

1. Seleccionar vehículo en la tabla
2. Usar botones de estado:
   - **En Revisión** - Vehículo en proceso de diagnóstico
   - **Esperando Pieza** - Aguardando repuestos
   - **Presupuesto Pendiente** - Esperando aprobación del cliente
   - **Listo** - Vehículo terminado

### Consultas

- **Por matrícula:** `GET /vehicles/by-plate/:plate`
- **Por teléfono:** `GET /vehicles/by-phone/:phone`

## Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/vehicles` | Crear nuevo vehículo |
| GET | `/vehicles?active=true` | Listar vehículos activos |
| PATCH | `/vehicles/:id/status` | Actualizar estado |
| GET | `/vehicles/by-phone/:phone` | Buscar por teléfono |
| GET | `/vehicles/by-plate/:plate` | Buscar por matrícula |

### Ejemplo de Uso API

```bash
# Crear vehículo
curl -X POST http://localhost:3000/vehicles \
  -H "Content-Type: application/json" \
  -d '{\"plate\":\"ABC123\",\"phone\":\"+57 300 123 4567\"}'

# Actualizar estado
curl -X PATCH http://localhost:3000/vehicles/{id}/status \
  -H "Content-Type: application/json" \
  -d '{\"status\":\"LISTO\"}'

# Consultar por matrícula
curl http://localhost:3000/vehicles/by-plate/ABC123
```

## Estructura del Proyecto

```
Agente_Mecanico/
├── server.js              # Servidor principal Express
├── package.json           # Dependencias y scripts
├── .env.example          # Template de configuración
├── README.md             # Esta documentación
├── CHANGELOG.md          # Historial de cambios
├── routes/
│   └── vehicles.js       # Rutas de vehículos
├── controllers/
│   └── vehicleController.js # Lógica de negocio
├── models/
│   └── Vehicle.js        # Modelo de datos + función determinista
├── db/
│   ├── sqlite-connection.js  # Conexión SQLite
│   ├── connection.js         # Conexión PostgreSQL (legacy)
│   └── schema.sql           # Script de creación (PostgreSQL)
└── public/
    ├── index.html        # Frontend HTML
    ├── styles.css        # CSS responsive
    └── app.js            # JavaScript vanilla
```

## Modelo de Datos

### Tabla: vehicles

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único (PK) |
| plate | VARCHAR(20) | Matrícula del vehículo |
| phone | VARCHAR(20) | Teléfono del cliente |
| status | ENUM | Estado actual |
| last_event | TEXT | Último evento registrado |
| updated_at | TIMESTAMP | Fecha de última actualización |
| active | BOOLEAN | Vehículo activo/inactivo |

### Estados Permitidos

- `EN_REVISION` - En revisión
- `ESPERANDO_PIEZA` - Esperando pieza  
- `PRESUPUESTO_PENDIENTE` - Presupuesto pendiente
- `LISTO` - Listo

## Mensaje Determinista

La función `generateStatusMessage()` devuelve:

```
"Tu vehículo con matrícula {plate} está actualmente en estado {status}. Última actualización: {updated_at}. Te avisaremos cuando haya cambios."
```

**Características:**
- Sin variación en el mensaje
- Sin IA generativa
- Basado únicamente en datos reales
- Formato consistente en español

## Scripts Disponibles

```bash
npm start      # Iniciar servidor de producción
npm run dev    # Iniciar servidor de desarrollo (alias de start)
```

## Compatibilidad

- **Navegadores:** Chrome, Firefox, Safari, Edge (versiones modernas)
- **Dispositivos:** Responsive design para móvil y escritorio
- **Base de datos:** SQLite (desarrollo), PostgreSQL/Supabase (producción)

## Características Técnicas

### Performance
- Registro de vehículo: < 10 segundos
- Actualización de estado: < 2 segundos
- Índices en campos de búsqueda frecuente

### Seguridad
- Validación básica de datos
- Sanitización de entradas
- Manejo de errores robusto

### Frontend
- Sin frameworks pesados
- JavaScript vanilla optimizado
- CSS responsive mobile-first
- Actualización automática cada 30 segundos

## Próximas Fases

**Fase B:** Integración WhatsApp  
**Fase C:** Capa inteligente con IA

## Soporte

**Desarrollado por:** Grupo Lance  
**Versión:** v0.1.0  
**Fecha:** 2026

---

*Sistema funcional mínimo para validación en taller real antes de integrar funcionalidades avanzadas.*