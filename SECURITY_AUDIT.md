# 🔒 AUDITORÍA DE SEGURIDAD - TallerFlow

**Fecha:** 21 de febrero 2026  
**Estado:** 🔴 CRÍTICOS ENCONTRADOS  
**Autor:** Sistema de Auditoría

---

## 🚨 PROBLEMAS CRÍTICOS (DEBE ARREGLAR ANTES DE PILOTO)

### 1. ❌ PASSWORDS EN TEXTO PLANO

**Archivos:** 
- `middleware/auth.js` (línea 25-39)
- `models/PanelUser.js` (línea 12-18, 45)

**Problema:**
```javascript
// ❌ INSEGURO - Texto plano
WHERE pu.password = $2  // Comparación directa
VALUES (..., String(password || ''), ...)  // Se guarda sin hash
```

**Riesgo:** Si alguien accede a la BD, tiene todos los passwords.

**Solución:** Usar bcrypt
```javascript
// ✅ SEGURO - Hasheado
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);
```

**Acción:** 
- Instalar bcrypt: `npm install bcrypt`
- Actualizar PanelUser.js para hashear al crear/comparar
- Migrar datos existentes (hasear passwords antiguos)

---

### 2. ❌ CORS DEMASIADO ABIERTO

**Archivo:** `server.js` (línea 43-45)

**Problema:**
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || true  // ❌ || true PERMITE CUALQUIER ORIGEN
}));
```

**Riesgo:** Cualquier sitio puede hacer requests a tu API.

**Solución:**
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://lancesystem.com',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### 3. ❌ JWT_SECRET DÉBIL EN EJEMPLO

**Archivo:** `.env.example` (línea 8)

**Problema:**
```
JWT_SECRET=CAMBIA_ESTE_SECRET_LARGO_EN_PRODUCCION  # ❌ Débil
```

**Solución:**
```
JWT_SECRET=USE_A_STRONG_RANDOM_32_CHAR_STRING_HERE  # Comentario claro
```

En Render, generar random: `openssl rand -base64 32`

---

## ⚠️ PROBLEMAS MEDIOS (ANTES DEL PILOTO)

### 4. Validación incompleta en login

**Archivo:** `middleware/auth.js` (línea 57)

**Problema:**
```javascript
return getConfiguredUsers().find((user) => 
  user.username.toLowerCase() === u && user.password === p  // Sin bcrypt
) || null;
```

Mezclando BD + hardcoded con comparación texto plano.

**Solución:** Uniformar a bcrypt en ambos lados

---

### 5. No hay limite de intentos de login

**Riesgo:** Brute force en login

**Solución:** Agregar rate limiter en POST /auth/login
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 5,  // 5 intentos
  message: 'Demasiados intentos. Intenta en 15 minutos.'
});

router.post('/login', loginLimiter, ...);
```

---

### 6. Contraseña default está en código

**Archivos:** `auth.js` (línea 26-27)

```javascript
password: process.env.OWNER_PASSWORD || 'LanceSystem!@2026',  // ❌ Default
password: process.env.DUENO_PASSWORD || 'dueno12345',  // ❌ Default
password: process.env.MECHANIC_PASSWORD || 'mecanico12345',  // ❌ Default
```

**Solución:** Quitar defaults, obligar variables de entorno

---

### 7. CORS_ORIGIN typo

**Archivo:** `.env.example` (línea 26)

```
CORS_ORIGIN=https://lancesystems.com  # ❌ "systems" (con s)
```

Debería ser:
```
CORS_ORIGIN=https://lancesystem.com  # ✅ "system" (sin s)
```

---

## ✅ REVISADOS Y OK

### 8. Validación de inputs
- ✅ Matrícula: 3-15 caracteres
- ✅ Teléfono: normalización y validación españoles
- ✅ Slug: regex validación
- ✅ Longitudes: maxLength configuradas

### 9. SQL Injection
- ✅ Prepared statements ($1, $2, etc.)
- ✅ Parametrized queries en todas partes

### 10. Rate Limiting
- ✅ Tracking público: 100 req/15min
- ✅ Helmetto headers configurados
- ✅ X-Frame-Options: DENY
- ✅ Content-Security-Policy presente

### 11. Token expiration
- ✅ JWT_EXPIRES_IN = 12h (razonable)
- ✅ Token validation en middleware

---

## 📋 PLAN DE ACCIÓN (ORDEN)

### 🔴 FASE 1 - CRÍTICO (Hoy)
1. [ ] Implementar bcrypt para passwords
2. [ ] Fijar CORS a solo lancesystem.com
3. [ ] Generar JWT_SECRET fuerte
4. [ ] Quitar defaults de passwords

### 🟡 FASE 2 - IMPORTANTE (Mañana)
5. [ ] Rate limiter en /auth/login
6. [ ] Usar consistentemente bcrypt
7. [ ] Fix typo en CORS_ORIGIN

### 🟢 FASE 3 - DATOS (Antes piloto)
8. [ ] Borrar usuarios de prueba antiguos
9. [ ] Crear usuarios REALES del cliente
10. [ ] Verificar teléfono real
11. [ ] Generar token real de WhatsApp

---

## 🎯 TIMELINE ESTIMADO

| Tarea | Tiempo | Prioridad |
|-------|--------|-----------|
| Bcrypt implementation | 30 min | 🔴 CRÍTICO |
| Fix CORS | 5 min | 🔴 CRÍTICO |
| JWT Secret | 5 min | 🔴 CRÍTICO |
| Rate limiter login | 15 min | 🟡 IMPORTANTE |
| Clean data | 10 min | 🟢 ANTES PILOTO |
| **TOTAL** | **65 min** | |

---

## 🔍 COMANDOS VERIFICACIÓN

```bash
# 1. Verificar bcrypt está instalado
npm list bcrypt

# 2. Ver variables de entorno en Render
heroku config:get JWT_SECRET  # O tu plataforma

# 3. Revisar que no hay passwords en logs
grep -r "LanceSystem\|dueno12345\|mecanico12345" . --exclude-dir=node_modules

# 4. Verificar CORS_ORIGIN
grep -r "lancesystems" .
```

---

## ✋ CHECKLIST PRE-PILOTO FINAL

- [ ] Bcrypt implementado y testeado
- [ ] CORS restringido a lancesystem.com
- [ ] JWT_SECRET es random fuerte (32 chars)
- [ ] No hay defaults de password en código
- [ ] Rate limiter en login
- [ ] Usuarios de prueba eliminados
- [ ] Usuario REAL del cliente creado
- [ ] Teléfono REAL verificado
- [ ] Token WhatsApp REAL configurado
- [ ] Logs limpios (sin debug info sensible)
- [ ] Base de datos backup antes de migración

---

**RECOMENDACIÓN:** No lanzar piloto hasta que todos los 🔴 CRÍTICOS estén ✅

**Siguiente paso:** ¿Empezamos con bcrypt?
