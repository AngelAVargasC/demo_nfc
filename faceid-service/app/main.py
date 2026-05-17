"""SIGAM FaceID — Servicio ML.

Servicio independiente (se despliega aparte del API principal en Railway).
Su única función: recibir una imagen y devolver los embeddings faciales.
NO toca la base de datos; eso lo hace el API de SIGAM.
"""
from contextlib import asynccontextmanager

import cv2
import numpy as np
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app import recognition


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Carga el modelo al arrancar para que la primera petición real sea rápida.
    await run_in_threadpool(recognition.warmup)
    yield


app = FastAPI(
    title="SIGAM FaceID — Servicio ML",
    description="Convierte imágenes en embeddings faciales (InsightFace / ArcFace r50).",
    version="1.0.0",
    lifespan=lifespan,
)


def _check_key(x_api_key: str | None) -> None:
    if settings.API_KEY and x_api_key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida o ausente")


@app.get("/health")
async def health():
    return {"status": "ok", "model": settings.MODEL_NAME}


@app.post("/embed")
async def embed(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(default=None),
):
    """Recibe una imagen y devuelve los embeddings de los rostros detectados."""
    _check_key(x_api_key)

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Imagen vacía")
    if len(raw) > settings.MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande")

    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen")

    # La inferencia es CPU-bound: se corre en un hilo para no bloquear el loop.
    faces = await run_in_threadpool(recognition.extract_faces, image)

    return {
        "face_count": len(faces),
        "embedding_dim": 512,
        "faces": faces,
    }
