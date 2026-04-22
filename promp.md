# 🧠 Prompt Maestro — Arquitectura y Desarrollo del Sistema SIGAM

## 🎯 Contexto General

Actúa como un **arquitecto de software senior + líder técnico full-stack**, especializado en sistemas empresariales críticos, seguridad, escalabilidad y diseño modular.

Debes diseñar e implementar un sistema completo llamado:

> **Sistema Integral de Gestión y Acceso Masónico (SIGAM)**

Este sistema debe ser **altamente escalable, seguro, modular, auditable y optimizado en rendimiento**, considerando buenas prácticas corporativas (Clean Architecture, SOLID, separación de responsabilidades, seguridad OWASP).

---

## 🧩 Objetivo del Sistema

Modernizar y automatizar:

* Control de acceso físico mediante NFC
* Administración financiera por Logia (multi-tenant)
* Gestión documental (expedientes digitales)
* Reportes e inteligencia de negocio

Garantizando:

* Autonomía por Logia
* Transparencia con Gran Logia
* Seguridad y trazabilidad completa

---

## 🏗️ Arquitectura Requerida

### 🔹 Estilo Arquitectónico

* Clean Architecture + Domain Driven Design (DDD)
* Backend desacoplado (API REST o GraphQL)
* Frontend SPA (modular)
* Multi-tenant (aislamiento lógico por Logia)

---

## 🔐 Seguridad (CRÍTICO)

Implementar desde el inicio:

* RBAC (roles: Admin, Secretaría, Tesorero, Lector, Gran Logia)
* Validación de inputs (OWASP Top 10)
* Auditoría completa (logs inmutables)
* Rate limiting
* Protección contra replay attacks en NFC
* Encriptación:

  * Datos sensibles en DB
  * HTTPS obligatorio
* Firma de documentos (hash + código único verificable)

---

## 🧱 Módulos del Sistema

### 1. 🚪 Control de Acceso NFC

#### Funcionalidad:

* Escaneo NFC (tag UID)
* Validación en tiempo real:

  * Estatus financiero
  * Estatus masónico
  * Jerarquía vs Cámara activa

#### UI (Vista Lector):

Debe ser **ultra rápida (<300ms)** y visual:

* Foto
* Nombre
* Grado
* Logia
* Correo
* Estado:

  * 🟢 Paz y Salvo
  * 🔴 Adeudo

#### Reglas críticas:

* Si no cumple → acceso denegado
* Registrar evento automáticamente

#### Registro invisible:

* Nombre
* IP
* Timestamp
* Dispositivo
* Ubicación (opcional)

---

### 2. 💰 Finanzas Parametrizadas

#### Características:

* Configuración independiente por Logia
* Tipos de cobros:

  * Iniciación
  * Aumento
  * Exaltación
  * Cuotas

#### Motor de cálculo:

* Split automático:

  * Logia
  * Gran Logia

#### Requisitos técnicos:

* Motor configurable (no hardcoded)
* Historial financiero auditable
* Estados:

  * Pagado
  * Pendiente
  * Parcial

---

### 3. 📂 Gestión de Secretaría

#### Funcionalidad:

* Expediente digital (cloud)
* Subida de documentos
* Validación en 2 niveles:

  1. Logia
  2. Gran Logia

#### Automatización:

* Generación de:

  * Planchas
  * Certificados
  * Títulos (PDF)

#### Reglas:

* Usuario NO puede modificar estatus
* Solo Secretaría mediante actas

---

### 4. 📊 Reportes e Inteligencia

#### Features:

* Dashboard por Logia
* Dashboard global (Gran Logia)

#### Métricas:

* Ingresos
* Asistencia
* Crecimiento
* Morosidad

#### Exportables:

* PDF
* CSV

---

## 🖥️ Diseño de Vistas (Frontend)

### 🔹 Estructura Base

#### 1. Home (Landing)

* Explicación del sistema
* Acceso a login
* Branding institucional

#### 2. Login

* Email + password
* MFA (opcional recomendado)
* Recuperación de contraseña

#### 3. Dashboard

* Personalizado por rol
* Widgets dinámicos

#### 4. Vista Lector NFC

* Pantalla completa
* Feedback inmediato
* Historial rápido

#### 5. Panel Administrativo

* Usuarios
* Logias
* Finanzas
* Documentos

#### 6. Perfil de Usuario

* Datos personales
* Estado financiero
* Historial

---

## 🧠 Modelado de Datos (Base)

Entidades clave:

* Usuario
* Logia
* Grado
* Pago
* Transacción
* Documento
* Asistencia
* NFC_Tag
* EventoAcceso
* ConfiguracionFinanciera

Relaciones:

* Usuario pertenece a Logia
* Usuario tiene NFC
* Usuario genera accesos
* Logia tiene configuración financiera propia

---

### ⚡ Performance (IMPORTANTE)

* Lazy loading en frontend
* Indexación en DB (UID NFC, usuario, estado)
* Cache de validación NFC
* Debounce en escaneo
* Queries optimizadas (no N+1)

---

## 🧪 Testing

* Unit tests (dominio)
* Integration tests (API)
* E2E (flujos críticos: acceso NFC)

---

## 🚀 Entregables Esperados

1. Arquitectura completa (diagramas)
2. Estructura de carpetas (backend + frontend)
3. Modelos de base de datos
4. Endpoints API documentados
5. Flujos clave implementados
6. UI funcional (mínimo demo completo)
7. Sistema listo para escalar

---

## 🧭 Reglas de Desarrollo

* Código limpio y tipado
* Sin lógica de negocio en controladores
* Uso de servicios y casos de uso
* Manejo de errores centralizado
* Logging estructurado

---

## 🎯 Prioridad Inicial (MVP)

1. Login + Auth
2. Registro de usuarios
3. NFC básico funcional
4. Validación de acceso
5. Dashboard simple
6. Registro de asistencias

---

## 🧠 Nivel de Calidad Esperado

Este sistema debe diseñarse como si fuera a ser:

* Usado a nivel nacional
* Auditado externamente
* Escalado a miles de usuarios

Evita soluciones simples o temporales. Todo debe ser **production-ready desde el diseño**.

---

## 📌 Nota Final

Optimiza siempre para:

* Rendimiento
* Seguridad
* Escalabilidad
* Mantenibilidad

Cada decisión técnica debe justificarse.

---
## 🏗️ Stack Tecnológico y Estructura del Proyecto

### 🔹 Stack Oficial del Proyecto

El sistema SIGAM debe construirse con un stack moderno, orientado a alto rendimiento, tipado fuerte y escalabilidad:

El stack NO es opcional. Debe usarse exactamente el siguiente:

#### Backend
- FastAPI (Python, async)
- SQLAlchemy 2.0 (async)
- PostgreSQL
- Redis (cache y optimización)
- JWT + RBAC

#### Frontend
- React + Vite (SPA)
- React Query (server state)
- Zustand (estado global)

#### Infraestructura
- Docker
- Railway (MVP)

---

## 📁 Estructura del Proyecto (Nivel Raíz)

El proyecto debe organizarse como un **monorepo estructurado**, separando responsabilidades:

```bash
SIGAM/
├── backend/
├── frontend/
├── documentacion/
```

---

## 🧠 Estructura Backend (FastAPI)

El backend debe seguir una arquitectura modular, escalable y desacoplada:

```bash
backend/
├── app/
│   ├── apps/              # Módulos de negocio (bounded contexts)
│   │   ├── access/        # Control de acceso NFC
│   │   ├── finance/       # Finanzas
│   │   ├── users/         # Usuarios
│   │   ├── documents/     # Gestión documental
│   │
│   ├── shared/            # Código compartido (core)
│   │   ├── config/        # Configuración (env, settings)
│   │   ├── database/      # Conexión DB
│   │   ├── security/      # JWT, hashing, auth
│   │   ├── utils/         # Helpers
│   │
│   ├── main.py            # Entry point FastAPI
│
├── requirements.txt
├── Dockerfile
```

---

### 🔹 Estructura interna de cada módulo (`apps/`)

Cada módulo debe ser **auto-contenido**, siguiendo Clean Architecture:

```bash
access/
├── domain/                # Entidades y lógica pura
├── application/           # Casos de uso
├── infrastructure/        # DB, repositorios
├── interfaces/            # API (routers)
```

👉 Esto permite:

* Escalar módulos sin acoplamiento
* Migrar a microservicios si se requiere
* Mantener código limpio y mantenible

---

## ⚛️ Estructura Frontend (React + Vite)

El frontend debe ser modular y orientado a features:

```bash
frontend/
├── public/
├── src/
│   ├── app/               # Routing principal
│   ├── features/          # Módulos (auth, nfc, finanzas)
│   ├── shared/            # Componentes reutilizables
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/      # API client
│   │   ├── utils/
│   │
│   ├── store/             # Estado global
│   ├── main.tsx
│
├── index.html
├── vite.config.ts
```

---

## 📚 Carpeta de Documentación

```bash
documentacion/
├── arquitectura.md
├── api.md
├── decisiones_tecnicas.md
├── flujos.md
```

---

## 🧭 Principios Clave de la Estructura

* Separación estricta de responsabilidades
* Modularidad por dominio (no por tipo de archivo)
* Escalabilidad horizontal (multi-logia)
* Código reutilizable y desacoplado
* Preparado para producción desde el inicio

---
## 🧱 Contrato de Módulos (OBLIGATORIO)

Todos los módulos dentro de `apps/` deben seguir EXACTAMENTE la misma estructura y responsabilidades:

- domain/
  - Entidades puras
  - Reglas de negocio

- application/
  - Casos de uso
  - Orquestación de lógica

- infrastructure/
  - Implementación de repositorios
  - Acceso a base de datos

- interfaces/
  - Routers (FastAPI)
  - Schemas de entrada/salida

Reglas:

- ❌ Prohibido acceso directo a DB desde routers
- ❌ Prohibido lógica de negocio en infrastructure
- ✅ Toda lógica pasa por application

## ⚡ Nota Técnica

Esta estructura está diseñada para:

* Minimizar latencia (clave para NFC)
* Facilitar mantenimiento a largo plazo
* Permitir crecimiento sin refactor masivo
* Integrarse fácilmente con CI/CD e infraestructura cloud

---
## 📏 Estándares de Código (OBLIGATORIO)

- Tipado estricto en todo el backend (Pydantic / typing)
- Prohibido lógica de negocio en:
  - Routers
  - Controllers
- Uso obligatorio de:
  - Casos de uso (application layer)
  - Repositorios (interfaces)
- Manejo de errores mediante:
  - Excepciones personalizadas
  - Middleware global
- Respuestas API estandarizadas:
  - success / error / metadata

### 🔒 Seguridad Avanzada

- Implementar:
  - Access Token (short-lived)
  - Refresh Token (rotation + revocation)
- Protección contra:
  - Replay attacks en NFC (nonce + timestamp)
  - Timing attacks
- Hashing:
  - bcrypt o argon2 (configurable)
- Auditoría:
  - Logs inmutables (append-only)
- Validación de permisos:
  - A nivel endpoint
  - A nivel dominio (NO solo middleware)

  ## 📡 Diseño de API

- Estándar REST
- Versionado:
  - /api/v1/
- Formato de respuesta:

{
  "success": true,
  "data": {},
  "error": null
}

## ⚛️ Lineamientos Frontend

- Arquitectura basada en features (NO por tipo)
- Manejo de estado:
  - React Query → server state
  - Zustand → UI/global state
- Separación:
  - UI vs lógica
- Lazy loading obligatorio en rutas

## 🎨 Identidad Visual y Simulación NFC (Demo)

---

## 🧠 Concepto de Diseño

El sistema SIGAM debe transmitir:

* Seguridad
* Confianza institucional
* Modernidad tecnológica
* Sobriedad

La referencia visual principal es el estilo de plataformas de ciberseguridad como **Kaspersky**, caracterizado por:

* Interfaces limpias
* Uso de colores oscuros con acentos brillantes
* Sensación de control y protección
* Diseño elegante y minimalista

---

## 🎯 Lineamientos Visuales

### 🔹 Estilo General

* Dark UI (modo oscuro como base)
* Alto contraste en elementos críticos
* Uso de espacios amplios (no saturación)
* Animaciones sutiles y rápidas

---

### 🎨 Paleta de Colores

* Fondo principal: Negro / Gris oscuro
* Primario: Verde (seguridad, validación)
* Secundario: Azul oscuro (información)
* Error: Rojo intenso (denegación)
* Neutros: Grises suaves

---

### ✨ Sensación del Sistema

El sistema debe sentirse como:

> Un panel de control seguro, moderno y confiable — no como un sistema administrativo tradicional.

---

## ⚡ UX Crítica (NFC)

El flujo de acceso debe transmitir:

* Inmediatez
* Claridad absoluta
* Autoridad del sistema

### Feedback visual obligatorio:

* 🟢 Acceso permitido → Pantalla verde dominante
* 🔴 Acceso denegado → Pantalla roja dominante

Con:

* Transición suave pero rápida
* Animación ligera (fade/scale)
* Opcional: feedback sonoro

---

## 📱 Consistencia Visual

* Todos los módulos deben compartir:

  * Tipografía
  * Colores
  * Componentes base
* Prohibido mezclar estilos entre vistas

---

## ⚠️ Simulación de NFC (IMPORTANTE PARA DEMO)

En la fase actual del proyecto, el acceso NFC será **simulado**, debido a que aún no se cuenta con los dispositivos físicos (chips NFC).

### 🔹 Implementación temporal:

* El escaneo será representado mediante:

  * Input manual de UID
  * Botón de simulación de escaneo
  * Selección de usuario predefinido

### 🔹 Comportamiento:

* Debe replicar exactamente el flujo real:

  * Validación en tiempo real
  * Respuesta inmediata
  * Registro de acceso

### 🔹 Objetivo:

Permitir demostrar:

* Lógica del sistema
* Validación de acceso
* Experiencia de usuario

sin depender del hardware físico.

---

## 🚀 Nota Técnica

La simulación debe diseñarse de forma que:

* Sea fácilmente reemplazable por lectura NFC real
* No afecte la arquitectura del sistema
* Mantenga los mismos endpoints y lógica backend

---

## 🎯 Objetivo del Demo

El usuario (Presidente / Administración) debe percibir que:

* El sistema ya está funcional
* Solo falta conectar el hardware NFC
* La experiencia final será inmediata y robusta

---
## 🔐 Flujo de Autenticación

1. Usuario inicia sesión
2. Backend valida credenciales
3. Se generan:
   - Access Token (corto)
   - Refresh Token (persistente)
4. Frontend almacena:
   - Access → memoria
   - Refresh → httpOnly cookie
5. Renovación automática de sesión

Reglas:

- Access token NO persistente
- Refresh token rotativo
- Logout invalida tokens


## 🎭 Modo Demo (IMPORTANTE)

El sistema debe permitir un modo demo controlado:

- Datos pre-cargados
- Usuarios simulados
- Estados financieros configurables

Objetivo:

- Garantizar consistencia en demostraciones
- Evitar dependencia de datos reales
### 🧩 Comportamiento UI (OBLIGATORIO)

- Uso de:
  - Skeleton loaders (no spinners largos)
  - Transiciones <200ms
- Estados visuales:
  - Empty state
  - Error state
  - Loading state

- Vista NFC:
  - Debe funcionar offline parcial (cache último estado)