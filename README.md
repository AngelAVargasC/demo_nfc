# SIGAM — Sistema Integral de Gestión y Acceso Masónico

Sistema de control de acceso NFC, gestión financiera multi-logia y administración documental para la Orden.

---

## Inicio Rapido (Sin Docker — Demo local)

### Backend
```bash
cd SIGAM/backend
pip install -r requirements.txt
python -m app.shared.database.migrations.seed   # Crea DB + datos demo
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (nueva terminal)
```bash
cd SIGAM/frontend
npm install
npm run dev
```

Acceso en: http://localhost:5173  
API Docs: http://localhost:8000/api/docs

---

## Credenciales del Sistema

| Email | Contraseña | Rol |
|---|---|---|
| admin@sigam.mx | Admin1234! | Administrador |
| secretaria@sigam.mx | Sec1234! | Secretaria |
| tesorero@sigam.mx | Tes1234! | Tesorero |
| lector@sigam.mx | Lec1234! | Lector (control de acceso) |

---

## Demo del Presidente — Escaneo NFC

### Usuarios precargados

| UID NFC | Miembro | Grado | Logia | Estatus |
|---|---|---|---|---|
| 04:A1:B2:C3 | Alejandro Mendoza | Maestro (3°) | Chilam Balam N°3 | Paz y Salvo — ACCESO PERMITIDO |
| 04:D4:E5:F6 | Carlos Ramirez | Companero (2°) | Chilam Balam N°3 | Paz y Salvo — ACCESO PERMITIDO |
| 04:G7:H8:I9 | Roberto Gomez | Aprendiz (1°) | Chilam Balam N°3 | Adeudo Pendiente — ACCESO DENEGADO |

### Validaciones demostradas

1. **Estatus financiero** — Roberto tiene adeudo → acceso bloqueado automaticamente
2. **Grado vs Camara** — Seleccionar "Camara de Maestro (3°)" y escanear a Carlos (Companero 2°) → bloqueado por jerarquia
3. **Historial invisible** — Cada escaneo registra IP, dispositivo, timestamp y ubicacion

---

## Con Docker (produccion)
```bash
cd SIGAM
docker compose up -d
docker compose exec backend python -m app.shared.database.migrations.seed
```

---

## Arquitectura

Ver `documentacion/arquitectura.md` y `documentacion/api.md`

## Modulos

| Modulo | Estado |
|---|---|
| Login + Auth JWT (access+refresh rotation) | Funcional |
| RBAC (admin/secretaria/tesorero/lector/gran_logia) | Funcional |
| Control de Acceso NFC (simulacion + anti-replay) | Funcional |
| Validacion jerarquia de grado vs camara | Funcional |
| Registro de asistencia digital automatico | Funcional |
| Finanzas parametrizadas por Logia | Funcional |
| Split automatico Logia / Gran Logia | Funcional |
| Gestion de expedientes y documentos | Funcional |
| Aprobacion 2 niveles (Logia → Gran Logia) | Funcional |
| Verificacion de documentos por codigo unico | Funcional |
| Dashboard con eventos en tiempo real | Funcional |
| Reportes con graficas (asistencia, ingresos) | Funcional |
| Modo claro/oscuro (persistente) | Funcional |
| SQLite local / PostgreSQL en produccion | Funcional |
