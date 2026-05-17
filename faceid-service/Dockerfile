# Servicio ML de SIGAM FaceID — imagen para Railway.
# Python 3.11: insightface/onnxruntime tienen wheels estables para esta versión.
FROM python:3.11-slim

# build-essential: insightface compila extensiones Cython al instalarse.
# libgl1 / libglib2.0-0 / libsm6 / libxext6: dependencias de runtime de OpenCV.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Descarga el pack de modelos buffalo_l (~300 MB) en tiempo de build,
# para que el contenedor arranque rápido y sin depender de la red.
RUN python -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_l', allowed_modules=['detection','recognition']).prepare(ctx_id=-1)"

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
