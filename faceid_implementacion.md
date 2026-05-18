# Reconocimiento facial — Plan de implementación (SIGAM)

Documento de contexto para la implementación del lector facial. No borrar.

---

## 1. Contexto y decisiones tomadas

**Objetivo:** lector de reconocimiento facial como sistema de control de acceso
físico en las oficinas de la logia.

**Naturaleza:** sistema **interno** de la organización (no es producto comercial,
no es SaaS) → el uso de los modelos pre-entrenados de InsightFace no tiene
restricción de licencia para este caso.

**Parámetros reales:**
- ~6000 usuarios registrados, ~75% activos (~4500).
- Concurrencia máxima diaria: ~500 accesos/día.
- Infra: FastAPI + React + PostgreSQL, todo en Railway (sin GPU).

**Decisiones cerradas:**
- Métodos **independientes**: NFC o rostro, cualquiera otorga acceso por separado.
- El rostro funciona en modo **identificación 1:N** (la cámara reconoce a la
  persona entre los ~6000, sin necesidad de NFC).
- Procesamiento de embeddings en el **servidor** (no en el navegador): 1:N sobre
  6000 exige el modelo fuerte (ArcFace ResNet-50), demasiado pesado para el
  navegador.

**Dos tipos de usuario** (ambos en la tabla `users`, distinguidos por `role`):
- **Usuarios del sistema** (~10-15 admins del inmueble): tienen contraseña,
  inician sesión en la app React, operan el sistema.
- **Miembros** (~6000): son a quienes se reconoce en la puerta. No inician
  sesión; existen para tener perfil facial, pagos, documentos y accesos.

**Enrolamiento incremental:** los miembros se enrolan poco a poco (día a día),
no en un solo lote. El camino principal es la pantalla de enrolamiento (Fase 4),
operada por los admins. El script masivo (Fase 5) es opcional.

---

## 2. Arquitectura elegida

```
[Tablet en puerta — React]
  detecta rostro (modelo ligero en navegador) + recorta + anti-spoofing
        │  sube SOLO la cara recortada (~100x100 px)
        ▼
[Servicio ML en Railway — FastAPI + InsightFace]   ← servicio SEPARADO del API
  calcula embedding ArcFace r50 (vector de 512 dimensiones)
        │
        ▼
[PostgreSQL + pgvector]  índice HNSW sobre ~6000 vectores
  búsqueda 1:N → umbral + margen → decisión → AccessEvent
```

**Stack del reconocimiento:**
- **Modelo:** InsightFace `buffalo_l` (detección SCRFD + reconocimiento
  ArcFace ResNet-50, embeddings de 512-d). Librería Python open-source, corre en
  el propio servidor (no es API externa).
- **Runtime:** `onnxruntime` (CPU — Railway no tiene GPU).
- **Matching:** PostgreSQL + extensión `pgvector`, índice HNSW, distancia coseno.
- **Anti-spoofing:** modelo de liveness pasivo (Silent-Face / MiniFASNet) para
  que una foto impresa o una pantalla no abran la puerta.

**Por qué servidor y no navegador:** con 6000 identidades en 1:N la precisión es
crítica (un falso positivo = entra quien no es). El modelo r50 (~160 MB) no es
viable en navegador; en el servidor se carga una sola vez. La carga (500/día) es
trivial para CPU.

**Railway — 3 servicios en el proyecto:**
1. `API` — el FastAPI actual (ligero).
2. `ML` — FastAPI + InsightFace (~1–1.5 GB RAM, servicio aparte).
3. `PostgreSQL` + pgvector.

---

## 3. Reglas de reconocimiento

- Distancia **coseno** entre embeddings.
- Umbral `FACE_MATCH_THRESHOLD` — default 0.50, **a calibrar con datos reales**.
  Síntoma de umbral bajo: una persona distinta es aceptada como otra (falso
  positivo). Calibrar viendo el `% similitud` que reporta cada acceso: el umbral
  va entre el cluster de "misma persona" y el de "persona distinta".
- Exigir **margen** entre el match #1 y el #2: si dos candidatos quedan casi
  igual de cerca → rechazar (evita falsos positivos en 1:N).
- Guardar **3–5 embeddings por usuario** (distintos ángulos/luz) → mejor recall.
- Registrar `confidence` (score) en cada `AccessEvent`.
- **Calidad de captura es crítica.** Capturas borrosas/oscuras generan embeddings
  inestables que se parecen a cualquiera (falsos positivos). Gate `FACE_MIN_DET_SCORE`
  rechaza detecciones pobres al enrolar e identificar. Un perfil malo entre los
  enrolados envenena el match (se usa la mejor similitud) → re-enrolar limpio.

---

## 4. Privacidad

- Nunca se guarda la foto, solo el embedding (vector no reversible a imagen).
- La imagen recortada transita al servicio ML, se procesa en memoria y se
  descarta. Solo se persiste el vector.
- Dato biométrico → consentimiento informado de los miembros (LFPDPPP, México).

---

## 5. Plan de fases

### Fase 1 — Base de datos (cimiento) ← COMPLETADA (2026-05-17)
- [x] `CREATE EXTENSION vector` en el PostgreSQL de Railway (pgvector 0.8.2).
- [x] Migración Alembic `20260517_0000_faceid_fase1`: tabla `face_profiles`
  (`id`, `user_id`, `embedding vector(512)`, `source`, `created_at`) + índice
  HNSW `ix_face_profiles_embedding` (coseno).
- [x] `access_events` extendida con `method` (`nfc` | `face`, default `nfc`) y
  `confidence` (float, nullable).
- [x] Modelo SQLAlchemy `FaceProfile` en `apps/access/domain/models.py` y
  relación `User.face_profiles`.
- [x] Dependencia `pgvector` agregada a `requirements.txt`.

### Fase 2 — Servicio ML ← DESPLEGADA (2026-05-17)
- [x] Servicio en `faceid-service/`: FastAPI + InsightFace + onnxruntime.
- [x] `GET /health` y `POST /embed` (imagen → embeddings 512-d, ordenados por
  tamaño de rostro). Protegido con cabecera `X-API-Key`.
- [x] `Dockerfile` (Python 3.11; descarga el modelo `buffalo_l` en build).
- [x] Desplegado en Railway. URL: `https://demonfc-production.up.railway.app`
  (`/health` OK, modelo `buffalo_l` cargado).
- En el backend: `FACEID_SERVICE_URL` apunta a esa URL y `FACEID_API_KEY` debe
  coincidir con la `API_KEY` del servicio ML.

### Fase 3 — Endpoints en el API ← COMPLETADA (2026-05-17)
- [x] `POST /api/v1/access/face/enroll` (multipart: `user_id`, `file`, `replace`):
  llama al servicio ML, guarda el embedding en `face_profiles`.
  RBAC: `require_min_role(SECRETARIA)` — solo admin/secretaría.
- [x] `POST /api/v1/access/face/identify` (multipart: `file`, `chamber_degree`,
  `location`): búsqueda 1:N en pgvector, umbral + margen entre #1 y #2, valida
  estado/grado/adeudo, registra `AccessEvent` (`method="face"`, `confidence`).
- [x] Autenticación del kiosco: cabecera `X-Kiosk-Key` contra `KIOSK_API_KEY`
  (clave compartida; per-dispositivo se puede mejorar a futuro).
- [x] Cliente del servicio ML (`faceid_client.py`), `FaceProfileRepository` con
  búsqueda vectorial, casos de uso `FaceEnrollUseCase` / `FaceAccessUseCase`.
- [x] Migración `20260517_0100`: `access_events.nfc_uid` nullable + razones de
  denegación `NO_FACE` / `FACE_NO_MATCH` / `FACE_AMBIGUOUS`.
- Settings nuevos: `FACEID_SERVICE_URL`, `FACEID_API_KEY`, `KIOSK_API_KEY`,
  `FACE_MATCH_THRESHOLD`, `FACE_MATCH_MARGIN`, `FACE_MAX_PROFILES_PER_USER`.
- **Prueba de extremo a extremo:** requiere el servicio ML (Fase 2) desplegado y
  `FACEID_SERVICE_URL` configurado.

### Fase 4 — Frontend (React) ← PANTALLAS LISTAS (2026-05-17)
- [x] Hook `useCamera` (acceso a cámara web, captura de fotograma JPEG).
- [x] `FaceIDPage` (`/faceid`) con dos pestañas:
  - **Acceso facial**: captura → `POST face/identify` → panel permitido/denegado.
  - **Enrolar rostro**: búsqueda/selección de usuario + captura → `POST face/enroll`.
- [x] Ruta `/faceid` e ítem de menú "Acceso facial".
- La detección de rostro la hace el servicio ML (server-side); el navegador
  envía el fotograma completo.
- Variable opcional del frontend: `VITE_KIOSK_API_KEY` (debe coincidir con
  `KIOSK_API_KEY` del backend).
- [ ] **PENDIENTE: anti-spoofing / liveness.** Hoy la captura es de un solo
  fotograma; sin un modelo de liveness, una foto impresa o una pantalla podrían
  pasar. Es el riesgo de seguridad principal — implementar antes de producción.

### Fase 5 — Enrolamiento masivo (OPCIONAL)
- El enrolamiento normal es incremental (Fase 4). Este script solo aplica si ya
  existen fotos previas: recorre los usuarios con `photo_url`, calcula el
  embedding vía el servicio ML y llena `face_profiles`.

### Fase 6 — Calibración y operación
- Ajustar umbral y margen con datos reales.
- Monitoreo de `confidence` en los `AccessEvent`.

---

## 6. Estado

- [x] Fase 1 — Base de datos (2026-05-17)
- [x] Fase 2 — Servicio ML (desplegado: demonfc-production.up.railway.app)
- [x] Fase 3 — Endpoints API (2026-05-17)
- [x] Fase 4 — Frontend (2026-05-17; pantallas listas, falta liveness)
- [ ] Fase 5 — Enrolamiento masivo (OPCIONAL)
- [ ] Fase 6 — Calibración (incluye implementar liveness)

---

## 7. Deuda técnica — implementar después (NO olvidar)

- **`users.hashed_password` es `NOT NULL`.** Los ~6000 miembros que NO inician
  sesión necesitarán un valor placeholder, o hay que volver la columna nullable.
  Resolver cuando se construya el alta masiva de miembros. No bloquea FaceID.
