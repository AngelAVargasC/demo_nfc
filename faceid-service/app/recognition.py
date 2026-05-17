"""Envoltura de InsightFace: convierte una imagen en embeddings faciales.

El modelo se carga una sola vez (perezoso y thread-safe). Cada rostro detectado
devuelve su embedding ArcFace de 512 dimensiones, ya normalizado L2 (listo para
comparación por distancia coseno con pgvector).
"""
import threading

import numpy as np

from app.config import settings

_lock = threading.Lock()
_model = None


def _get_model():
    """Carga (una sola vez) el modelo de InsightFace."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from insightface.app import FaceAnalysis

                model = FaceAnalysis(
                    name=settings.MODEL_NAME,
                    allowed_modules=["detection", "recognition"],
                )
                # ctx_id=-1 -> CPU (Railway no tiene GPU).
                model.prepare(ctx_id=-1, det_size=(settings.DET_SIZE, settings.DET_SIZE))
                _model = model
    return _model


def warmup() -> None:
    """Fuerza la carga del modelo (se llama al arrancar el servicio)."""
    _get_model()


def extract_faces(image_bgr: np.ndarray) -> list[dict]:
    """Detecta rostros y devuelve sus embeddings.

    Resultado: lista de dicts ordenada por área del rostro (mayor primero):
      { embedding: list[float] (512), bbox: [x1,y1,x2,y2], det_score: float }
    """
    model = _get_model()
    faces = model.get(image_bgr)

    results: list[dict] = []
    for f in faces:
        x1, y1, x2, y2 = (float(v) for v in f.bbox.tolist())
        results.append({
            # normed_embedding ya viene normalizado L2 -> ideal para coseno.
            "embedding": f.normed_embedding.astype(float).tolist(),
            "bbox": [x1, y1, x2, y2],
            "det_score": float(f.det_score),
            "area": (x2 - x1) * (y2 - y1),
        })

    # Rostro más grande primero (normalmente el sujeto frente a la cámara).
    results.sort(key=lambda r: r["area"], reverse=True)
    for r in results:
        del r["area"]
    return results
