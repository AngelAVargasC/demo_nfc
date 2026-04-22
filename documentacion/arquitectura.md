# Arquitectura SIGAM

## Estilo Arquitectónico
- Clean Architecture + Domain Driven Design (DDD)
- Multi-tenant (aislamiento lógico por Logia vía logia_id)
- Backend API REST desacoplado
- Frontend SPA modular (feature-based)

## Stack
| Capa | Tecnología |
|---|---|
| Backend | FastAPI (Python 3.12, async) |
| ORM | SQLAlchemy 2.0 (async) |
| Base de datos | PostgreSQL 16 |
| Caché | Redis 7 |
| Auth | JWT (access + refresh rotation) |
| Frontend | React 18 + Vite |
| Estado server | React Query v5 |
| Estado global | Zustand |
| Contenedores | Docker + Docker Compose |
| Deploy | Railway (MVP) |

## Estructura de Módulos Backend

```
app/
├── apps/
│   ├── users/      → Auth, RBAC, Logias
│   ├── access/     → NFC, eventos de acceso
│   ├── finance/    → Cobros, pagos, configuración financiera
│   └── documents/  → Expedientes, aprobaciones
├── shared/
│   ├── config/     → Settings (pydantic-settings)
│   ├── database/   → Engine SQLAlchemy, Redis, seed
│   ├── security/   → JWT, hashing (argon2), RBAC
│   ├── utils/      → Formato de respuesta estándar
│   └── middleware/ → Logging estructurado, manejo de errores
└── main.py         → Registro de routers, middlewares, CORS, rate limit
```

## Contrato de módulo (aplicado en todos los apps/)

```
{modulo}/
├── domain/         → Entidades SQLAlchemy + enums de negocio
├── application/    → Casos de uso (toda la lógica)
├── infrastructure/ → Repositorios (acceso a DB)
└── interfaces/     → Routers FastAPI + Pydantic schemas
```

**Regla absoluta:** Los routers nunca acceden a la DB directamente. Toda lógica pasa por application.

## Flujo de Autenticación

1. POST /api/v1/auth/login → access_token (memoria) + refresh_token (httpOnly cookie)
2. Access token: 15 min, no persistente
3. Refresh token: 7 días, rotativo, revocable, guardado hasheado en DB
4. Interceptor axios renueva automáticamente el access token
5. Logout invalida el refresh token en DB

## Protección NFC Anti-Replay

1. Cliente envía uid + nonce + timestamp
2. Backend verifica |now - timestamp| < 30s
3. Backend verifica nonce no usado (Redis, TTL 60s)
4. Registra el nonce en Redis para prevenir reutilización
5. Procede con la validación de acceso

## Diagrama de Entidades

```
Logia ──< User >── NFCTag
  │          │
  │          └──< Payment
  │          └──< AccessEvent
  │          └──< Document
  └── FinancialConfig
```
