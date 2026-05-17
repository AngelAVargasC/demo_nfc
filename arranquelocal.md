# Arranque local — SIGAM

Cómo levantar **backend** y **frontend** en local.

---

## Requisitos

- **Python 3.12+** (probado en 3.14)
- **Node.js 20+**
- Conexión a la base de datos PostgreSQL (Railway) — ya configurada en `backend/.env`

---

## 1. Backend (FastAPI · puerto 8000)

```powershell
cd backend

# Instalar dependencias (solo la primera vez o cuando cambie requirements.txt)
pip install -r requirements.txt
```

### Solo la PRIMERA vez (o cuando cambie el esquema)

```powershell
# Crea las tablas en PostgreSQL
python -m alembic upgrade head

# Carga datos demo (admin, logias, usuarios, NFC). Idempotente: si ya hay datos, se omite.
python -m app.shared.database.migrations.seed
```

### Arrancar el servidor (esto es lo del día a día)

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API: http://localhost:8000
- Documentación interactiva (Swagger): http://localhost:8000/api/docs
- Health check: http://localhost:8000/api/v1/health

> El esquema lo gestiona **Alembic**. El backend ya NO crea tablas solo al arrancar
> (eso pasaba antes con SQLite). Si cambias los modelos:
> `python -m alembic revision --autogenerate -m "descripcion"` y luego `upgrade head`.

---

## 2. Frontend (React + Vite · puerto 5173)

```powershell
cd frontend

# Instalar dependencias (solo la primera vez o cuando cambie package.json)
npm install

# Arrancar
npm run dev
```

- App: http://localhost:5173

### Variable de entorno del frontend

Crea el archivo `frontend/.env` (si no existe) con:

```dotenv
VITE_API_URL=http://localhost:8000/api/v1
```

Apunta el frontend al backend local. El backend ya permite CORS desde
`http://localhost:5173` (ver `CORS_ORIGINS` en `backend/.env`).

---

## Orden recomendado

1. Backend primero (`uvicorn ...`) → puerto 8000
2. Frontend después (`npm run dev`) → puerto 5173
3. Abrir http://localhost:5173

Necesitas **dos terminales** abiertas, una para cada uno.

---

## Credenciales del seed demo

| Email                 | Password     | Rol           |
|-----------------------|--------------|---------------|
| admin@sigam.mx        | Admin1234!   | Administrador |
| secretaria@sigam.mx   | Sec1234!     | Secretaría    |
| tesorero@sigam.mx     | Tes1234!     | Tesorero      |
| lector@sigam.mx       | Lec1234!     | Lector        |

UIDs NFC para simular escaneo: `04:A1:B2:C3` (acceso OK), `04:G7:H8:I9` (denegado, con adeudo).

> Son credenciales demo. Cámbialas antes de usar la base en producción real.

---

## Problemas comunes

- **`relation "users" does not exist`** → faltó correr `python -m alembic upgrade head`.
- **Login falla / no hay usuarios** → faltó correr el seed.
- **El frontend no llama al backend** → revisa que `frontend/.env` tenga `VITE_API_URL` y reinicia `npm run dev`.
- **Error CORS** → el frontend debe correr en el puerto `5173` (o agrega tu origen a `CORS_ORIGINS` en `backend/.env`).
- **`uvicorn` no se reconoce** → usa `python -m uvicorn app.main:app --reload`.
