# 🚀 TallerFlow - Pre-Pilot Checklist

## 1. FUNCIONALIDAD CORE

### Autenticación & Usuarios
- [ ] Login funciona (usuario + contraseña)
- [ ] Owner puede crear usuarios (mecánico)
- [ ] Case-insensitive en username
- [ ] UUID único para cada usuario
- [ ] JWT tokens generan correctamente
- [ ] Logout limpia sesión

### Gestión de Talleres
- [ ] Crear taller con nombre único
- [ ] Slug se genera automáticamente (único)
- [ ] Campo teléfono se guarda correctamente
- [ ] Editar teléfono del taller funciona
- [ ] Owner puede listar todos sus talleres
- [ ] Cambiar entre talleres (workshop switch)

### Vehículos
- [ ] Crear vehículo con matrícula, teléfono, cliente
- [ ] Tracking hash se genera (SHA256)
- [ ] Listar vehículos del taller actual
- [ ] Buscar por matrícula
- [ ] Filtrar por estado
- [ ] Filtrar por mecánico

### Estados & Transiciones
- [ ] ESPERANDO_REVISION → EN_REVISION ✓
- [ ] EN_REVISION → PRESUPUESTO_PENDIENTE ✓
- [ ] PRESUPUESTO_PENDIENTE → PRESUPUESTO_BLOQUEADO (opcional) ✓
- [ ] EN_REVISION → ESPERANDO_PIEZA ✓
- [ ] ESPERANDO_PIEZA → MONTANDO_PIEZA ✓
- [ ] MONTANDO_PIEZA → LISTO ✓
- [ ] LISTO → se cierra el vehículo ✓
- [ ] Historial de cambios se registra ✓

### Presupuesto
- [ ] Upload PDF en status PRESUPUESTO_PENDIENTE
- [ ] PDF se guarda en servidor (o storage externo)
- [ ] Se envía por WhatsApp al cliente ✓ (cuando esté activo)

### Tracking Público
- [ ] URL: `/tallerflow/{slug}/status/{plate}/{hash}`
- [ ] Cliente abre link sin autenticar
- [ ] Ve estado actual del vehículo
- [ ] Ve historial de cambios
- [ ] No ve datos sensibles (teléfono del taller, etc)

### WhatsApp (Cuando actives API)
- [ ] EN_REVISION: Notificación enviada ✓
- [ ] PRESUPUESTO_PENDIENTE: Notificación + PDF ✓
- [ ] ESPERANDO_PIEZA: Notificación ✓
- [ ] LISTO: Notificación final ✓
- [ ] Vehículo creado: Link de tracking enviado ✓

---

## 2. INTERFAZ & UX

### Modales
- [ ] Todos los modales son custom (NO window.alert/confirm/prompt)
- [ ] Confirmación de cambio de estado (modal con botones)
- [ ] Modal de edición teléfono del taller
- [ ] Modal de gestión de usuarios (920px ancho)
- [ ] Cerrar modal con ESC o botón X
- [ ] overlay oscuro al fondo

### Responsividad
- [ ] Mobile (375px): todo legible
- [ ] Tablet (768px): layouts adaptativos
- [ ] Desktop (1920px+): sin scrolls horizontales
- [ ] Botones clickeables en mobile (min 44px)

### Navegación
- [ ] Header con logo TallerFlow ✓
- [ ] Workshop selector funciona
- [ ] Botones de acción (⚙️ Gestionar, 👤 Usuarios, 📊 Performance, 🚪 Salir)
- [ ] Breadcrumbs o indicador de ubicación

---

## 3. SEGURIDAD

### Autenticación
- [ ] Contraseñas hasheadas (bcrypt mínimo 10 salts)
- [ ] JWT tiene expiration time (recomendado 24h)
- [ ] Refresh tokens implementados (si aplica)
- [ ] No mostrar contraseñas en errores
- [ ] Intentos de login fallidos: limitar (ej: 5 intentos = bloqueo 15 min)

### Autorización
- [ ] Solo owner puede crear/editar usuarios
- [ ] Solo owner puede crear/editar talleres
- [ ] Mecánico solo ve su taller asignado (si es multi-taller)
- [ ] Mecánico no puede ver datos de otros talleres
- [ ] Validar que usuario pertenece al taller antes de operaciones

### Base de Datos
- [ ] Prepared statements / parameterized queries (NO SQL injection)
- [ ] Validación de entrada en todos los campos
- [ ] Máximos de longitud (matrícula: 20, slug: 50, etc)
- [ ] No guardar datos sensibles en logs
- [ ] Connection pooling configurado

### API Endpoints
- [ ] Rate limiting activado (ej: 100 req/min por IP)
- [ ] CORS configurado correctamente (solo lancesystem.com)
- [ ] HTTPS obligatorio en producción
- [ ] X-Frame-Options: DENY (click-jacking)
- [ ] Content-Security-Policy headers
- [ ] No exponerse versiones de frameworks en headers

### WhatsApp
- [ ] Token guardado en variable de entorno (NO en código)
- [ ] Phone ID guardado en variable de entorno
- [ ] Validar teléfono antes de enviar (formato + país)
- [ ] Rate limiting para envíos (ej: 10 por hora por número)
- [ ] Logs de envíos (para auditoría)
- [ ] No repetir envío si falla (máximo 3 reintentos)

### Datos Personales
- [ ] RGPD: politica privacidad visible
- [ ] Teléfono cliente: solo owner lo ve plenamente
- [ ] Público (tracking): no muestra teléfono
- [ ] Opción para "olvidar" vehículos antiguos (si required)

---

## 4. PERFORMANCE & OPTIMIZACIÓN

### Backend
- [ ] Índices en tablas (id, slug, plate, user_id)
- [ ] Queries optimizadas (sin N+1)
- [ ] Gzip compression habilitado
- [ ] Cache en memoria para datos frecuentes
- [ ] Timeouts en requests (30s máximo)

### Frontend
- [ ] Favicon cargado ✓
- [ ] Estilos minificados (1 CSS o incorporado)
- [ ] Scripts minificados (o webpack)
- [ ] Lazy loading de imágenes (si las hay)
- [ ] No console.log() en producción
- [ ] Bundles < 500KB (JS + CSS)

### Deployment
- [ ] Environment variables separadas (dev vs prod)
- [ ] Logs centralizados (Render logs o externos)
- [ ] Auto-scaling configurado (si aplica)
- [ ] Health checks cada 5 minutos
- [ ] Backups diarios de BD

---

## 5. TESTING MANUAL

### Flujo Cliente (Mecánico)
1. [ ] Crear user "Juan" + password
2. [ ] Login con Juan, registrar vehículo:
   - Matrícula: 5070CZS
   - Teléfono: +34 654 883 403
   - Cliente: "María García"
3. [ ] Cambiar a EN_REVISION
4. [ ] Cambiar a PRESUPUESTO_PENDIENTE
5. [ ] Upload PDF de presupuesto
6. [ ] Enviar mensaje de WhatsApp (texto + PDF) ← VER QUE LLEGA
7. [ ] Cambiar a ESPERANDO_PIEZA
8. [ ] Cambiar a MONTANDO_PIEZA
9. [ ] Cambiar a LISTO
10. [ ] Copiar link de tracking y probar

### Flujo Cliente (Público - Sin Login)
1. [ ] Abrir link: `https://lancesystem.com/tallerflow/alua-odon-motor/status/5070CZS/{hash}`
2. [ ] Ver estado actual ✓
3. [ ] Ver timeline de cambios ✓
4. [ ] NO ver teléfono del taller
5. [ ] NO ver datos internos
6. [ ] Responsive en mobile ✓
7. [ ] Link en WhatsApp abre correctamente

### Casos Límite
- [ ] URL tracking con hash incorrecto → error amable
- [ ] URL tracking con taller inexistente → error amable
- [ ] Crear vehículo sin teléfono → error claro
- [ ] Ediciones al mismo tiempo (2 usuarios) → último gana
- [ ] PDF > 10MB → rechaza con mensaje

---

## 6. MONITOREO POST-DEPLOY

### Primeras 24h
- [ ] Revisar logs cada hora
- [ ] Verificar que no hay errores 500
- [ ] Comprobar WhatsApp llega en tiempo real
- [ ] Revisar tiempo de respuesta (< 500ms en API)
- [ ] Verificar storage (¿suficiente para PDFs?)

### Primera Semana
- [ ] Estadísticas de uso (usuarios, vehículos creados)
- [ ] Casos de error recurrentes
- [ ] Feedback del mecánico
- [ ] Performance bajo carga (agregar más vehículos)

---

## 7. ANTES DE ACTIVAR WHITELIST

### Datos Reales
- [ ] Borrar todos los vehículos de prueba
- [ ] Borrar usuarios de prueba
- [ ] Crear usuario del cliente REAL
- [ ] Asignar teléfono REAL del cliente
- [ ] Confirmar WhatsApp token + phone_id REAL

### Configuración Final
- [ ] `WHATSAPP_ENABLED=true` en Render
- [ ] `WHATSAPP_TOKEN=xxx` correcto
- [ ] `WHATSAPP_PHONE_ID=xxx` correcto
- [ ] `NODE_ENV=production`
- [ ] Logs habilitados para auditoría

---

## 📋 RESUMEN RÁPIDO

**Antes de invitar clientes al piloto:**

1. ✅ Funcionalidad core 100% (estados, tracking, WhatsApp)
2. ✅ Seguridad: auth, autorización, datos
3. ✅ Interfaz: modales custom, responsive
4. ✅ Testing: flujo completo 2+ veces
5. ✅ Datos reales: usuario cliente, teléfono, WhatsApp token
6. ✅ Monitoreo: logs, alertas, health checks

**Si algo falla en testing, NO lanzar.** Es mejor 1 semana más de desarrollo que perder confianza del cliente.

---

**Última actualización:** Feb 21, 2026  
**Status:** 🔴 Pre-Piloto (En Desarrollo)
