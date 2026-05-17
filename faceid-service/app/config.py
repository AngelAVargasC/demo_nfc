from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Secreto compartido: solo el API de SIGAM debe poder llamar a este servicio.
    # Si queda vacío, no se exige autenticación (solo para desarrollo local).
    API_KEY: str = ""
    # Pack de modelos de InsightFace (detección SCRFD + reconocimiento ArcFace r50).
    MODEL_NAME: str = "buffalo_l"
    # Tamaño de entrada del detector.
    DET_SIZE: int = 640
    # Límite de tamaño de imagen aceptada (bytes).
    MAX_IMAGE_BYTES: int = 8_000_000

    class Config:
        env_file = ".env"


settings = Settings()
