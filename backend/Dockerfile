FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for compiling certain ML libraries)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose port for Cloud Run
EXPOSE 8080

# Run Uvicorn server, binding to 0.0.0.0 and honoring the PORT environment variable
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
