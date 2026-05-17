# SIGAM FaceID — Servicio ML

Servicio independiente que convierte **imágenes en embeddings faciales**
(InsightFace · ArcFace ResNet-50, vectores de 512 dimensiones).

Se despliega **aparte** del API principal de SIGAM (es la Fase 2 de
`faceid_implementacion.md`). No toca la base de datos: solo hace inferencia.

## Endpoints

| Método | Ruta      | Descripción |
|--------|-----------|-------------|
| GET    | `/health` | Estado del servicio y modelo cargado. |
| POST   | `/embed`  | Recibe una imagen (`multipart/form-data`, campo `file`) y devuelve los embeddings de los rostros detectados. |

`/embed` exige la cabecera `X-API-Key` si la variable `API_KEY` está definida.

Respuesta de `/embed`:

```json
{
  "face_count": 1,
  "embedding_dim": 512,
  "faces": [
    { "embedding": [/* 512 floats */], "bbox": [x1,y1,x2,y2], "det_score": 0.93 }
  ]
}
```

## Variables de entorno

Ver `.env.example`. La importante es `API_KEY` (secreto compartido con el API).

## Despliegue en Railway

1. Crear un **nuevo servicio** en el mismo proyecto de SIGAM.
2. Apuntarlo a la carpeta `faceid-service/` (Root Directory) — se construye con
   el `Dockerfile` incluido.
3. Definir la variable `API_KEY`.
4. La primera build tarda: instala InsightFace y descarga el modelo (~300 MB).

Recursos sugeridos: ~1–1.5 GB de RAM.

## Probar en local (Docker)

```bash
cd faceid-service
docker build -t sigam-faceid .
docker run -p 8000:8000 -e API_KEY=dev sigam-faceid
# luego:
curl -F "file=@una_foto.jpg" -H "X-API-Key: dev" http://localhost:8000/embed
```

> Nota: requiere Python 3.11 (insightface/onnxruntime). NO uses Python 3.14.
> Por eso el despliegue es vía Docker, que fija la versión correcta.
