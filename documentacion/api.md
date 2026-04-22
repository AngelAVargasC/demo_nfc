# API SIGAM — Referencia de Endpoints

Base URL: `/api/v1`
Formato de respuesta: `{ "success": bool, "data": any, "error": string | null }`

## Auth

| Método | Endpoint | Rol requerido | Descripción |
|---|---|---|---|
| POST | /auth/register | — | Crear usuario |
| POST | /auth/login | — | Iniciar sesión |
| POST | /auth/refresh | — | Renovar access token (cookie) |
| POST | /auth/logout | — | Cerrar sesión |

## Usuarios

| Método | Endpoint | Rol mínimo | Descripción |
|---|---|---|---|
| GET | /users | secretaria | Listar usuarios (filtro por logia_id) |
| GET | /users/me | lector | Perfil propio |
| GET | /users/{id} | lector | Detalle de usuario |
| PATCH | /users/{id} | secretaria | Actualizar usuario |
| POST | /logias | admin | Crear logia |
| GET | /logias | lector | Listar logias |

## Acceso NFC

| Método | Endpoint | Rol mínimo | Descripción |
|---|---|---|---|
| POST | /access/scan | lector | Validar UID NFC |
| POST | /access/tags | secretaria | Registrar tag NFC |
| DELETE | /access/tags/{id} | secretaria | Desactivar tag |
| GET | /access/events | secretaria | Historial de accesos |

### Body POST /access/scan
```json
{ "uid": "04:A1:B2:C3", "nonce": "abc123", "timestamp": 1714000000, "location": "Sala Magna" }
```

### Respuesta acceso permitido
```json
{ "success": true, "data": { "result": "granted", "user": { ...UserOut } } }
```

### Respuesta acceso denegado
```json
{ "success": true, "data": { "result": "denied", "reason": "financial_debt", "message": "Adeudo financiero pendiente" } }
```

## Finanzas

| Método | Endpoint | Rol mínimo | Descripción |
|---|---|---|---|
| POST | /finance/charges | tesorero | Crear cargo |
| POST | /finance/payments/{id}/pay | tesorero | Registrar pago |
| GET | /finance/users/{id}/payments | lector | Pagos de un usuario |
| GET | /finance/logias/{id}/payments | tesorero | Pagos de una logia |
| POST | /finance/config | admin | Configurar tarifas por logia |

### Body POST /finance/config
```json
{
  "logia_id": "uuid",
  "rates": { "iniciacion": "5000", "aumento": "3000", "exaltacion": "4000", "cuota": "500" },
  "gran_logia_split_percent": "30.00"
}
```

## Documentos

| Método | Endpoint | Rol mínimo | Descripción |
|---|---|---|---|
| POST | /documents/ | secretaria | Crear documento |
| POST | /documents/{id}/approve | secretaria | Aprobar (nivel: logia / gran_logia) |
| GET | /documents/verify/{code} | — | Verificar por código único |
| GET | /documents/user/{id} | lector | Documentos de un usuario |

## Health

| GET | /health | — | Estado del sistema |
