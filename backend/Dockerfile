# StuDenTools Backend Dockerfile
# Optimized for Railway deployment with pdf2docx support

FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install minimal system dependencies for PDF processing
# libgl1 and libglib2.0-0 are needed by opencv-python-headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
# IMPORTANT: opencv-python-headless is listed before pdf2docx in requirements.txt
# This prevents pdf2docx from installing opencv-python (which needs X11)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway sets PORT env var)
EXPOSE 8000

# Run the application
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
