"""Cliente HTTP del servicio ML de reconocimiento facial (Fase 2).

El servicio ML corre aparte (carpeta faceid-service/) y se configura con las
variables FACEID_SERVICE_URL y FACEID_API_KEY.
"""
import httpx

from app.shared.config.settings import settings


class FaceIdServiceError(Exception):
    """Fallo al comunicarse con el servicio ML de reconocimiento facial."""


class FaceIdClient:
    async def embed(self, image_bytes: bytes, filename: str = "face.jpg") -> list[dict]:
        """Envía una imagen al servicio ML y devuelve los rostros detectados.

        Cada rostro: {embedding: list[float] (512), bbox: [...], det_score: float}.
        """
        if not settings.FACEID_SERVICE_URL:
            raise FaceIdServiceError("FACEID_SERVICE_URL no está configurado")

        headers: dict[str, str] = {}
        if settings.FACEID_API_KEY:
            headers["X-API-Key"] = settings.FACEID_API_KEY

        url = settings.FACEID_SERVICE_URL.rstrip("/") + "/embed"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    url,
                    files={"file": (filename, image_bytes, "image/jpeg")},
                    headers=headers,
                )
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise FaceIdServiceError(
                f"Servicio de reconocimiento facial no disponible: {e}"
            ) from e

        return resp.json().get("faces", [])
