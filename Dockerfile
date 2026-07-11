# Use official Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV FLASK_APP=app.py

# Set work directory
WORKDIR /app

# Tesseract OCR binary + German/English language data (used by pytesseract for receipt scanning)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-deu \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create uploads folder if it doesn't exist
RUN mkdir -p static/uploads

# Expose port
EXPOSE 5000

# Start command using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
