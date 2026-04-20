FROM python:3.10

WORKDIR /app

# Dépendances système nécessaires pour PaddleOCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgomp1 \
    libgl1 \
    wget \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY . .

# Créer le dossier de cache PaddleOCR
RUN mkdir -p /root/.paddleocr

# Exposer le port FastAPI
EXPOSE 8005

# Lancer l'application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005", "--workers", "1"]