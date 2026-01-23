FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install opencv-python-headless FIRST, then other requirements
# The --no-deps on pdf2docx prevents it from pulling opencv-python
RUN pip install --no-cache-dir opencv-python-headless>=4.8.0 && \
    pip install --no-cache-dir pdf2docx --no-deps && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
